import {
  prisma,
  OpportunityType,
  OpportunityStage,
  TaskStatus,
  ActorType,
} from "@founderos/db";
import { recordDecision } from "@founderos/core";
import { runResearchAgent, extractJson } from "./claude-client";
import { agentResponseSchema, type AgentRunResult } from "./types";
import { loadFounderContext, upsertCompanyByName } from "./knowledge";

const AGENT_KEY = "jobs.discover";

const SYSTEM_PROMPT = `You are the Jobs Agent inside FounderOS, an AI Chief of Staff platform. Your job: search the live web for REAL, CURRENTLY OPEN roles that fit the founder's job search profile, then produce a tailored application draft for each strong match.

Rules:
- Use the web_search tool to find real, currently-postable job openings — real company names, real (or highly plausible, e.g. a careers-page or LinkedIn-jobs pattern) URLs. Never invent a company or a role that isn't grounded in what you found.
- Return between 2 and 6 candidates, ranked by fit. Skip anything that's a weak match rather than padding the list.
- confidence (0..1) reflects how well the role matches the profile's role titles, seniority, industries, locations, and constraints — be honest, not generous.
- riskLevel: LOW if the match and sourcing are solid, MEDIUM if there's real uncertainty (e.g. seniority unclear), HIGH if you're not confident this is a genuine current opening.
- reasoning must cite specifics from the profile and the posting — not generic praise.
- draft is a short, specific opening (recruiter message or cover-letter opening paragraph) written in the founder's voice using their real bio/CV — reference concrete achievements, never generic filler like "I am excited to apply".
- sources must be real URLs you found via web_search.

Respond with brief prose commentary if you like, but you MUST end your response with a single fenced \`\`\`json block containing exactly this shape and nothing else inside the fence:
{
  "candidates": [
    {
      "title": "string — role title as posted",
      "companyName": "string",
      "summary": "string — 1-2 sentences on the role",
      "sources": ["https://..."],
      "confidence": 0.0,
      "riskLevel": "LOW" | "MEDIUM" | "HIGH",
      "reasoning": "string",
      "recommendedNextAction": "string",
      "draft": "string",
      "jobRoleTitle": "string",
      "jobLevel": "string",
      "jobRemote": true,
      "jobRelocation": false,
      "jobBoardUrl": "https://..."
    }
  ]
}`;

function buildUserPrompt(params: {
  bio: string | null;
  cv: string | null;
  pitch: string | null;
  profile: NonNullable<Awaited<ReturnType<typeof prisma.jobSearchProfile.findUnique>>>;
}): string {
  const { bio, cv, pitch, profile } = params;
  return `FOUNDER PROFILE

Bio:
${bio ?? "(not provided)"}

CV:
${cv ?? "(not provided)"}

Elevator pitch:
${pitch ?? "(not provided)"}

JOB TARGETING CRITERIA

Target role titles: ${profile.roleTitles.join(", ") || "(any)"}
Seniority: ${profile.seniority.join(", ") || "(any)"}
Industries: ${profile.industries.join(", ") || "(any)"}
Locations: ${profile.locations.join(", ") || "(any)"}
Remote OK: ${profile.remoteOk}
Relocation OK: ${profile.relocationOk}
Excluded companies: ${profile.excludedCompanies.join(", ") || "(none)"}
Notes: ${profile.notes ?? "(none)"}

Search the web now for real, currently open roles matching this criteria and produce the JSON candidate list per your instructions.`;
}

export async function runJobsAgent(workspaceId: string): Promise<AgentRunResult> {
  const profile = await prisma.jobSearchProfile.findUnique({ where: { workspaceId } });
  if (!profile) {
    throw new Error("No job search profile set — add one in the Knowledge Hub first.");
  }

  const { bio, cv, pitch } = await loadFounderContext(workspaceId);
  const userPrompt = buildUserPrompt({ bio, cv, pitch, profile });

  const rawText = await runResearchAgent({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxSearchUses: 8,
  });

  const parsed = agentResponseSchema.parse(extractJson(rawText));

  const opportunityIds: string[] = [];
  let tasksQueued = 0;

  for (const candidate of parsed.candidates) {
    const company = await upsertCompanyByName(workspaceId, candidate.companyName);

    const stage =
      candidate.confidence >= 0.7
        ? OpportunityStage.QUEUED
        : candidate.confidence >= 0.4
          ? OpportunityStage.RECOMMENDED
          : OpportunityStage.QUALIFYING;

    const opportunity = await prisma.opportunity.create({
      data: {
        workspaceId,
        type: OpportunityType.JOB,
        stage,
        title: candidate.title,
        summary: candidate.summary,
        sourceUrl: candidate.sources[0],
        priority: Math.round(candidate.confidence * 10),
        companyId: company.id,
        jobDetail: {
          create: {
            roleTitle: candidate.jobRoleTitle ?? candidate.title,
            level: candidate.jobLevel,
            remote: candidate.jobRemote ?? false,
            relocation: candidate.jobRelocation ?? false,
            jobBoardUrl: candidate.jobBoardUrl ?? candidate.sources[0],
          },
        },
      },
    });
    opportunityIds.push(opportunity.id);

    await recordDecision({
      workspaceId,
      agentKey: AGENT_KEY,
      confidence: candidate.confidence,
      reasoning: candidate.reasoning,
      sources: candidate.sources,
      recommendedNextAction: candidate.recommendedNextAction,
      draftContent: candidate.draft,
      riskLevel: candidate.riskLevel,
      opportunityId: opportunity.id,
    });

    await prisma.log.create({
      data: {
        workspaceId,
        actorType: ActorType.AGENT,
        actorId: AGENT_KEY,
        action: "opportunity.discovered",
        entityType: "Opportunity",
        entityId: opportunity.id,
        after: { title: candidate.title, companyName: candidate.companyName, stage },
      },
    });

    if (stage === OpportunityStage.QUEUED) {
      await prisma.task.create({
        data: {
          workspaceId,
          title: `Submit application — ${candidate.title} at ${candidate.companyName}`,
          priority: Math.round(candidate.confidence * 10),
          estimatedMinutes: 10,
          status: TaskStatus.TODO,
          nextAction: candidate.recommendedNextAction,
          requiredAssets: { draftReady: true },
          opportunityId: opportunity.id,
        },
      });
      tasksQueued += 1;
    }
  }

  return {
    agentKey: AGENT_KEY,
    candidatesFound: parsed.candidates.length,
    opportunitiesCreated: opportunityIds.length,
    tasksQueued,
    opportunityIds,
  };
}

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
import { loadCompanyContext, upsertCompanyByName } from "./knowledge";

const AGENT_KEY = "investor.discover";
const COMPANY_SLUG = "tripy";

const SYSTEM_PROMPT = `You are the Investor Agent inside FounderOS, an AI Chief of Staff platform. Your job: search the live web for REAL investors — VCs, angels, family offices, strategic investors, corporate venture arms — whose public thesis genuinely fits the startup's raise, then draft a personalized outreach opening for each strong match.

Rules:
- Use the web_search tool to find real investors: real fund/investor names, and where possible a real thesis page, portfolio page, or public statement you can cite as a source URL. Never invent a fund or a thesis claim you didn't find.
- Return between 2 and 6 candidates, ranked by fit. Skip weak matches rather than padding the list.
- confidence (0..1) reflects genuine thesis/stage/sector/geography fit against the targeting profile — be honest, not generous.
- riskLevel: LOW if the fit and sourcing are solid, MEDIUM if there's real uncertainty (e.g. stage focus unclear), HIGH if you're not confident this fund is actually active or a genuine fit.
- reasoning must cite something specific — a portfolio company, a stated thesis, a fund size or check size range you found — not generic praise.
- draft is a short, specific outreach opening (for LinkedIn or email) written in the founder's voice, referencing something concrete from the startup's real materials AND something concrete about the investor (e.g. a portfolio overlap) — never generic filler like "I'd love to connect".
- sources must be real URLs you found via web_search.
- investorType must be one of VC, ANGEL, FAMILY_OFFICE, STRATEGIC, CVC.

Respond with brief prose commentary if you like, but you MUST end your response with a single fenced \`\`\`json block containing exactly this shape and nothing else inside the fence:
{
  "candidates": [
    {
      "title": "string — e.g. '<Fund Name> — Seed, AI/travel thesis'",
      "companyName": "string — the fund or investor's name",
      "summary": "string — 1-2 sentences on the fit",
      "sources": ["https://..."],
      "confidence": 0.0,
      "riskLevel": "LOW" | "MEDIUM" | "HIGH",
      "reasoning": "string",
      "recommendedNextAction": "string",
      "draft": "string",
      "investorType": "VC" | "ANGEL" | "FAMILY_OFFICE" | "STRATEGIC" | "CVC",
      "investorThesisSummary": "string",
      "investorPortfolioFitNotes": "string"
    }
  ]
}`;

function buildUserPrompt(params: {
  execSummary: string | null;
  deckInfo: string | null;
  description: string | null;
  profile: NonNullable<
    Awaited<ReturnType<typeof prisma.investorSearchProfile.findUnique>>
  >;
}): string {
  const { execSummary, deckInfo, description, profile } = params;
  return `STARTUP MATERIALS

Company description:
${description ?? "(not provided)"}

Executive summary:
${execSummary ?? "(not provided)"}

Deck facts for outreach:
${deckInfo ?? "(not provided)"}

INVESTOR TARGETING CRITERIA

Investor types to fetch: ${profile.investorTypes.join(", ") || "(any)"}
Stage focus: ${profile.stageFocus.join(", ") || "(any)"}
Sector focus: ${profile.sectorFocus.join(", ") || "(any)"}
Geographies: ${profile.geographies.join(", ") || "(any)"}
Check size range (cents): ${profile.checkSizeMinCents ?? "?"} - ${profile.checkSizeMaxCents ?? "?"}
Notes: ${profile.notes ?? "(none)"}

Search the web now for real investors matching this criteria and produce the JSON candidate list per your instructions.`;
}

export async function runInvestorAgent(workspaceId: string): Promise<AgentRunResult> {
  const profile = await prisma.investorSearchProfile.findUnique({ where: { workspaceId } });
  if (!profile) {
    throw new Error("No investor targeting profile set — add one in the Knowledge Hub first.");
  }

  const { execSummary, deckInfo, description } = await loadCompanyContext(
    workspaceId,
    COMPANY_SLUG
  );
  const userPrompt = buildUserPrompt({ execSummary, deckInfo, description, profile });

  const rawText = await runResearchAgent({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxSearchUses: 8,
  });

  const parsed = agentResponseSchema.parse(extractJson(rawText));

  const opportunityIds: string[] = [];
  let tasksQueued = 0;

  for (const candidate of parsed.candidates) {
    if (!candidate.investorType) continue; // schema guard, agent should always set this
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
        type: OpportunityType.INVESTOR,
        stage,
        title: candidate.title,
        summary: candidate.summary,
        sourceUrl: candidate.sources[0],
        priority: Math.round(candidate.confidence * 10),
        companyId: company.id,
        investorDetail: {
          create: {
            investorType: candidate.investorType,
            thesisSummary: candidate.investorThesisSummary,
            portfolioFitNotes: candidate.investorPortfolioFitNotes,
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
          title: `Send outreach — ${candidate.companyName}`,
          priority: Math.round(candidate.confidence * 10),
          estimatedMinutes: 5,
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

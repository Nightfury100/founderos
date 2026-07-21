import { z } from "zod";
import { InvestorType } from "@founderos/db";

/**
 * The shape every agent asks Claude to return, one entry per discovered
 * opportunity. This is the contract between the agent prompt and the
 * parser — if Claude's output doesn't validate against this, the run
 * fails loudly rather than writing garbage into the pipeline.
 */
export const agentCandidateSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().min(1),
  summary: z.string().min(1),
  sources: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(1),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  reasoning: z.string().min(1),
  recommendedNextAction: z.string().min(1),
  draft: z.string().min(1),

  // Job-specific (present when the agent is the Jobs Agent)
  jobRoleTitle: z.string().optional(),
  jobLevel: z.string().optional(),
  jobRemote: z.boolean().optional(),
  jobRelocation: z.boolean().optional(),
  jobBoardUrl: z.string().optional(),

  // Investor-specific (present when the agent is the Investor Agent)
  investorType: z.nativeEnum(InvestorType).optional(),
  investorThesisSummary: z.string().optional(),
  investorPortfolioFitNotes: z.string().optional(),
});

export const agentResponseSchema = z.object({
  candidates: z.array(agentCandidateSchema),
});

export type AgentCandidate = z.infer<typeof agentCandidateSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;

export type AgentRunResult = {
  agentKey: string;
  candidatesFound: number;
  opportunitiesCreated: number;
  tasksQueued: number;
  opportunityIds: string[];
};

import { z } from "zod";
import { prisma, RiskLevel } from "@founderos/db";

/**
 * The non-negotiable shape of every AI-authored output in FounderOS
 * (docs/TECHNICAL_SPEC.md §4). Every agent action that produces a
 * score, a recommendation, or a draft must go through recordDecision()
 * below — there is no code path for an agent to write a Task, Message,
 * or Content row directly without first justifying it with one of these.
 */
export const aiDecisionInputSchema = z
  .object({
    workspaceId: z.string().min(1),
    agentKey: z.string().min(1),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().min(1),
    sources: z.array(z.string()).default([]),
    recommendedNextAction: z.string().min(1),
    draftContent: z.string().optional(),
    riskLevel: z.nativeEnum(RiskLevel),
    opportunityId: z.string().optional(),
    emailId: z.string().optional(),
  })
  .refine((value) => value.opportunityId ?? value.emailId, {
    message: "AiDecision must be linked to an opportunity or an email",
  });

export type AiDecisionInput = z.infer<typeof aiDecisionInputSchema>;

/**
 * Validates and persists an AiDecision. This is the only sanctioned way for
 * agent code (packages/agents/*) to record an AI-authored action.
 */
export async function recordDecision(input: AiDecisionInput) {
  const parsed = aiDecisionInputSchema.parse(input);

  return prisma.aiDecision.create({
    data: {
      workspaceId: parsed.workspaceId,
      agentKey: parsed.agentKey,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      sources: parsed.sources,
      recommendedNextAction: parsed.recommendedNextAction,
      draftContent: parsed.draftContent,
      riskLevel: parsed.riskLevel,
      opportunityId: parsed.opportunityId,
      emailId: parsed.emailId,
    },
  });
}

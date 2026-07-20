import { OpportunityStage } from "@founderos/db";

/**
 * The universal opportunity lifecycle (docs/TECHNICAL_SPEC.md §3). Every
 * opportunity type — job, investor, grant, sales lead, content, email
 * action — moves through the same stages so the dashboard, kanban, and
 * agent framework only need to reason about one state machine.
 */
export const LIFECYCLE_ORDER: OpportunityStage[] = [
  OpportunityStage.DISCOVERED,
  OpportunityStage.RESEARCHING,
  OpportunityStage.QUALIFYING,
  OpportunityStage.RECOMMENDED,
  OpportunityStage.DRAFTING,
  OpportunityStage.QUEUED,
  OpportunityStage.IN_PROGRESS,
  OpportunityStage.FOLLOW_UP,
  OpportunityStage.COMPLETED,
];

const FORWARD_TRANSITIONS: Record<OpportunityStage, OpportunityStage[]> = {
  [OpportunityStage.DISCOVERED]: [OpportunityStage.RESEARCHING, OpportunityStage.REJECTED],
  [OpportunityStage.RESEARCHING]: [OpportunityStage.QUALIFYING, OpportunityStage.REJECTED],
  [OpportunityStage.QUALIFYING]: [OpportunityStage.RECOMMENDED, OpportunityStage.REJECTED],
  [OpportunityStage.RECOMMENDED]: [OpportunityStage.DRAFTING, OpportunityStage.REJECTED],
  [OpportunityStage.DRAFTING]: [OpportunityStage.QUEUED, OpportunityStage.REJECTED],
  [OpportunityStage.QUEUED]: [OpportunityStage.IN_PROGRESS, OpportunityStage.REJECTED],
  [OpportunityStage.IN_PROGRESS]: [
    OpportunityStage.FOLLOW_UP,
    OpportunityStage.COMPLETED,
    OpportunityStage.REJECTED,
  ],
  [OpportunityStage.FOLLOW_UP]: [
    OpportunityStage.IN_PROGRESS,
    OpportunityStage.COMPLETED,
    OpportunityStage.REJECTED,
  ],
  [OpportunityStage.COMPLETED]: [],
  [OpportunityStage.REJECTED]: [],
};

/** Any stage can terminate into REJECTED; otherwise stages only move forward. */
export function isValidStageTransition(
  from: OpportunityStage,
  to: OpportunityStage
): boolean {
  if (from === to) return false;
  return FORWARD_TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStages(from: OpportunityStage): OpportunityStage[] {
  return FORWARD_TRANSITIONS[from] ?? [];
}

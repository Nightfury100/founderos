import { describe, expect, it } from "vitest";
import { OpportunityStage } from "@founderos/db";
import { isValidStageTransition, nextStages } from "../lifecycle";

describe("isValidStageTransition", () => {
  it("allows the next stage in the pipeline", () => {
    expect(
      isValidStageTransition(OpportunityStage.DISCOVERED, OpportunityStage.RESEARCHING)
    ).toBe(true);
  });

  it("rejects skipping stages", () => {
    expect(
      isValidStageTransition(OpportunityStage.DISCOVERED, OpportunityStage.QUEUED)
    ).toBe(false);
  });

  it("allows terminating into REJECTED from any non-terminal stage", () => {
    expect(
      isValidStageTransition(OpportunityStage.QUALIFYING, OpportunityStage.REJECTED)
    ).toBe(true);
  });

  it("rejects a no-op transition", () => {
    expect(
      isValidStageTransition(OpportunityStage.RESEARCHING, OpportunityStage.RESEARCHING)
    ).toBe(false);
  });

  it("has no outgoing transitions from terminal stages", () => {
    expect(nextStages(OpportunityStage.COMPLETED)).toEqual([]);
    expect(nextStages(OpportunityStage.REJECTED)).toEqual([]);
  });

  it("allows FOLLOW_UP to loop back to IN_PROGRESS", () => {
    expect(
      isValidStageTransition(OpportunityStage.FOLLOW_UP, OpportunityStage.IN_PROGRESS)
    ).toBe(true);
  });
});

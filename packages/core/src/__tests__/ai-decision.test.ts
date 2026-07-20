import { describe, expect, it } from "vitest";
import { RiskLevel } from "@founderos/db";
import { aiDecisionInputSchema } from "../ai-decision";

const base = {
  workspaceId: "ws_1",
  agentKey: "jobs.discover",
  confidence: 0.82,
  reasoning: "Role matches PM + AI criteria from the founder's target profile.",
  sources: ["https://example.com/job/123"],
  recommendedNextAction: "Queue tailored application for VA review.",
  riskLevel: RiskLevel.LOW,
};

describe("aiDecisionInputSchema", () => {
  it("accepts a valid decision linked to an opportunity", () => {
    const result = aiDecisionInputSchema.parse({ ...base, opportunityId: "opp_1" });
    expect(result.opportunityId).toBe("opp_1");
  });

  it("accepts a valid decision linked to an email", () => {
    const result = aiDecisionInputSchema.parse({ ...base, emailId: "email_1" });
    expect(result.emailId).toBe("email_1");
  });

  it("rejects a decision linked to neither an opportunity nor an email", () => {
    expect(() => aiDecisionInputSchema.parse(base)).toThrow();
  });

  it("rejects confidence outside 0..1", () => {
    expect(() =>
      aiDecisionInputSchema.parse({ ...base, opportunityId: "opp_1", confidence: 1.5 })
    ).toThrow();
  });

  it("rejects empty reasoning", () => {
    expect(() =>
      aiDecisionInputSchema.parse({ ...base, opportunityId: "opp_1", reasoning: "" })
    ).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { extractJson } from "../claude-client";
import { agentResponseSchema } from "../types";

const validCandidateJson = `{
  "candidates": [
    {
      "title": "Head of Product",
      "companyName": "Acme AI",
      "summary": "Series B AI infra company.",
      "sources": ["https://example.com/jobs/1"],
      "confidence": 0.82,
      "riskLevel": "LOW",
      "reasoning": "Matches target role and industry.",
      "recommendedNextAction": "Submit application.",
      "draft": "Hi Sara, I led a 240% conversion lift at Emirates...",
      "jobRoleTitle": "Head of Product",
      "jobRemote": true
    }
  ]
}`;

describe("extractJson", () => {
  it("extracts JSON from a fenced code block with surrounding prose", () => {
    const text = `Here's what I found.\n\n\`\`\`json\n${validCandidateJson}\n\`\`\`\n\nLet me know if you want more.`;
    const parsed = extractJson(text);
    expect(agentResponseSchema.parse(parsed).candidates).toHaveLength(1);
  });

  it("parses raw JSON with no fence", () => {
    const parsed = extractJson(validCandidateJson);
    expect(agentResponseSchema.parse(parsed).candidates[0]?.companyName).toBe("Acme AI");
  });

  it("throws on malformed JSON", () => {
    expect(() => extractJson("```json\n{not json\n```")).toThrow();
  });
});

describe("agentResponseSchema", () => {
  it("rejects a candidate missing required fields", () => {
    const invalid = { candidates: [{ title: "Only a title" }] };
    expect(() => agentResponseSchema.parse(invalid)).toThrow();
  });

  it("rejects confidence outside 0..1", () => {
    const parsed = JSON.parse(validCandidateJson);
    parsed.candidates[0].confidence = 1.4;
    expect(() => agentResponseSchema.parse(parsed)).toThrow();
  });

  it("rejects an empty sources array", () => {
    const parsed = JSON.parse(validCandidateJson);
    parsed.candidates[0].sources = [];
    expect(() => agentResponseSchema.parse(parsed)).toThrow();
  });
});

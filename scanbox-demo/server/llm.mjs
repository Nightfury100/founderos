/**
 * Optional Anthropic integration. The app is fully functional without a key:
 * every factual pipeline is deterministic (lookup + templates), and the model
 * is used ONLY for language understanding at the edges:
 *   - Advisor: parsing a free-text operation description into a structured
 *     needs object (strict tool use -> schema-guaranteed JSON)
 *   - Parts: reading model/serial/year off an uploaded label image (vision)
 * The model never writes factual sentences and never produces numbers; its
 * output is structured data that is then validated against the dataset.
 *
 * On the current Claude API generation, sampling parameters (temperature) have
 * been removed. Determinism is enforced the stronger way: strict tool use with
 * additionalProperties:false guarantees schema-valid output, and everything
 * factual is a dataset lookup downstream.
 */
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.SCANBOX_MODEL || "claude-opus-4-8";
let client = null;

export function hasLLM() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const NEEDS_TOOL = {
  name: "record_needs",
  description:
    "Record the structured needs extracted from the user's description of their food-service operation. Only record what the user actually stated; leave fields null when not mentioned.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      covers_per_service: { type: ["integer", "null"], description: "Meals per service, e.g. beds or seats" },
      needs_hot: { type: ["boolean", "null"] },
      needs_cold: { type: ["boolean", "null"] },
      needs_combined_hot_cold: { type: ["boolean", "null"] },
      tray_system: {
        type: ["string", "null"],
        enum: ["GN 1/1", "GN 2/1", "400x600", "Euronorm", "450x600", "Veskanorm", null],
      },
      segment: {
        type: ["string", "null"],
        enum: ["healthcare", "elderly care", "schools", "hotels/resorts", "arenas", "conferences & events", null],
      },
      transport_distance: { type: ["string", "null"], enum: ["in-building", "external", null] },
      special_diets: { type: ["boolean", "null"] },
      clarifying_questions: {
        type: "array",
        items: { type: "string" },
        description: "At most 3 questions whose answers would materially change the recommendation. Empty if none needed.",
      },
    },
    required: [
      "covers_per_service", "needs_hot", "needs_cold", "needs_combined_hot_cold",
      "tray_system", "segment", "transport_distance", "special_diets", "clarifying_questions",
    ],
    additionalProperties: false,
  },
};

export async function extractNeeds(description) {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2048,
    output_config: { effort: "low" },
    system:
      "You extract structured facts from a description of a professional kitchen or food-service operation. " +
      "Record ONLY what the user stated or what follows necessarily from it. Never invent numbers.",
    tools: [NEEDS_TOOL],
    tool_choice: { type: "tool", name: "record_needs" },
    messages: [{ role: "user", content: description }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  return block ? block.input : null;
}

const LABEL_TOOL = {
  name: "record_label",
  description: "Record the fields read from a product identification label image. Use null for anything not clearly legible - never guess.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      model_name: { type: ["string", "null"] },
      serial_number: { type: ["string", "null"] },
      year_of_manufacture: { type: ["integer", "null"] },
      article_number: { type: ["string", "null"] },
      legibility_notes: { type: ["string", "null"] },
    },
    required: ["model_name", "serial_number", "year_of_manufacture", "article_number", "legibility_notes"],
    additionalProperties: false,
  },
};

export async function extractLabel(base64Data, mediaType) {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: "low" },
    system:
      "You read product identification labels. Transcribe only what is clearly legible in the image; use null otherwise. Never guess a value.",
    tools: [LABEL_TOOL],
    tool_choice: { type: "tool", name: "record_label" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
          { type: "text", text: "Read the identification label." },
        ],
      },
    ],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  return block ? block.input : null;
}

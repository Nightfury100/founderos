import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

let cachedClient: Anthropic | null | undefined;

function getClient(): Anthropic | null {
  if (cachedClient !== undefined) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  cachedClient = apiKey ? new Anthropic({ apiKey }) : null;
  return cachedClient;
}

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export class ClaudeNotConfiguredError extends Error {
  constructor() {
    super(
      "ANTHROPIC_API_KEY is not set, so this agent can't call Claude. Add it to the environment and try again."
    );
    this.name = "ClaudeNotConfiguredError";
  }
}

/**
 * Runs a single research turn with Claude's server-side web search tool
 * enabled, and returns the final text response. Web search can pause the
 * turn after its internal iteration cap (`stop_reason: "pause_turn"`) —
 * this resends the paused turn until Claude actually finishes, per
 * Anthropic's documented pause/resume pattern.
 */
export async function runResearchAgent(params: {
  systemPrompt: string;
  userPrompt: string;
  maxSearchUses?: number;
}): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) throw new ClaudeNotConfiguredError();

  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: params.userPrompt },
  ];

  for (let attempt = 0; attempt < 4; attempt++) {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      system: params.systemPrompt,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: params.maxSearchUses ?? 8,
        },
      ],
      messages,
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "pause_turn") {
      messages = [...messages, { role: "assistant", content: message.content }];
      continue;
    }

    if (message.stop_reason === "refusal") {
      throw new Error("Claude declined this request (safety refusal).");
    }

    return message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  }

  throw new Error("Agent run did not finish after several continuations — try again.");
}

/**
 * Claude is instructed to end its response with a fenced ```json block
 * containing the structured candidate list. Extract and parse it,
 * tolerating any surrounding commentary.
 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  return JSON.parse(candidate.trim());
}

"use server";

import { revalidatePath } from "next/cache";
import { runJobsAgent, runInvestorAgent, isClaudeConfigured } from "@founderos/agents";
import { Role } from "@founderos/db";
import { requireSession } from "@/lib/session";
import { assertRole } from "@/lib/rbac";

const RUNNERS = [Role.FOUNDER, Role.ADMIN];

export type AgentRunOutcome =
  | {
      ok: true;
      candidatesFound: number;
      opportunitiesCreated: number;
      tasksQueued: number;
    }
  | { ok: false; error: string };

async function runAgent(
  agent: (workspaceId: string) => ReturnType<typeof runJobsAgent>
): Promise<AgentRunOutcome> {
  const session = await requireSession();
  assertRole(session, RUNNERS);

  if (!isClaudeConfigured()) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY isn't configured for this deployment, so this agent can't call Claude yet.",
    };
  }

  try {
    const result = await agent(session.user.workspaceId);
    revalidatePath("/opportunities");
    revalidatePath("/dashboard");
    return {
      ok: true,
      candidatesFound: result.candidatesFound,
      opportunitiesCreated: result.opportunitiesCreated,
      tasksQueued: result.tasksQueued,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Agent run failed." };
  }
}

export async function runJobsAgentAction(): Promise<AgentRunOutcome> {
  return runAgent(runJobsAgent);
}

export async function runInvestorAgentAction(): Promise<AgentRunOutcome> {
  return runAgent(runInvestorAgent);
}

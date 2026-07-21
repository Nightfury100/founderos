"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Briefcase, Users, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runJobsAgentAction, runInvestorAgentAction, type AgentRunOutcome } from "./actions";

function AgentCard({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  action: () => Promise<AgentRunOutcome>;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AgentRunOutcome | null>(null);

  function run() {
    startTransition(async () => {
      setResult(await action());
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button onClick={run} disabled={pending} size="sm" className="w-fit">
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {pending ? "Researching the web…" : "Run now"}
        </Button>
        {result &&
          (result.ok ? (
            <p className="text-[12px] text-good">
              Found {result.candidatesFound} · created {result.opportunitiesCreated}{" "}
              opportunities · queued {result.tasksQueued} for the VA.
            </p>
          ) : (
            <p className="text-[12px] text-critical">{result.error}</p>
          ))}
      </CardContent>
    </Card>
  );
}

export function AgentRunners() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AgentCard
        title="Jobs Agent"
        description="Searches the live web for real open roles matching your job targeting profile, scores fit, and drafts a tailored opening."
        icon={<Briefcase className="h-4 w-4 text-accent" />}
        action={runJobsAgentAction}
      />
      <AgentCard
        title="Investor Agent"
        description="Searches the live web for real investors matching your targeting profile, scores fit, and drafts personalized outreach."
        icon={<Users className="h-4 w-4 text-accent" />}
        action={runInvestorAgentAction}
      />
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/format";
import type { OpportunityWithDetails } from "./queries";

const STAGE_BADGE: Record<string, "default" | "accent" | "warning" | "good" | "critical"> = {
  DISCOVERED: "default",
  RESEARCHING: "default",
  QUALIFYING: "default",
  RECOMMENDED: "accent",
  DRAFTING: "accent",
  QUEUED: "warning",
  IN_PROGRESS: "warning",
  FOLLOW_UP: "warning",
  COMPLETED: "good",
  REJECTED: "critical",
};

const RISK_BADGE: Record<string, "good" | "warning" | "critical"> = {
  LOW: "good",
  MEDIUM: "warning",
  HIGH: "critical",
};

export function OpportunityCard({ opportunity }: { opportunity: OpportunityWithDetails }) {
  const decision = opportunity.aiDecisions[0];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{opportunity.type.replace("_", " ")}</Badge>
            <Badge variant={STAGE_BADGE[opportunity.stage]}>{opportunity.stage.replace("_", " ")}</Badge>
          </div>
          <CardTitle className="mt-1">{opportunity.title}</CardTitle>
          <CardDescription>
            {opportunity.company?.name ?? "—"} · discovered{" "}
            {relativeTime(opportunity.discoveredAt)}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {opportunity.summary && (
          <p className="text-[13px] text-secondary">{opportunity.summary}</p>
        )}

        {opportunity.jobDetail && (
          <p className="text-[12px] text-muted">
            {opportunity.jobDetail.roleTitle}
            {opportunity.jobDetail.level ? ` · ${opportunity.jobDetail.level}` : ""}
            {opportunity.jobDetail.remote ? " · Remote" : ""}
          </p>
        )}
        {opportunity.investorDetail && (
          <p className="text-[12px] text-muted">
            {opportunity.investorDetail.investorType}
            {opportunity.investorDetail.thesisSummary
              ? ` — ${opportunity.investorDetail.thesisSummary}`
              : ""}
          </p>
        )}

        {decision && (
          <div className="rounded-lg bg-inset p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted">{decision.agentKey}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted">
                  {Math.round(decision.confidence * 100)}% confidence
                </span>
                <Badge variant={RISK_BADGE[decision.riskLevel]}>{decision.riskLevel} risk</Badge>
              </div>
            </div>
            <p className="mt-1.5 text-[12px] text-secondary">{decision.reasoning}</p>
            {decision.draftContent && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-medium text-accent">
                  View draft
                </summary>
                <p className="mt-1.5 whitespace-pre-line text-[12px] text-secondary">
                  {decision.draftContent}
                </p>
              </details>
            )}
          </div>
        )}

        {opportunity.tasks[0] && (
          <p className="text-[11px] text-muted">
            Queue: {opportunity.tasks[0].title} ({opportunity.tasks[0].status})
          </p>
        )}
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
import {
  Briefcase,
  Users,
  Bell,
  Calendar,
  Mail,
  Landmark,
  ListTodo,
  Activity,
  Sparkles,
  Layers,
} from "lucide-react";
import { requireSession } from "@/lib/session";
import { Topbar } from "@/components/shell/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "./stat-tile";
import { getDashboardData } from "./queries";
import { formatCents, formatDate, relativeTime } from "@/lib/format";

const RISK_BADGE: Record<string, "good" | "warning" | "critical"> = {
  LOW: "good",
  MEDIUM: "warning",
  HIGH: "critical",
};

const TASK_STATUS_BADGE: Record<string, "default" | "accent" | "warning" | "good"> = {
  TODO: "default",
  IN_PROGRESS: "accent",
  BLOCKED: "warning",
  DONE: "good",
};

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.user.workspaceId);

  return (
    <>
      <Topbar
        title="Dashboard"
        description="Everything your agents found, drafted, and queued today."
        session={session}
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            <StatTile label="Opportunities found" value={data.kpis.opportunitiesFound} icon={Sparkles} />
            <StatTile label="Jobs applied" value={data.kpis.jobsApplied} icon={Briefcase} />
            <StatTile label="Investor outreach" value={data.kpis.investorOutreach} icon={Users} />
            <StatTile
              label="Follow-ups due"
              value={data.kpis.followUpsDue}
              icon={Bell}
              tone={data.kpis.followUpsDue > 0 ? "warning" : "default"}
            />
            <StatTile label="Meetings scheduled" value={data.kpis.meetingsScheduled} icon={Calendar} />
            <StatTile
              label="Urgent emails"
              value={data.kpis.urgentEmails}
              icon={Mail}
              tone={data.kpis.urgentEmails > 0 ? "critical" : "default"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: VA queue + activity feed */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Today&apos;s queue</CardTitle>
                    <CardDescription>Prepared by AI, ready for the VA to execute.</CardDescription>
                  </div>
                  <Link href="/queue" className="text-[12px] font-medium text-accent hover:underline">
                    View all
                  </Link>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {data.todaysTasks.length === 0 && <EmptyRow icon={ListTodo} text="Queue is empty — nothing waiting on the VA right now." />}
                  {data.todaysTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-hover"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-medium text-primary">{task.title}</span>
                        <span className="truncate text-[12px] text-muted">
                          {task.nextAction ?? task.opportunity?.title ?? "No next action set"}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {task.estimatedMinutes && (
                          <span className="text-[11px] text-muted">{task.estimatedMinutes}m</span>
                        )}
                        <Badge variant={TASK_STATUS_BADGE[task.status]}>{task.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity feed</CardTitle>
                  <CardDescription>Recent actions across the workspace.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {data.activityLog.length === 0 && (
                    <EmptyRow icon={Activity} text="No activity logged yet." />
                  )}
                  {data.activityLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <p className="text-[13px] text-secondary">
                          <span className="font-medium text-primary">{entry.actorType}</span>{" "}
                          {entry.action} &middot; {entry.entityType}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted">
                          {relativeTime(entry.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right: AI decisions, pipeline, grant deadlines */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent AI decisions</CardTitle>
                  <CardDescription>Nothing an agent does is opaque.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {data.recentDecisions.length === 0 && (
                    <EmptyRow icon={Sparkles} text="No agent runs yet — this lands in M4." />
                  )}
                  {data.recentDecisions.map((decision) => (
                    <div key={decision.id} className="flex flex-col gap-1.5 border-b border-border-strong pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-primary">{decision.agentKey}</span>
                        <Badge variant={RISK_BADGE[decision.riskLevel]}>{decision.riskLevel} risk</Badge>
                      </div>
                      <p className="text-[12px] text-secondary">{decision.reasoning}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted">
                        <span>{Math.round(decision.confidence * 100)}% confidence</span>
                        <span>{relativeTime(decision.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales pipeline</CardTitle>
                  <CardDescription>By business.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {data.pipelineByBusiness.length === 0 && (
                    <EmptyRow icon={Layers} text="No leads yet." />
                  )}
                  {data.pipelineByBusiness.map((business) => (
                    <div key={business.name} className="flex items-center justify-between">
                      <span className="text-[13px] text-primary">{business.name}</span>
                      <div className="flex items-center gap-2 text-[12px] text-muted">
                        <span>{business.count} leads</span>
                        {formatCents(business.value) && <span>{formatCents(business.value)}</span>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grant deadlines</CardTitle>
                  <CardDescription>Next 60 days.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {data.grantDeadlines.length === 0 && (
                    <EmptyRow icon={Landmark} text="No upcoming deadlines." />
                  )}
                  {data.grantDeadlines.map((grant) => (
                    <div key={grant.id} className="flex items-center justify-between">
                      <span className="truncate text-[13px] text-primary">{grant.opportunity.title}</span>
                      <span className="shrink-0 text-[12px] text-muted">
                        {grant.deadline && formatDate(grant.deadline)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function EmptyRow({ icon: Icon, text }: { icon: typeof ListTodo; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-inset px-3 py-4 text-[12px] text-muted">
      <Icon className="h-3.5 w-3.5" />
      {text}
    </div>
  );
}

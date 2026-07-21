import { Briefcase, Lock } from "lucide-react";
import { requireSession } from "@/lib/session";
import { canEditKnowledgeBase } from "@/lib/rbac";
import { Topbar } from "@/components/shell/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { AgentRunners } from "./agent-runners";
import { OpportunityCard } from "./opportunity-card";
import { getOpportunities } from "./queries";

export default async function OpportunitiesPage() {
  const session = await requireSession();
  const canRunAgents = canEditKnowledgeBase(session); // FOUNDER/ADMIN — same bar as redefining what agents target
  const opportunities = await getOpportunities(session.user.workspaceId);

  return (
    <>
      <Topbar
        title="Opportunities"
        description="Jobs, investors, grants, and sales leads — discovered and drafted by your agents."
        session={session}
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {canRunAgents ? (
            <AgentRunners />
          ) : (
            <Card>
              <CardContent className="flex items-center gap-2 py-4 text-[12px] text-muted">
                <Lock className="h-3.5 w-3.5" />
                Only the founder can run agents — you&apos;ll see results here once they do.
              </CardContent>
            </Card>
          )}

          {opportunities.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <Briefcase className="h-5 w-5 text-muted" />
                <p className="text-[13px] text-secondary">
                  No opportunities yet. Run an agent above to discover the first ones.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {opportunities.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

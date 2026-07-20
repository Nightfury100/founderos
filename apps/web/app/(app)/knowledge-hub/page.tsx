import { prisma } from "@founderos/db";
import { requireSession } from "@/lib/session";
import { canEditKnowledgeBase } from "@/lib/rbac";
import { Topbar } from "@/components/shell/topbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DocumentsSection } from "./documents-section";
import { JobProfileForm } from "./job-profile-form";
import { InvestorProfileForm } from "./investor-profile-form";

export default async function KnowledgeHubPage() {
  const session = await requireSession();
  const workspaceId = session.user.workspaceId;
  const canEdit = canEditKnowledgeBase(session);

  const [documents, jobProfile, investorProfile] = await Promise.all([
    prisma.document.findMany({
      where: { workspaceId, isCurrentVersion: true },
      orderBy: [{ kind: "asc" }, { title: "asc" }],
    }),
    prisma.jobSearchProfile.findUnique({ where: { workspaceId } }),
    prisma.investorSearchProfile.findUnique({ where: { workspaceId } }),
  ]);

  return (
    <>
      <Topbar
        title="Knowledge Hub"
        description="Who you are, and what the agents should go find for you."
        session={session}
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Tabs defaultValue="documents">
            <TabsList>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="jobs">Job targeting</TabsTrigger>
              <TabsTrigger value="investors">Investor targeting</TabsTrigger>
            </TabsList>

            <TabsContent value="documents">
              <DocumentsSection documents={documents} canEdit={canEdit} />
            </TabsContent>

            <TabsContent value="jobs">
              <Card>
                <CardHeader>
                  <CardTitle>Job search profile</CardTitle>
                  <CardDescription>
                    What the Jobs Agent scores every discovered role against — role, seniority,
                    industry, location, and compensation fit.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <JobProfileForm profile={jobProfile} canEdit={canEdit} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="investors">
              <Card>
                <CardHeader>
                  <CardTitle>Investor targeting profile</CardTitle>
                  <CardDescription>
                    What the Investor Agent fetches and scores — investor type, stage, sector,
                    geography, and check size fit.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InvestorProfileForm profile={investorProfile} canEdit={canEdit} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}

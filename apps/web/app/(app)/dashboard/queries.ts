import { prisma, OpportunityType, OpportunityStage, TaskStatus, FollowUpStatus } from "@founderos/db";

const ACTIVE_OR_DONE_STAGES: OpportunityStage[] = [
  OpportunityStage.QUEUED,
  OpportunityStage.IN_PROGRESS,
  OpportunityStage.FOLLOW_UP,
  OpportunityStage.COMPLETED,
];

/**
 * Every query here is explicitly workspace-scoped (`where: { workspaceId }`).
 * This is the isolation pattern every domain query in the app follows; a
 * shared query-wrapper abstraction is worth building once a second tenant
 * actually exists, not before.
 */
export async function getDashboardData(workspaceId: string) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    opportunitiesFound,
    jobsApplied,
    investorOutreach,
    followUpsDue,
    meetingsScheduled,
    urgentEmails,
    totalEmails,
    todaysTasks,
    activityLog,
    recentDecisions,
    salesPipeline,
    grantDeadlines,
  ] = await Promise.all([
    prisma.opportunity.count({
      where: { workspaceId, discoveredAt: { gte: last30Days } },
    }),
    prisma.opportunity.count({
      where: {
        workspaceId,
        type: OpportunityType.JOB,
        stage: { in: ACTIVE_OR_DONE_STAGES },
      },
    }),
    prisma.opportunity.count({
      where: {
        workspaceId,
        type: OpportunityType.INVESTOR,
        stage: { in: ACTIVE_OR_DONE_STAGES },
      },
    }),
    prisma.followUp.count({
      where: { workspaceId, status: FollowUpStatus.PENDING, dueAt: { lte: in7Days } },
    }),
    prisma.meeting.count({
      where: { workspaceId, scheduledAt: { gte: now } },
    }),
    prisma.email.count({ where: { workspaceId, isUrgent: true } }),
    prisma.email.count({ where: { workspaceId } }),
    prisma.task.findMany({
      where: { workspaceId, status: { not: TaskStatus.DONE } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 6,
      include: { assignedTo: true, opportunity: true },
    }),
    prisma.log.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.aiDecision.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { opportunity: true },
    }),
    prisma.lead.findMany({
      where: { opportunity: { workspaceId } },
      include: { business: true, opportunity: true },
    }),
    prisma.grantDetail.findMany({
      where: { opportunity: { workspaceId }, deadline: { gte: now, lte: in60Days } },
      include: { opportunity: true },
      orderBy: { deadline: "asc" },
      take: 5,
    }),
  ]);

  const pipelineByBusiness = salesPipeline.reduce<Record<string, { name: string; count: number; value: number }>>(
    (acc, lead) => {
      const key = lead.businessId;
      if (!acc[key]) acc[key] = { name: lead.business.name, count: 0, value: 0 };
      acc[key].count += 1;
      acc[key].value += Number(lead.dealValueCents ?? 0);
      return acc;
    },
    {}
  );

  return {
    kpis: {
      opportunitiesFound,
      jobsApplied,
      investorOutreach,
      followUpsDue,
      meetingsScheduled,
      urgentEmails,
      totalEmails,
    },
    todaysTasks,
    activityLog,
    recentDecisions,
    pipelineByBusiness: Object.values(pipelineByBusiness),
    grantDeadlines,
  };
}

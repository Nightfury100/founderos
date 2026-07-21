import { prisma } from "@founderos/db";

export async function getOpportunities(workspaceId: string) {
  return prisma.opportunity.findMany({
    where: { workspaceId },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      company: true,
      jobDetail: true,
      investorDetail: true,
      aiDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
      tasks: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export type OpportunityWithDetails = Awaited<ReturnType<typeof getOpportunities>>[number];

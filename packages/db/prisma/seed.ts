import bcrypt from "bcryptjs";
import {
  PrismaClient,
  Role,
  OpportunityType,
  OpportunityStage,
  RiskLevel,
  TaskStatus,
  FollowUpStatus,
  InvestorType,
  GrantApplicationStatus,
  DocumentKind,
  MessageChannel,
  MessageStatus,
  EmailCategory,
  ActorType,
} from "@prisma/client";

const prisma = new PrismaClient();

const FOUNDER_EMAIL = "mohammedashraf.business1@gmail.com";
const FOUNDER_PASSWORD = "founderos-dev-2026";
const VA_EMAIL = "nourhan@founderos.dev";
const VA_PASSWORD = "founderos-dev-2026";

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "Mohammed's Workspace", slug: "default" },
  });

  const [founderPasswordHash, vaPasswordHash] = await Promise.all([
    bcrypt.hash(FOUNDER_PASSWORD, 10),
    bcrypt.hash(VA_PASSWORD, 10),
  ]);

  const founder = await prisma.user.upsert({
    where: { email: FOUNDER_EMAIL },
    update: {},
    create: {
      workspaceId: workspace.id,
      email: FOUNDER_EMAIL,
      name: "Mohammed Ashraf",
      role: Role.FOUNDER,
      passwordHash: founderPasswordHash,
    },
  });

  const va = await prisma.user.upsert({
    where: { email: VA_EMAIL },
    update: {},
    create: {
      workspaceId: workspace.id,
      email: VA_EMAIL,
      name: "Nourhan",
      role: Role.VA,
      passwordHash: vaPasswordHash,
    },
  });

  await prisma.settings.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: { workspaceId: workspace.id, autoPublish: false, digestHourUtc: 6 },
  });

  // --- Knowledge base -------------------------------------------------
  const documents: Array<{ kind: DocumentKind; slug: string; title: string; body: string }> = [
    {
      kind: DocumentKind.BIO,
      slug: "primary-bio",
      title: "Founder bio — short form",
      body: "Mohammed Ashraf is a founder and product leader building AI-native operating systems for early-stage teams. Previously led product for consumer and B2B platforms across travel and technology, with a focus on turning ambiguous zero-to-one problems into shipped, adopted products. Currently building FounderOS and running ViralX and Event Intelligence.",
    },
    {
      kind: DocumentKind.CV,
      slug: "cv-product-ai",
      title: "CV — Product & AI Leadership",
      body: "MOHAMMED ASHRAF\nHead of Product / AI Product Leader\n\nEXPERIENCE\n— Founder, FounderOS — building an AI-agent operating system for founders.\n— Founder, ViralX — [replace with real experience].\n— Founder, Event Intelligence — [replace with real experience].\n\nEDIT ME: replace this placeholder with your real, detailed CV content. This is the version the Jobs Agent will pull from when tailoring applications for Product/AI leadership roles.",
    },
    {
      kind: DocumentKind.ELEVATOR_PITCH,
      slug: "elevator-pitch",
      title: "30-second elevator pitch",
      body: "I build AI-native products that turn manual, founder-time-intensive work into an autonomous pipeline a human only has to approve. FounderOS is the clearest example: it replaces hours of manual opportunity-hunting with agents that discover, research, and draft — leaving me to decide and show up to meetings.",
    },
    {
      kind: DocumentKind.EXEC_SUMMARY,
      slug: "founderos-exec-summary",
      title: "Executive summary — FounderOS",
      body: "FounderOS is an AI operating system that turns a founder's opportunity pipeline — jobs, fundraising, sales, recruiting, content — into an agent-run queue a single Virtual Assistant can execute. EDIT ME: expand with traction, market, and ask once you're using this for real outreach.",
    },
  ];

  for (const doc of documents) {
    const existing = await prisma.document.findFirst({
      where: { workspaceId: workspace.id, kind: doc.kind, slug: doc.slug, isCurrentVersion: true },
    });
    if (existing) continue;
    await prisma.document.create({
      data: {
        workspaceId: workspace.id,
        kind: doc.kind,
        slug: doc.slug,
        title: doc.title,
        body: doc.body,
        version: 1,
        isCurrentVersion: true,
        createdById: founder.id,
      },
    });
  }

  await prisma.jobSearchProfile.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      roleTitles: ["Head of Product", "VP Product", "Chief of Staff", "Director of AI Product"],
      seniority: ["Director", "VP", "C-Suite"],
      industries: ["AI", "Travel Tech", "Startups", "Innovation"],
      locations: ["Remote", "Dubai", "London"],
      remoteOk: true,
      relocationOk: true,
      excludedCompanies: [],
      salaryMinCents: 18_000_000,
      notes: "Prioritize roles with real AI-product ownership, not just 'AI-adjacent'. Open to fractional/advisory at the right startup.",
    },
  });

  await prisma.investorSearchProfile.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      investorTypes: [InvestorType.VC, InvestorType.ANGEL, InvestorType.FAMILY_OFFICE],
      stageFocus: ["Pre-seed", "Seed"],
      sectorFocus: ["AI", "B2B SaaS", "Travel Tech"],
      geographies: ["MENA", "US", "Global"],
      checkSizeMinCents: 10_000_000,
      checkSizeMaxCents: 200_000_000,
      notes: "Prioritize investors with a prior AI or travel-tech portfolio company and a thesis that explicitly covers founder tooling.",
    },
  });

  // --- Businesses (Sales Agent) ----------------------------------------
  const viralx = await prisma.business.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: "viralx" } },
    update: {},
    create: { workspaceId: workspace.id, name: "ViralX", slug: "viralx" },
  });
  const eventIntel = await prisma.business.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: "event-intelligence" } },
    update: {},
    create: { workspaceId: workspace.id, name: "Event Intelligence", slug: "event-intelligence" },
  });

  // --- Sample opportunities --------------------------------------------
  const acmeCo = await prisma.company.create({
    data: { workspaceId: workspace.id, name: "Acme AI", domain: "acme-ai.example.com", industry: "AI" },
  });
  const novaCapital = await prisma.company.create({
    data: { workspaceId: workspace.id, name: "Nova Capital", domain: "novacapital.example.com", industry: "VC" },
  });

  const recruiterContact = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      companyId: acmeCo.id,
      name: "Sara Kline",
      email: "sara@acme-ai.example.com",
      title: "Talent Partner",
    },
  });
  const investorContact = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      companyId: novaCapital.id,
      name: "David Osei",
      email: "david@novacapital.example.com",
      title: "Partner",
    },
  });

  const jobOpportunity = await prisma.opportunity.create({
    data: {
      workspaceId: workspace.id,
      type: OpportunityType.JOB,
      stage: OpportunityStage.QUEUED,
      title: "Head of Product, AI Platform — Acme AI",
      summary: "Series B AI infra company hiring a Head of Product to own the agent platform roadmap.",
      sourceUrl: "https://example.com/jobs/acme-ai-head-of-product",
      priority: 8,
      companyId: acmeCo.id,
      contactId: recruiterContact.id,
    },
  });
  await prisma.jobDetail.create({
    data: {
      opportunityId: jobOpportunity.id,
      roleTitle: "Head of Product, AI Platform",
      level: "Director+",
      remote: true,
      relocation: false,
      jobBoardUrl: "https://example.com/jobs/acme-ai-head-of-product",
    },
  });

  const investorOpportunity = await prisma.opportunity.create({
    data: {
      workspaceId: workspace.id,
      type: OpportunityType.INVESTOR,
      stage: OpportunityStage.IN_PROGRESS,
      title: "Nova Capital — Seed, AI infra thesis",
      summary: "Nova Capital's thesis explicitly covers founder-tooling and AI-native ops platforms.",
      priority: 9,
      companyId: novaCapital.id,
      contactId: investorContact.id,
    },
  });
  await prisma.investorDetail.create({
    data: {
      opportunityId: investorOpportunity.id,
      investorType: InvestorType.VC,
      thesisSummary: "Backs pre-seed/seed AI-native tools that replace manual founder/ops workflows.",
      portfolioFitNotes: "Two portfolio companies in adjacent agent-tooling space — strong fit.",
      checkSizeMinCents: 50_000_000,
      checkSizeMaxCents: 150_000_000,
    },
  });

  const grantOpportunity = await prisma.opportunity.create({
    data: {
      workspaceId: workspace.id,
      type: OpportunityType.GRANT,
      stage: OpportunityStage.RECOMMENDED,
      title: "National AI Innovation Fund — Startup Track",
      summary: "Non-dilutive funding for early-stage AI startups building agentic tooling.",
      priority: 6,
    },
  });
  await prisma.grantDetail.create({
    data: {
      opportunityId: grantOpportunity.id,
      program: "National AI Innovation Fund",
      eligibilityNotes: "Pre-seed to seed stage, HQ or incorporation in eligible region.",
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      amountCents: 50_000_000,
      applicationStatus: GrantApplicationStatus.IN_PROGRESS,
    },
  });

  const salesOpportunity = await prisma.opportunity.create({
    data: {
      workspaceId: workspace.id,
      type: OpportunityType.SALES_LEAD,
      stage: OpportunityStage.DRAFTING,
      title: "TravelCo — Event Intelligence pilot",
      summary: "Mid-market travel company evaluating event intelligence tooling for their partnerships team.",
      priority: 5,
    },
  });
  await prisma.lead.create({
    data: {
      opportunityId: salesOpportunity.id,
      businessId: eventIntel.id,
      dealValueCents: 24_000_00,
    },
  });
  await prisma.lead.create({
    data: {
      opportunityId: (
        await prisma.opportunity.create({
          data: {
            workspaceId: workspace.id,
            type: OpportunityType.SALES_LEAD,
            stage: OpportunityStage.QUEUED,
            title: "Glow Media — ViralX retainer",
            summary: "Boutique media agency exploring a ViralX monthly retainer.",
            priority: 4,
          },
        })
      ).id,
      businessId: viralx.id,
      dealValueCents: 12_000_00,
    },
  });

  // --- Tasks (VA queue) --------------------------------------------------
  await prisma.task.createMany({
    data: [
      {
        workspaceId: workspace.id,
        title: "Submit tailored application — Acme AI Head of Product",
        priority: 9,
        estimatedMinutes: 10,
        status: TaskStatus.TODO,
        nextAction: "Copy the drafted cover letter into Acme's application portal and submit.",
        assignedToId: va.id,
        opportunityId: jobOpportunity.id,
      },
      {
        workspaceId: workspace.id,
        title: "Send outreach — Nova Capital (David Osei)",
        priority: 8,
        estimatedMinutes: 5,
        status: TaskStatus.IN_PROGRESS,
        nextAction: "Send the drafted LinkedIn message once the founder approves it.",
        assignedToId: va.id,
        opportunityId: investorOpportunity.id,
      },
      {
        workspaceId: workspace.id,
        title: "Finish grant application draft answers",
        priority: 6,
        estimatedMinutes: 25,
        status: TaskStatus.TODO,
        nextAction: "Review AI-drafted eligibility answers and flag anything needing founder input.",
        assignedToId: va.id,
        opportunityId: grantOpportunity.id,
      },
      {
        workspaceId: workspace.id,
        title: "Schedule pilot call — TravelCo",
        priority: 5,
        estimatedMinutes: 5,
        status: TaskStatus.TODO,
        nextAction: "Send 3 time slots for a 30-minute pilot walkthrough.",
        assignedToId: va.id,
        opportunityId: salesOpportunity.id,
      },
    ],
  });

  // --- AI decisions --------------------------------------------------
  await prisma.aiDecision.createMany({
    data: [
      {
        workspaceId: workspace.id,
        agentKey: "jobs.discover",
        confidence: 0.91,
        reasoning:
          "Role matches 4/4 target titles and required AI-platform ownership; company stage and remote policy match the job search profile.",
        sources: ["https://example.com/jobs/acme-ai-head-of-product"],
        recommendedNextAction: "Queue tailored application for VA review.",
        draftContent: "Dear Sara, I'm reaching out about the Head of Product, AI Platform role...",
        riskLevel: RiskLevel.LOW,
        opportunityId: jobOpportunity.id,
      },
      {
        workspaceId: workspace.id,
        agentKey: "investor.qualify",
        confidence: 0.86,
        reasoning:
          "Nova Capital's public thesis explicitly names 'AI-native founder tooling' and two portfolio companies overlap with FounderOS's category.",
        sources: ["https://novacapital.example.com/thesis"],
        recommendedNextAction: "Draft personalized outreach referencing the portfolio overlap.",
        riskLevel: RiskLevel.LOW,
        opportunityId: investorOpportunity.id,
      },
      {
        workspaceId: workspace.id,
        agentKey: "grants.qualify",
        confidence: 0.68,
        reasoning:
          "Eligibility looks satisfied on stage and geography, but incorporation region needs founder confirmation before submitting.",
        sources: ["https://example.com/grants/national-ai-innovation-fund"],
        recommendedNextAction: "Founder to confirm incorporation eligibility before VA submits.",
        riskLevel: RiskLevel.MEDIUM,
        opportunityId: grantOpportunity.id,
      },
    ],
  });

  // --- Messages, follow-ups, meetings, logs ---------------------------
  await prisma.message.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: investorOpportunity.id,
      contactId: investorContact.id,
      channel: MessageChannel.LINKEDIN,
      body: "Hi David — noticed Nova's thesis on AI-native founder tooling and thought FounderOS would be directly relevant...",
      status: MessageStatus.PENDING_APPROVAL,
    },
  });

  await prisma.followUp.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: investorOpportunity.id,
      contactId: investorContact.id,
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: FollowUpStatus.PENDING,
      note: "Follow up if no reply to the LinkedIn outreach.",
    },
  });

  await prisma.meeting.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: salesOpportunity.id,
      title: "TravelCo pilot walkthrough",
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      durationMinutes: 30,
    },
  });

  await prisma.email.create({
    data: {
      workspaceId: workspace.id,
      gmailMessageId: "seed-message-1",
      fromAddress: "sara@acme-ai.example.com",
      subject: "Re: Head of Product role",
      snippet: "Thanks for reaching out — would love to set up a call this week.",
      category: EmailCategory.OPPORTUNITY,
      isUrgent: true,
      suggestedAction: "Reply with availability for a call this week.",
      receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  await prisma.log.createMany({
    data: [
      {
        workspaceId: workspace.id,
        actorType: ActorType.AGENT,
        actorId: "jobs.discover",
        action: "opportunity.discovered",
        entityType: "Opportunity",
        entityId: jobOpportunity.id,
        after: { title: jobOpportunity.title },
      },
      {
        workspaceId: workspace.id,
        actorType: ActorType.AGENT,
        actorId: "investor.qualify",
        action: "opportunity.qualified",
        entityType: "Opportunity",
        entityId: investorOpportunity.id,
        after: { stage: "IN_PROGRESS" },
      },
      {
        workspaceId: workspace.id,
        actorType: ActorType.USER,
        actorId: va.id,
        action: "task.claimed",
        entityType: "Task",
        entityId: investorOpportunity.id,
      },
    ],
  });

  console.log("\nSeed complete.\n");
  console.log("Workspace:", workspace.name);
  console.log("Founder login:", FOUNDER_EMAIL, "/", FOUNDER_PASSWORD);
  console.log("VA login:     ", VA_EMAIL, "/", VA_PASSWORD);
  console.log("\nChange both passwords before using this outside local development.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

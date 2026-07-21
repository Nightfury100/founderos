import bcrypt from "bcryptjs";
import {
  PrismaClient,
  Role,
  DocumentKind,
  InvestorType,
} from "@prisma/client";
import {
  DOCUMENTS,
  FOUNDER_NAME,
  JOB_SEARCH_PROFILE,
  INVESTOR_SEARCH_PROFILE,
} from "./seed-data";

const prisma = new PrismaClient();

function toBigIntOrNull(value: number | null): bigint | null {
  return value === null ? null : BigInt(value);
}

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
    update: { name: FOUNDER_NAME, role: Role.FOUNDER },
    create: {
      workspaceId: workspace.id,
      email: FOUNDER_EMAIL,
      name: FOUNDER_NAME,
      role: Role.FOUNDER,
      passwordHash: founderPasswordHash,
    },
  });

  await prisma.user.upsert({
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

  // Knowledge base: create v1 if the slug is new; version-bump if content
  // changed; never touch documents the founder has already edited past v1.
  for (const doc of DOCUMENTS) {
    const kind = doc.kind as DocumentKind;
    const current = await prisma.document.findFirst({
      where: { workspaceId: workspace.id, kind, slug: doc.slug, isCurrentVersion: true },
    });

    if (!current) {
      await prisma.document.create({
        data: {
          workspaceId: workspace.id,
          kind,
          slug: doc.slug,
          title: doc.title,
          body: doc.body,
          version: 1,
          isCurrentVersion: true,
          createdById: founder.id,
        },
      });
      continue;
    }

    if (current.version === 1 && current.body !== doc.body) {
      await prisma.$transaction([
        prisma.document.update({
          where: { id: current.id },
          data: { isCurrentVersion: false },
        }),
        prisma.document.create({
          data: {
            workspaceId: workspace.id,
            kind,
            slug: doc.slug,
            title: doc.title,
            body: doc.body,
            version: current.version + 1,
            isCurrentVersion: true,
            createdById: founder.id,
          },
        }),
      ]);
    }
  }

  await prisma.jobSearchProfile.upsert({
    where: { workspaceId: workspace.id },
    update: {
      roleTitles: [...JOB_SEARCH_PROFILE.roleTitles],
      seniority: [...JOB_SEARCH_PROFILE.seniority],
      industries: [...JOB_SEARCH_PROFILE.industries],
      locations: [...JOB_SEARCH_PROFILE.locations],
      remoteOk: JOB_SEARCH_PROFILE.remoteOk,
      relocationOk: JOB_SEARCH_PROFILE.relocationOk,
      excludedCompanies: [...JOB_SEARCH_PROFILE.excludedCompanies],
      salaryMinCents: toBigIntOrNull(JOB_SEARCH_PROFILE.salaryMinCents),
      salaryMaxCents: toBigIntOrNull(JOB_SEARCH_PROFILE.salaryMaxCents),
      notes: JOB_SEARCH_PROFILE.notes,
    },
    create: {
      workspaceId: workspace.id,
      roleTitles: [...JOB_SEARCH_PROFILE.roleTitles],
      seniority: [...JOB_SEARCH_PROFILE.seniority],
      industries: [...JOB_SEARCH_PROFILE.industries],
      locations: [...JOB_SEARCH_PROFILE.locations],
      remoteOk: JOB_SEARCH_PROFILE.remoteOk,
      relocationOk: JOB_SEARCH_PROFILE.relocationOk,
      excludedCompanies: [...JOB_SEARCH_PROFILE.excludedCompanies],
      salaryMinCents: toBigIntOrNull(JOB_SEARCH_PROFILE.salaryMinCents),
      salaryMaxCents: toBigIntOrNull(JOB_SEARCH_PROFILE.salaryMaxCents),
      notes: JOB_SEARCH_PROFILE.notes,
    },
  });

  const investorTypes = INVESTOR_SEARCH_PROFILE.investorTypes.map(
    (t) => t as InvestorType
  );
  await prisma.investorSearchProfile.upsert({
    where: { workspaceId: workspace.id },
    update: {
      investorTypes,
      stageFocus: [...INVESTOR_SEARCH_PROFILE.stageFocus],
      sectorFocus: [...INVESTOR_SEARCH_PROFILE.sectorFocus],
      geographies: [...INVESTOR_SEARCH_PROFILE.geographies],
      checkSizeMinCents: toBigIntOrNull(INVESTOR_SEARCH_PROFILE.checkSizeMinCents),
      checkSizeMaxCents: toBigIntOrNull(INVESTOR_SEARCH_PROFILE.checkSizeMaxCents),
      notes: INVESTOR_SEARCH_PROFILE.notes,
    },
    create: {
      workspaceId: workspace.id,
      investorTypes,
      stageFocus: [...INVESTOR_SEARCH_PROFILE.stageFocus],
      sectorFocus: [...INVESTOR_SEARCH_PROFILE.sectorFocus],
      geographies: [...INVESTOR_SEARCH_PROFILE.geographies],
      checkSizeMinCents: toBigIntOrNull(INVESTOR_SEARCH_PROFILE.checkSizeMinCents),
      checkSizeMaxCents: toBigIntOrNull(INVESTOR_SEARCH_PROFILE.checkSizeMaxCents),
      notes: INVESTOR_SEARCH_PROFILE.notes,
    },
  });

  // Businesses the Sales Agent will sell for (M6).
  for (const business of [
    { name: "Tripy", slug: "tripy" },
    { name: "ViralX", slug: "viralx" },
    { name: "Elitelink.dev", slug: "elitelink" },
  ]) {
    await prisma.business.upsert({
      where: { workspaceId_slug: { workspaceId: workspace.id, slug: business.slug } },
      update: { name: business.name },
      create: { workspaceId: workspace.id, ...business },
    });
  }

  console.log("\nSeed complete.\n");
  console.log("Workspace:", workspace.name);
  console.log("Founder login:", FOUNDER_EMAIL, "/", FOUNDER_PASSWORD);
  console.log("VA login:     ", VA_EMAIL, "/", VA_PASSWORD);
  console.log(
    "\nKnowledge base seeded from the real CV + Tripy deck. Opportunities are created by the agents, not the seed."
  );
  console.log("Change both passwords before using this outside local development.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

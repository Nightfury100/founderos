"use server";

import { revalidatePath } from "next/cache";
import { prisma, DocumentKind, InvestorType, ActorType, Role, Prisma } from "@founderos/db";
import { requireSession } from "@/lib/session";
import { assertRole } from "@/lib/rbac";

const EDITORS = [Role.FOUNDER, Role.ADMIN];

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Log.after is a Json column; JSON.stringify can't serialize BigInt directly,
// so audit-log snapshots stringify money fields instead of storing them raw.
function toAuditJson(data: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? value.toString() : value))
  );
}

function parseList(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Money is stored as BigInt cents (Postgres INT4 can't hold a $30M check
// size in cents), so every parsed value must be converted before it hits Prisma.
function parseDollarsToCents(value: FormDataEntryValue | null): bigint | null {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  const dollars = Number(value);
  if (Number.isNaN(dollars)) return null;
  return BigInt(Math.round(dollars * 100));
}

export async function saveDocument(formData: FormData): Promise<void> {
  const session = await requireSession();
  assertRole(session, EDITORS);
  const workspaceId = session.user.workspaceId;

  const kind = formData.get("kind") as DocumentKind;
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const slugOverride = formData.get("slug");
  const slug = slugOverride && String(slugOverride).trim() ? String(slugOverride).trim() : slugify(title);

  if (!title || !body || !kind || !slug) {
    throw new Error("Title, kind, and content are required.");
  }

  const existingCurrent = await prisma.document.findFirst({
    where: { workspaceId, kind, slug, isCurrentVersion: true },
  });

  const nextVersion = (existingCurrent?.version ?? 0) + 1;

  await prisma.$transaction([
    ...(existingCurrent
      ? [
          prisma.document.update({
            where: { id: existingCurrent.id },
            data: { isCurrentVersion: false },
          }),
        ]
      : []),
    prisma.document.create({
      data: {
        workspaceId,
        kind,
        slug,
        title,
        body,
        version: nextVersion,
        isCurrentVersion: true,
        createdById: session.user.id,
      },
    }),
    prisma.log.create({
      data: {
        workspaceId,
        actorType: ActorType.USER,
        actorId: session.user.id,
        action: existingCurrent ? "document.new_version" : "document.created",
        entityType: "Document",
        entityId: slug,
        after: { kind, slug, title, version: nextVersion },
      },
    }),
  ]);

  revalidatePath("/knowledge-hub");
}

export async function saveJobSearchProfile(formData: FormData): Promise<void> {
  const session = await requireSession();
  assertRole(session, EDITORS);
  const workspaceId = session.user.workspaceId;

  const data = {
    roleTitles: parseList(formData.get("roleTitles")),
    seniority: parseList(formData.get("seniority")),
    industries: parseList(formData.get("industries")),
    locations: parseList(formData.get("locations")),
    remoteOk: formData.get("remoteOk") === "on",
    relocationOk: formData.get("relocationOk") === "on",
    excludedCompanies: parseList(formData.get("excludedCompanies")),
    salaryMinCents: parseDollarsToCents(formData.get("salaryMin")),
    salaryMaxCents: parseDollarsToCents(formData.get("salaryMax")),
    notes: (String(formData.get("notes") ?? "").trim() || null) as string | null,
  };

  await prisma.$transaction([
    prisma.jobSearchProfile.upsert({
      where: { workspaceId },
      create: { workspaceId, ...data },
      update: data,
    }),
    prisma.log.create({
      data: {
        workspaceId,
        actorType: ActorType.USER,
        actorId: session.user.id,
        action: "job_search_profile.updated",
        entityType: "JobSearchProfile",
        entityId: workspaceId,
        after: toAuditJson(data),
      },
    }),
  ]);

  revalidatePath("/knowledge-hub");
}

export async function saveInvestorSearchProfile(formData: FormData): Promise<void> {
  const session = await requireSession();
  assertRole(session, EDITORS);
  const workspaceId = session.user.workspaceId;

  const investorTypes = formData.getAll("investorTypes") as InvestorType[];

  const data = {
    investorTypes,
    stageFocus: parseList(formData.get("stageFocus")),
    sectorFocus: parseList(formData.get("sectorFocus")),
    geographies: parseList(formData.get("geographies")),
    checkSizeMinCents: parseDollarsToCents(formData.get("checkSizeMin")),
    checkSizeMaxCents: parseDollarsToCents(formData.get("checkSizeMax")),
    notes: (String(formData.get("notes") ?? "").trim() || null) as string | null,
  };

  await prisma.$transaction([
    prisma.investorSearchProfile.upsert({
      where: { workspaceId },
      create: { workspaceId, ...data },
      update: data,
    }),
    prisma.log.create({
      data: {
        workspaceId,
        actorType: ActorType.USER,
        actorId: session.user.id,
        action: "investor_search_profile.updated",
        entityType: "InvestorSearchProfile",
        entityId: workspaceId,
        after: toAuditJson(data),
      },
    }),
  ]);

  revalidatePath("/knowledge-hub");
}

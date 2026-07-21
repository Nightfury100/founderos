import { prisma, DocumentKind } from "@founderos/db";

/** Loads the current version of a knowledge-base document, if one exists. */
async function currentDoc(workspaceId: string, kind: DocumentKind, slug?: string) {
  return prisma.document.findFirst({
    where: {
      workspaceId,
      kind,
      isCurrentVersion: true,
      ...(slug ? { slug } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function loadFounderContext(workspaceId: string) {
  const [bio, cv, pitch] = await Promise.all([
    currentDoc(workspaceId, DocumentKind.BIO),
    currentDoc(workspaceId, DocumentKind.CV),
    currentDoc(workspaceId, DocumentKind.ELEVATOR_PITCH),
  ]);

  return {
    bio: bio?.body ?? null,
    cv: cv?.body ?? null,
    pitch: pitch?.body ?? null,
  };
}

export async function loadCompanyContext(workspaceId: string, slug: string) {
  const [execSummary, deckInfo, description] = await Promise.all([
    currentDoc(workspaceId, DocumentKind.EXEC_SUMMARY, `${slug}-exec-summary`),
    currentDoc(workspaceId, DocumentKind.INVESTOR_DECK_INFO, `${slug}-deck-info`),
    currentDoc(workspaceId, DocumentKind.COMPANY_DESCRIPTION, `${slug}-company`),
  ]);

  return {
    execSummary: execSummary?.body ?? null,
    deckInfo: deckInfo?.body ?? null,
    description: description?.body ?? null,
  };
}

/** Finds or creates a Company by name within a workspace. */
export async function upsertCompanyByName(workspaceId: string, name: string) {
  const existing = await prisma.company.findFirst({ where: { workspaceId, name } });
  if (existing) return existing;
  return prisma.company.create({ data: { workspaceId, name } });
}

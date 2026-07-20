import { Lock, FileText } from "lucide-react";
import type { Document } from "@founderos/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentDialog } from "./document-dialog";
import { DOCUMENT_KIND_LABELS } from "@/lib/document-kinds";
import { relativeTime } from "@/lib/format";

export function DocumentsSection({
  documents,
  canEdit,
}: {
  documents: Document[];
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-primary">Your documents</h2>
          <p className="text-[12px] text-secondary">
            Bio, CVs, pitches, and templates the agents draft from. Every save keeps the
            previous version — agents always use the latest.
          </p>
        </div>
        {canEdit ? (
          <DocumentDialog />
        ) : (
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <Lock className="h-3 w-3" />
            Read-only — ask the founder to edit
          </span>
        )}
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText className="h-5 w-5 text-muted" />
            <p className="text-[13px] text-secondary">
              No documents yet. Add your bio and CV first — agents can&apos;t draft
              tailored outreach without them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="flex flex-col gap-1">
                  <Badge variant="accent" className="w-fit">
                    {DOCUMENT_KIND_LABELS[doc.kind]}
                  </Badge>
                  <CardTitle className="mt-1">{doc.title}</CardTitle>
                  <CardDescription>
                    v{doc.version} &middot; updated {relativeTime(doc.updatedAt)}
                  </CardDescription>
                </div>
                {canEdit && (
                  <DocumentDialog
                    existing={{
                      kind: doc.kind,
                      slug: doc.slug,
                      title: doc.title,
                      body: doc.body,
                      version: doc.version,
                    }}
                  />
                )}
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 whitespace-pre-line text-[12.5px] text-secondary">
                  {doc.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

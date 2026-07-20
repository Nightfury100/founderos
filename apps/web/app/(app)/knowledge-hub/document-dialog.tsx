"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil } from "lucide-react";
import { DocumentKind } from "@founderos/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveDocument } from "./actions";
import { DOCUMENT_KIND_LABELS, DOCUMENT_KIND_ORDER } from "@/lib/document-kinds";

type ExistingDocument = {
  kind: DocumentKind;
  slug: string;
  title: string;
  body: string;
  version: number;
};

export function DocumentDialog({ existing }: { existing?: ExistingDocument }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveDocument(formData);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {existing ? (
          <Button variant="ghost" size="icon" aria-label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="secondary">
            <Plus className="h-3.5 w-3.5" />
            Add document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? `Edit — ${existing.title}` : "New knowledge base document"}</DialogTitle>
          <DialogDescription>
            {existing
              ? `Saving creates version ${existing.version + 1}. Agents always read the latest version.`
              : "Bio, CV, pitch, case study — anything agents draw on when writing on your behalf."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          {existing && <input type="hidden" name="slug" value={existing.slug} />}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kind">Type</Label>
            <Select name="kind" defaultValue={existing?.kind ?? DocumentKind.BIO} required>
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_KIND_ORDER.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {DOCUMENT_KIND_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={existing?.title}
              placeholder="e.g. Executive CV — Product & AI Leadership"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">Content</Label>
            <Textarea
              id="body"
              name="body"
              required
              rows={10}
              defaultValue={existing?.body}
              placeholder="Write or paste the full content. Markdown is fine."
              className="font-mono text-[12.5px]"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : existing ? "Save new version" : "Create document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

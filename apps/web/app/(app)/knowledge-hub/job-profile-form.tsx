"use client";

import { useTransition } from "react";
import type { JobSearchProfile } from "@founderos/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveJobSearchProfile } from "./actions";

export function JobProfileForm({
  profile,
  canEdit,
}: {
  profile: JobSearchProfile | null;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveJobSearchProfile(formData);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <fieldset disabled={!canEdit || pending} className="flex flex-col gap-5">
        <Field
          label="Target role titles"
          name="roleTitles"
          defaultValue={profile?.roleTitles.join(", ")}
          placeholder="Head of Product, VP Product, Chief of Staff"
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Seniority"
            name="seniority"
            defaultValue={profile?.seniority.join(", ")}
            placeholder="Director, VP, C-Suite"
          />
          <Field
            label="Industries"
            name="industries"
            defaultValue={profile?.industries.join(", ")}
            placeholder="AI, Travel Tech, Fintech"
          />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Locations"
            name="locations"
            defaultValue={profile?.locations.join(", ")}
            placeholder="Remote, Dubai, London"
          />
          <Field
            label="Excluded companies"
            name="excludedCompanies"
            defaultValue={profile?.excludedCompanies.join(", ")}
            placeholder="Companies to never surface"
          />
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-[13px] text-primary">
            <input
              type="checkbox"
              name="remoteOk"
              defaultChecked={profile?.remoteOk ?? true}
              className="h-3.5 w-3.5 accent-accent"
            />
            Open to remote roles
          </label>
          <label className="flex items-center gap-2 text-[13px] text-primary">
            <input
              type="checkbox"
              name="relocationOk"
              defaultChecked={profile?.relocationOk ?? false}
              className="h-3.5 w-3.5 accent-accent"
            />
            Open to relocation
          </label>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Minimum salary (USD/yr)"
            name="salaryMin"
            type="number"
            defaultValue={profile?.salaryMinCents ? String(profile.salaryMinCents / 100) : undefined}
            placeholder="180000"
          />
          <Field
            label="Maximum salary (USD/yr)"
            name="salaryMax"
            type="number"
            defaultValue={profile?.salaryMaxCents ? String(profile.salaryMaxCents / 100) : undefined}
            placeholder="260000"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jobNotes">Notes for the Jobs Agent</Label>
          <Textarea
            id="jobNotes"
            name="notes"
            rows={3}
            defaultValue={profile?.notes ?? ""}
            placeholder="e.g. Also open to fractional / advisory roles at Series A+ AI startups."
          />
        </div>

        {canEdit && (
          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Saving…" : "Save targeting profile"}
          </Button>
        )}
      </fieldset>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} />
    </div>
  );
}

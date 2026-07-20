"use client";

import { useTransition } from "react";
import { InvestorType, type InvestorSearchProfile } from "@founderos/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveInvestorSearchProfile } from "./actions";

const INVESTOR_TYPE_LABELS: Record<InvestorType, string> = {
  VC: "Venture Capital",
  ANGEL: "Angel Investors",
  FAMILY_OFFICE: "Family Offices",
  STRATEGIC: "Strategic Investors",
  CVC: "Corporate Venture Arms",
};

export function InvestorProfileForm({
  profile,
  canEdit,
}: {
  profile: InvestorSearchProfile | null;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const selected = new Set(profile?.investorTypes ?? []);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveInvestorSearchProfile(formData);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <fieldset disabled={!canEdit || pending} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label>Investor types the agent should fetch</Label>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {Object.values(InvestorType).map((type) => (
              <label key={type} className="flex items-center gap-2 text-[13px] text-primary">
                <input
                  type="checkbox"
                  name="investorTypes"
                  value={type}
                  defaultChecked={selected.has(type)}
                  className="h-3.5 w-3.5 accent-accent"
                />
                {INVESTOR_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Stage focus"
            name="stageFocus"
            defaultValue={profile?.stageFocus.join(", ")}
            placeholder="Pre-seed, Seed, Series A"
          />
          <Field
            label="Sector focus"
            name="sectorFocus"
            defaultValue={profile?.sectorFocus.join(", ")}
            placeholder="AI, Travel Tech, B2B SaaS"
          />
        </div>

        <Field
          label="Geographies"
          name="geographies"
          defaultValue={profile?.geographies.join(", ")}
          placeholder="MENA, US, Global"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Minimum check size (USD)"
            name="checkSizeMin"
            type="number"
            defaultValue={
              profile?.checkSizeMinCents ? String(profile.checkSizeMinCents / 100) : undefined
            }
            placeholder="100000"
          />
          <Field
            label="Maximum check size (USD)"
            name="checkSizeMax"
            type="number"
            defaultValue={
              profile?.checkSizeMaxCents ? String(profile.checkSizeMaxCents / 100) : undefined
            }
            placeholder="2000000"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="investorNotes">Notes for the Investor Agent</Label>
          <Textarea
            id="investorNotes"
            name="notes"
            rows={3}
            defaultValue={profile?.notes ?? ""}
            placeholder="e.g. Prioritize investors with a prior travel-tech or AI portfolio company."
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

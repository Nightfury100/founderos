import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { compactNumber } from "@/lib/format";

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "critical";
}) {
  return (
    <div className="rounded-xl border border-border-strong bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-secondary">{label}</span>
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            tone === "critical" ? "text-critical" : tone === "warning" ? "text-warning" : "text-muted"
          )}
        />
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-tight text-primary">
        {compactNumber(value)}
      </p>
    </div>
  );
}

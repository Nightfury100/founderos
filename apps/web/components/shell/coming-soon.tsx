import { type LucideIcon } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import type { Session } from "next-auth";

export function ComingSoon({
  session,
  title,
  description,
  icon: Icon,
  milestone,
  detail,
}: {
  session: Session;
  title: string;
  description: string;
  icon: LucideIcon;
  milestone: string;
  detail: string;
}) {
  return (
    <>
      <Topbar title={title} description={description} session={session} />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-[15px] font-semibold text-primary">Ships in {milestone}</h2>
          <p className="text-[13px] text-secondary">{detail}</p>
        </div>
      </main>
    </>
  );
}

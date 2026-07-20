import { Search } from "lucide-react";
import { UserMenu } from "@/components/shell/user-menu";
import type { Session } from "next-auth";

export function Topbar({
  title,
  description,
  session,
  actions,
}: {
  title: string;
  description?: string;
  session: Session;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border-strong px-6">
      <div>
        <h1 className="text-[15px] font-semibold tracking-tight text-primary">{title}</h1>
        {description && <p className="text-[12px] text-muted">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] text-muted md:flex">
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="ml-4 rounded border border-border-strong bg-inset px-1.5 py-0.5 text-[10px] text-muted">
            ⌘K
          </kbd>
        </div>

        {actions}

        <UserMenu
          name={session.user.name}
          email={session.user.email ?? ""}
          image={session.user.image}
          role={session.user.role}
        />
      </div>
    </header>
  );
}

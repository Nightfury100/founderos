"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Briefcase,
  Inbox,
  Megaphone,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/queue", label: "VA Queue", icon: ListTodo },
  { href: "/opportunities", label: "Opportunities", icon: Briefcase },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/content", label: "Content", icon: Megaphone },
  { href: "/knowledge-hub", label: "Knowledge Hub", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border-strong bg-inset/60 px-3 py-4">
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-page">
          <span className="text-[13px] font-semibold">F</span>
        </div>
        <span className="text-[14px] font-semibold tracking-tight text-primary">FounderOS</span>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-surface text-primary shadow-card"
                  : "text-secondary hover:bg-surface-hover hover:text-primary"
              )}
            >
              <item.icon
                className={cn(
                  "h-[16px] w-[16px] shrink-0",
                  active ? "text-accent" : "text-muted group-hover:text-secondary"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
          pathname.startsWith("/settings")
            ? "bg-surface text-primary shadow-card"
            : "text-secondary hover:bg-surface-hover hover:text-primary"
        )}
      >
        <Settings className="h-[16px] w-[16px] shrink-0 text-muted" />
        Settings
      </Link>
    </aside>
  );
}

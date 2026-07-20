import { Briefcase } from "lucide-react";
import { requireSession } from "@/lib/session";
import { ComingSoon } from "@/components/shell/coming-soon";

export default async function OpportunitiesPage() {
  const session = await requireSession();
  return (
    <ComingSoon
      session={session}
      title="Opportunities"
      description="Jobs, investors, grants, and sales leads on one kanban."
      icon={Briefcase}
      milestone="M3"
      detail="Kanban boards per opportunity type, following Discover → Research → Qualify → Recommend → Draft → Queue → Execute → Follow-up → Complete, land with the opportunity lifecycle milestone."
    />
  );
}

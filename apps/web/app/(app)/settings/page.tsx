import { Settings as SettingsIcon } from "lucide-react";
import { requireSession } from "@/lib/session";
import { ComingSoon } from "@/components/shell/coming-soon";

export default async function SettingsPage() {
  const session = await requireSession();
  return (
    <ComingSoon
      session={session}
      title="Settings"
      description="Workspace, integrations, and approval policies."
      icon={SettingsIcon}
      milestone="M6+"
      detail="Workspace-wide settings — auto-publish policy, digest timing, integration connections — land alongside the milestones that need them."
    />
  );
}

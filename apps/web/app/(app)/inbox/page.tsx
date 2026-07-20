import { Inbox } from "lucide-react";
import { requireSession } from "@/lib/session";
import { ComingSoon } from "@/components/shell/coming-soon";

export default async function InboxPage() {
  const session = await requireSession();
  return (
    <ComingSoon
      session={session}
      title="Inbox"
      description="Gmail digest, triage, and draft replies."
      icon={Inbox}
      milestone="M7"
      detail="Gmail integration — categorization, urgency flags, and AI-drafted replies awaiting your approval before anything sends — ships with the Email Agent milestone."
    />
  );
}

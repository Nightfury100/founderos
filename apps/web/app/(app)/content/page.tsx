import { Megaphone } from "lucide-react";
import { requireSession } from "@/lib/session";
import { ComingSoon } from "@/components/shell/coming-soon";

export default async function ContentPage() {
  const session = await requireSession();
  return (
    <ComingSoon
      session={session}
      title="Content"
      description="LinkedIn and Instagram content calendar."
      icon={Megaphone}
      milestone="M8"
      detail="AI-drafted content against your brand SOPs, with a scheduling calendar and a publish-approval gate, ships with the Marketing Agent milestone."
    />
  );
}

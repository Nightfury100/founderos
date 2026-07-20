import { ListTodo } from "lucide-react";
import { requireSession } from "@/lib/session";
import { ComingSoon } from "@/components/shell/coming-soon";

export default async function QueuePage() {
  const session = await requireSession();
  return (
    <ComingSoon
      session={session}
      title="VA Queue"
      description="Nourhan's prioritized, AI-prepared task list."
      icon={ListTodo}
      milestone="M3"
      detail="A full table + kanban view of the VA's queue — priority, required assets, next action, status — lands with the opportunity lifecycle milestone. Today's top tasks already show on the dashboard."
    />
  );
}

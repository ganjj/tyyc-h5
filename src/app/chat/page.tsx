import { ChatPanel } from "@/components/ChatPanel";
import { VisitTracker } from "@/components/VisitTracker";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <>
      <ChatPanel />
      <VisitTracker />
    </>
  );
}

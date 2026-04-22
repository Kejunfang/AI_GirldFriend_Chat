import { ChatWindow } from "@/components/ChatWindow";
import { getChatDashboardState } from "@/lib/chat/chatService";
import type { ConversationSummaryDTO, ChatMessageDTO } from "@/types/chat";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialConversationId: string | null = null;
  let initialConversations: ConversationSummaryDTO[] = [];
  let initialMessages: ChatMessageDTO[] = [];
  let initialError: string | null = null;

  try {
    const chatState = await getChatDashboardState();
    initialConversationId = chatState.selectedConversationId;
    initialConversations = chatState.conversations;
    initialMessages = chatState.messages;
  } catch (error) {
    initialError =
      error instanceof Error
        ? `当前还没有连上数据库：${error.message}`
        : "当前还没有连上数据库，请先完成本地环境初始化。";
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden px-4 py-4 text-ink sm:px-6 lg:px-10">
      <div className="mx-auto flex h-full max-w-7xl">
        <section className="min-h-0 min-w-0 flex-1">
          <ChatWindow
            initialConversationId={initialConversationId}
            initialConversations={initialConversations}
            initialMessages={initialMessages}
            initialError={initialError}
          />
        </section>
      </div>
    </main>
  );
}

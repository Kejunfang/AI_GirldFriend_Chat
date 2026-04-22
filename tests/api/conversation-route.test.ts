import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const getConversationDetail = vi.fn();
const deleteConversationWindow = vi.fn();

class MockChatServiceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

vi.mock("@/lib/chat/chatService", () => ({
  getConversationDetail,
  deleteConversationWindow,
  ChatServiceError: MockChatServiceError,
}));

const { GET, DELETE } = await import(
  "@/app/api/conversations/[conversationId]/route"
);

describe("/api/conversations/[conversationId]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns conversation detail", async () => {
    getConversationDetail.mockResolvedValue({
      conversation: {
        id: "conv_1",
        title: "电影窗口",
        lastMessagePreview: "聊电影",
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      messages: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/conversations/conv_1"),
      {
        params: Promise.resolve({ conversationId: "conv_1" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.conversation.id).toBe("conv_1");
    expect(getConversationDetail).toHaveBeenCalledWith("conv_1");
  });

  it("deletes the conversation window and returns next dashboard state", async () => {
    deleteConversationWindow.mockResolvedValue({
      deletedConversationId: "conv_1",
      selectedConversationId: "conv_2",
      conversations: [
        {
          id: "conv_2",
          title: "新窗口",
          lastMessagePreview: "从一句近况开始，先聊聊。",
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      messages: [],
    });

    const response = await DELETE(
      new NextRequest("http://localhost/api/conversations/conv_1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ conversationId: "conv_1" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deletedConversationId).toBe("conv_1");
    expect(body.selectedConversationId).toBe("conv_2");
    expect(deleteConversationWindow).toHaveBeenCalledWith("conv_1");
  });
});

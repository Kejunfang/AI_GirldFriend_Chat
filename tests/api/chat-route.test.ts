import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const runChatTurn = vi.fn();

class MockChatServiceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

class MockRateLimitError extends Error {
  status = 429;
}

vi.mock("@/lib/chat/chatService", () => ({
  runChatTurn,
  ChatServiceError: MockChatServiceError,
  RateLimitError: MockRateLimitError,
}));

vi.mock("@/lib/env", () => ({
  env: {
    CHAT_MAX_INPUT_CHARS: 600,
  },
}));

const { POST } = await import("@/app/api/chat/route");

describe("/api/chat", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid payloads", async () => {
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeTruthy();
    expect(runChatTurn).not.toHaveBeenCalled();
  });

  it("returns chat payload when request is valid", async () => {
    runChatTurn.mockResolvedValue({
      conversationId: "conv_1",
      reply: "我在，慢慢说。",
      messages: [
        {
          id: "m_user",
          role: "user",
          content: "今天有点累。",
          createdAt: new Date().toISOString(),
        },
        {
          id: "m_assistant",
          role: "assistant",
          content: "我在，慢慢说。",
          createdAt: new Date().toISOString(),
        },
      ],
      memoryStatus: "queued",
    });

    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "今天有点累。" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.conversationId).toBe("conv_1");
    expect(runChatTurn).toHaveBeenCalledWith({
      message: "今天有点累。",
      channel: "web",
    });
  });
});

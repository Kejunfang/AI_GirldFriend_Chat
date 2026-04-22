import { NextResponse } from "next/server";

import {
  ChatServiceError,
  createConversationWindow,
  getChatDashboardState,
} from "@/lib/chat/chatService";
import { jsonError } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const dashboard = await getChatDashboardState();

    return NextResponse.json({
      conversations: dashboard.conversations,
      selectedConversationId: dashboard.selectedConversationId,
    });
  } catch (error) {
    if (error instanceof ChatServiceError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("暂时拿不到聊天窗口列表。", 500);
  }
}

export async function POST() {
  try {
    const conversation = await createConversationWindow();

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    if (error instanceof ChatServiceError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("暂时新建不了聊天窗口。", 500);
  }
}

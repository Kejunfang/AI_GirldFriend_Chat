import { NextRequest, NextResponse } from "next/server";

import {
  ChatServiceError,
  deleteConversationWindow,
  getConversationDetail,
} from "@/lib/chat/chatService";
import { jsonError } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await context.params;

  try {
    const detail = await getConversationDetail(conversationId);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof ChatServiceError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("暂时拿不到这个聊天窗口。", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await context.params;

  try {
    const result = await deleteConversationWindow(conversationId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ChatServiceError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("暂时删不了这个聊天窗口。", 500);
  }
}

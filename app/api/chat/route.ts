import { NextRequest, NextResponse } from "next/server";

import { ChatServiceError, RateLimitError, runChatTurn } from "@/lib/chat/chatService";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/utils/response";
import { createChatRequestSchema } from "@/types/chat";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("请求内容不是有效的 JSON。", 400);
  }

  const parsed = createChatRequestSchema(env.CHAT_MAX_INPUT_CHARS).safeParse(payload);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "请求参数有误。", 400);
  }

  try {
    const result = await runChatTurn({
      ...parsed.data,
      channel: "web",
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ChatServiceError || error instanceof RateLimitError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("当前角色暂时没有接上，请稍后再试一次。", 500);
  }
}

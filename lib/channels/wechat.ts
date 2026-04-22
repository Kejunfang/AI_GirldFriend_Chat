import "server-only";

import type { ChannelAdapter } from "@/lib/channels/types";

export interface WechatWebhookPayload {
  FromUserName?: string;
  Content?: string;
  MsgId?: string | number;
}

export const wechatChannelAdapter: ChannelAdapter<
  WechatWebhookPayload,
  { MsgType: "text"; Content: string }
> = {
  channel: "wechat_official",
  normalizeIncomingMessage(payload) {
    const externalUserId = payload.FromUserName?.trim();
    const message = payload.Content?.trim();

    if (!externalUserId || !message) {
      throw new Error("微信消息缺少必要字段。");
    }

    return {
      channel: "wechat_official",
      externalUserId,
      message,
      metadata: {
        msgId: payload.MsgId ?? null,
      },
    };
  },
  buildReplyPayload({ reply }) {
    return {
      MsgType: "text",
      Content: reply,
    };
  },
};

import type { ChannelKind } from "@/types/chat";

export interface NormalizedInboundMessage {
  channel: ChannelKind;
  externalUserId: string;
  message: string;
  conversationId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ChannelReplyContext {
  conversationId: string;
  reply: string;
}

export interface ChannelAdapter<TIncoming = unknown, TReply = unknown> {
  channel: ChannelKind;
  normalizeIncomingMessage(payload: TIncoming): NormalizedInboundMessage;
  buildReplyPayload(context: ChannelReplyContext): TReply;
}

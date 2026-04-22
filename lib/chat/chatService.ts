import "server-only";

import { ChannelType, MessageRole } from "@prisma/client";

import { CompanionReplyError, generateCompanionReply } from "@/lib/ai/chat";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import {
  getLongTermMemories,
  getShortTermMessages,
  scheduleMemoryExtraction,
} from "@/lib/memory/memoryService";
import {
  RateLimitError,
  enforceRateLimit,
} from "@/lib/rate-limit/memoryRateLimiter";
import { summarizeConversationTitle } from "@/lib/utils/format";
import { logger } from "@/lib/utils/logger";
import type {
  ChannelKind,
  ChatMessageDTO,
  ChatResponsePayload,
  ChatTurnInput,
  DeleteConversationPayload,
  ConversationDetailPayload,
  ConversationSummaryDTO,
  InitialChatDashboardDTO,
} from "@/types/chat";
import { normalizeCompanionSettings } from "@/types/chat";

export class ChatServiceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ChatServiceError";
    this.status = status;
  }
}

function toNamespacedExternalId(channel: ChannelKind, externalUserId: string) {
  return `${channel}:${externalUserId}`;
}

function toConversationChannel(channel: ChannelKind) {
  switch (channel) {
    case "wechat_official":
      return ChannelType.WECHAT_OFFICIAL;
    case "wechat_work":
      return ChannelType.WECHAT_WORK;
    default:
      return ChannelType.WEB;
  }
}

function toChatMessageDTO(message: {
  id: string;
  content: string;
  createdAt: Date;
  role: MessageRole;
}): ChatMessageDTO {
  return {
    id: message.id,
    role: message.role === MessageRole.USER ? "user" : "assistant",
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

function getConversationTitle(title: string | null, fallback: string) {
  const normalized = title?.trim();
  if (normalized) {
    return normalized;
  }

  return fallback;
}

function toConversationSummaryDTO(conversation: {
  id: string;
  title: string | null;
  createdAt: Date;
  lastMessageAt: Date;
  messages?: Array<{
    content: string;
    createdAt: Date;
  }>;
}): ConversationSummaryDTO {
  const latestMessage = conversation.messages?.[0];
  const fallbackPreview = latestMessage?.content ?? "从一句近况开始，先聊聊。";

  return {
    id: conversation.id,
    title: getConversationTitle(
      conversation.title,
      latestMessage ? summarizeConversationTitle(latestMessage.content) : "新的聊天窗口",
    ),
    lastMessagePreview: summarizeConversationTitle(fallbackPreview, 28),
    lastMessageAt: (latestMessage?.createdAt ?? conversation.lastMessageAt).toISOString(),
    createdAt: conversation.createdAt.toISOString(),
  };
}

async function ensureUser(params: {
  channel: ChannelKind;
  externalUserId: string;
}) {
  const namespacedExternalId = toNamespacedExternalId(
    params.channel,
    params.externalUserId,
  );

  const existingUser = await prisma.user.findUnique({
    where: {
      externalId: namespacedExternalId,
    },
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      externalId: namespacedExternalId,
      displayName: "访客",
    },
  });
}

async function resolveConversation(params: {
  conversationId?: string | null;
  userId: string;
  channel: ChannelKind;
}) {
  if (params.conversationId) {
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        userId: params.userId,
      },
    });

    if (existingConversation) {
      return existingConversation;
    }
  }

  const latestConversation = await prisma.conversation.findFirst({
    where: {
      userId: params.userId,
    },
    orderBy: {
      lastMessageAt: "desc",
    },
  });

  if (latestConversation) {
    return latestConversation;
  }

  return prisma.conversation.create({
    data: {
      userId: params.userId,
      channel: toConversationChannel(params.channel),
      title: "新的聊天窗口",
    },
  });
}

export async function getInitialChatState() {
  const user = await ensureUser({
    channel: "web",
    externalUserId: env.DEV_USER_EXTERNAL_ID,
  });
  const conversation = await resolveConversation({
    userId: user.id,
    channel: "web",
  });

  const messages = await prisma.message.findMany({
    where: {
      conversationId: conversation.id,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 40,
  });

  return {
    conversationId: conversation.id,
    messages: messages.map(toChatMessageDTO),
  };
}

export async function getChatDashboardState(): Promise<InitialChatDashboardDTO> {
  const user = await ensureUser({
    channel: "web",
    externalUserId: env.DEV_USER_EXTERNAL_ID,
  });

  let selectedConversation = await prisma.conversation.findFirst({
    where: {
      userId: user.id,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      lastMessageAt: "desc",
    },
  });

  if (!selectedConversation) {
    selectedConversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        channel: ChannelType.WEB,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      userId: user.id,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      lastMessageAt: "desc",
    },
    take: 12,
  });

  const messages = await prisma.message.findMany({
    where: {
      conversationId: selectedConversation.id,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 60,
  });

  return {
    conversations: conversations.map(toConversationSummaryDTO),
    selectedConversationId: selectedConversation.id,
    messages: messages.map(toChatMessageDTO),
  };
}

export async function getConversationDetail(
  conversationId: string,
): Promise<ConversationDetailPayload> {
  const user = await ensureUser({
    channel: "web",
    externalUserId: env.DEV_USER_EXTERNAL_ID,
  });

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId: user.id,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!conversation) {
    throw new ChatServiceError("找不到这个聊天窗口。", 404);
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId: conversation.id,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 60,
  });

  return {
    conversation: toConversationSummaryDTO(conversation),
    messages: messages.map(toChatMessageDTO),
  };
}

export async function createConversationWindow() {
  const user = await ensureUser({
    channel: "web",
    externalUserId: env.DEV_USER_EXTERNAL_ID,
  });

  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      channel: ChannelType.WEB,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  return toConversationSummaryDTO(conversation);
}

export async function deleteConversationWindow(
  conversationId: string,
): Promise<DeleteConversationPayload> {
  const user = await ensureUser({
    channel: "web",
    externalUserId: env.DEV_USER_EXTERNAL_ID,
  });

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId: user.id,
    },
  });

  if (!conversation) {
    throw new ChatServiceError("找不到这个聊天窗口，删不了。", 404);
  }

  await prisma.$transaction([
    prisma.memory.deleteMany({
      where: {
        userId: user.id,
        sourceConversationId: conversationId,
      },
    }),
    prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    }),
  ]);

  let selectedConversation = await prisma.conversation.findFirst({
    where: {
      userId: user.id,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      lastMessageAt: "desc",
    },
  });

  if (!selectedConversation) {
    selectedConversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        channel: ChannelType.WEB,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      userId: user.id,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      lastMessageAt: "desc",
    },
    take: 12,
  });

  const messages = await prisma.message.findMany({
    where: {
      conversationId: selectedConversation.id,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 60,
  });

  return {
    deletedConversationId: conversationId,
    conversations: conversations.map(toConversationSummaryDTO),
    selectedConversationId: selectedConversation.id,
    messages: messages.map(toChatMessageDTO),
  };
}

export async function runChatTurn(input: ChatTurnInput): Promise<ChatResponsePayload> {
  const message = input.message.trim();
  if (!message) {
    throw new ChatServiceError("先写一句你想发送的话。", 400);
  }

  if (message.length > env.CHAT_MAX_INPUT_CHARS) {
    throw new ChatServiceError(
      `一次先说短一点，控制在 ${env.CHAT_MAX_INPUT_CHARS} 个字以内。`,
      400,
    );
  }

  const channel = input.channel ?? "web";
  const externalUserId = input.externalUserId?.trim() || env.DEV_USER_EXTERNAL_ID;

  await enforceRateLimit(toNamespacedExternalId(channel, externalUserId));

  const user = await ensureUser({
    channel,
    externalUserId,
  });
  const conversation = await resolveConversation({
    conversationId: input.conversationId,
    userId: user.id,
    channel,
  });

  const userMessage = await prisma.message.create({
    data: {
      userId: user.id,
      conversationId: conversation.id,
      role: MessageRole.USER,
      content: message,
    },
  });

  await prisma.conversation.update({
    where: {
      id: conversation.id,
    },
    data: {
      title:
        !conversation.title || conversation.title === "新的聊天窗口"
          ? summarizeConversationTitle(message)
          : conversation.title,
      lastMessageAt: new Date(),
    },
  });

  const [recentMessages, memories] = await Promise.all([
    getShortTermMessages(conversation.id),
    getLongTermMemories(user.id),
  ]);

  let reply = "";

  try {
    reply = await generateCompanionReply({
      recentMessages,
      memories,
      companionSettings: normalizeCompanionSettings(input.companionSettings),
    });
  } catch (error) {
    logger.error("chat generation failed", {
      error: error instanceof Error ? error.message : "unknown",
    });

    if (error instanceof CompanionReplyError) {
      throw new ChatServiceError(error.message, error.status);
    }

    throw new ChatServiceError("当前角色暂时没有接上，请稍后再试一次。", 502);
  }

  const assistantMessage = await prisma.message.create({
    data: {
      userId: user.id,
      conversationId: conversation.id,
      role: MessageRole.ASSISTANT,
      content: reply,
    },
  });

  await prisma.conversation.update({
    where: {
      id: conversation.id,
    },
    data: {
      lastMessageAt: assistantMessage.createdAt,
    },
  });

  const memoryStatus = scheduleMemoryExtraction({
    userId: user.id,
    conversationId: conversation.id,
    userMessage: message,
  });

  return {
    conversationId: conversation.id,
    reply,
    messages: [toChatMessageDTO(userMessage), toChatMessageDTO(assistantMessage)],
    memoryStatus,
  };
}

export { RateLimitError };

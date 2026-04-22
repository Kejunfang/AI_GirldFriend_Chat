import "server-only";

import { MemoryType, MessageRole } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { logger } from "@/lib/utils/logger";
import type { PromptMessage } from "@/lib/ai/chat";

export type MemoryCategory = keyof typeof MemoryType;

export interface MemoryCandidate {
  type: MemoryCategory;
  content: string;
  importance: number;
}

const memoryPatterns: Array<{
  type: MemoryCategory;
  regex: RegExp;
  importance: number;
}> = [
  {
    type: "PROFILE",
    regex: /(我叫[^。！？\n]{1,18}|我是[^。！？\n]{1,18}|我在[^。！？\n]{1,24}(上班|工作|读书))/g,
    importance: 7,
  },
  {
    type: "PREFERENCE",
    regex: /(我喜欢[^。！？\n]{2,28}|我爱[^。！？\n]{2,28}|我平时喜欢[^。！？\n]{2,28})/g,
    importance: 6,
  },
  {
    type: "RECENT_STATE",
    regex: /(最近[^。！？\n]{2,32}|这几天[^。！？\n]{2,32}|今天[^。！？\n]{2,32}|刚刚[^。！？\n]{2,32})/g,
    importance: 5,
  },
  {
    type: "SHARED_MEMORY",
    regex: /(上次我们[^。！？\n]{2,32}|你还记得[^。！？\n]{2,32}|之前我们[^。！？\n]{2,32})/g,
    importance: 6,
  },
  {
    type: "DISLIKE",
    regex: /(我不喜欢[^。！？\n]{2,28}|不要总是[^。！？\n]{2,28}|别老是[^。！？\n]{2,28})/g,
    importance: 8,
  },
];

function normalizeMemoryText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function extractMemoryCandidatesFromText(text: string) {
  const normalized = normalizeMemoryText(text);

  if (!normalized) {
    return [] satisfies MemoryCandidate[];
  }

  const candidates = memoryPatterns.flatMap((pattern) => {
    return Array.from(normalized.matchAll(pattern.regex)).map((match) => ({
      type: pattern.type,
      content: normalizeMemoryText(match[0]),
      importance: pattern.importance,
    }));
  });

  return candidates.filter((candidate, index, source) => {
    return (
      source.findIndex(
        (item) =>
          item.type === candidate.type &&
          item.content.toLowerCase() === candidate.content.toLowerCase(),
      ) === index
    );
  });
}

export async function getShortTermMessages(
  conversationId: string,
): Promise<PromptMessage[]> {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: env.CHAT_RECENT_MESSAGE_LIMIT,
  });

  return messages
    .reverse()
    .map((message) => ({
      role:
        message.role === MessageRole.USER
          ? ("user" as const)
          : ("assistant" as const),
      content: message.content,
      createdAt: message.createdAt,
    }));
}

export async function getLongTermMemories(userId: string) {
  const memories = await prisma.memory.findMany({
    where: {
      userId,
    },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    take: env.CHAT_MEMORY_LIMIT,
  });

  return memories.map((memory) => ({
    id: memory.id,
    type: memory.type,
    content: memory.content,
    importance: memory.importance,
    updatedAt: memory.updatedAt,
  }));
}

async function upsertMemories(params: {
  userId: string;
  conversationId: string;
  candidates: MemoryCandidate[];
}) {
  const existing = await prisma.memory.findMany({
    where: {
      userId: params.userId,
    },
  });

  for (const candidate of params.candidates) {
    const matched = existing.find((memory) => {
      return (
        memory.type === candidate.type &&
        normalizeMemoryText(memory.content).toLowerCase() ===
          normalizeMemoryText(candidate.content).toLowerCase()
      );
    });

    if (matched) {
      await prisma.memory.update({
        where: {
          id: matched.id,
        },
        data: {
          importance: Math.min(Math.max(matched.importance, candidate.importance) + 1, 10),
          updatedAt: new Date(),
        },
      });
      continue;
    }

    await prisma.memory.create({
      data: {
        userId: params.userId,
        type: candidate.type,
        content: candidate.content,
        importance: candidate.importance,
        sourceConversationId: params.conversationId,
      },
    });
  }
}

export function scheduleMemoryExtraction(params: {
  userId: string;
  conversationId: string;
  userMessage: string;
}) {
  const candidates = extractMemoryCandidatesFromText(params.userMessage);
  if (!candidates.length) {
    return "idle" as const;
  }

  queueMicrotask(() => {
    void upsertMemories({
      userId: params.userId,
      conversationId: params.conversationId,
      candidates,
    }).catch((error) => {
      logger.warn("memory extraction failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    });
  });

  return "queued" as const;
}

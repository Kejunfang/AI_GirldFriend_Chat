import "server-only";

import { env } from "@/lib/env";
import { getGeminiClient } from "@/lib/ai/client";
import { BANNED_SERVICE_PHRASES, getSystemPrompt } from "@/lib/ai/systemPrompt";
import {
  normalizeCompanionSettings,
  type CompanionSettings,
} from "@/types/chat";

export type PromptMemoryType =
  | "PROFILE"
  | "PREFERENCE"
  | "RECENT_STATE"
  | "SHARED_MEMORY"
  | "DISLIKE";

export interface PromptMemory {
  id: string;
  type: PromptMemoryType;
  content: string;
  importance: number;
  updatedAt: Date;
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

const memoryLabels: Record<PromptMemoryType, string> = {
  PROFILE: "用户资料",
  PREFERENCE: "用户偏好",
  RECENT_STATE: "最近状态",
  SHARED_MEMORY: "共同回忆",
  DISLIKE: "不喜欢的交流方式",
};

export class CompanionReplyError extends Error {
  kind: "quota" | "unavailable" | "unknown";
  status: number;

  constructor(
    message: string,
    options?: {
      kind?: "quota" | "unavailable" | "unknown";
      status?: number;
    },
  ) {
    super(message);
    this.name = "CompanionReplyError";
    this.kind = options?.kind ?? "unknown";
    this.status = options?.status ?? 502;
  }
}

function buildMemoryContext(memories: PromptMemory[]) {
  if (!memories.length) {
    return "当前没有可用的长期记忆。请仅根据最近对话自然回复。";
  }

  const lines = memories.map((memory) => {
    return `- ${memoryLabels[memory.type]}（重要度 ${memory.importance}）：${memory.content}`;
  });

  return [
    "下面是给你的内部上下文，只能作为背景理解自然使用，不能逐条背诵或显得像查资料：",
    ...lines,
  ].join("\n");
}

function normalizeWhitespace(text: string) {
  return text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isModelBusyError(error: unknown) {
  const message = getErrorMessage(error).toUpperCase();
  return (
    message.includes("503") ||
    message.includes("UNAVAILABLE") ||
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("QUOTA EXCEEDED") ||
    message.includes("RATE LIMIT")
  );
}

export function toCompanionReplyError(error: unknown) {
  const message = getErrorMessage(error).toUpperCase();

  if (
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("QUOTA EXCEEDED") ||
    message.includes("RATE LIMIT")
  ) {
    return new CompanionReplyError(
      "Gemini 额度或频率刚打满了，稍等一会儿再试。",
      {
        kind: "quota",
        status: 429,
      },
    );
  }

  if (message.includes("503") || message.includes("UNAVAILABLE")) {
    return new CompanionReplyError("当前模型现在有点忙，稍等一会儿再试。", {
      kind: "unavailable",
      status: 503,
    });
  }

  return new CompanionReplyError("当前角色暂时没有接上，请稍后再试一次。", {
    kind: "unknown",
    status: 502,
  });
}

function buildConversationTranscriptWithSettings(
  messages: PromptMessage[],
  settings: CompanionSettings,
) {
  if (!messages.length) {
    return "最近对话：\n- 这是第一轮对话，请根据用户刚发来的内容自然开始。";
  }

  const lines = messages.map((message) => {
    const speaker =
      message.role === "user" ? settings.userNickname : settings.companionName;
    return `${speaker}：${message.content}`;
  });

  return ["最近对话：", ...lines].join("\n");
}

export function sanitizeAssistantReply(
  rawText: string,
  maxChars = env.CHAT_MAX_REPLY_CHARS,
  userNickname = normalizeCompanionSettings().userNickname,
) {
  const compact = normalizeWhitespace(rawText);

  if (!compact) {
    return `${userNickname}，我在。你再和我说一句，我好好接着你。`;
  }

  if (BANNED_SERVICE_PHRASES.some((phrase) => compact.includes(phrase))) {
    return `${userNickname}，我在这儿听着。你想继续说的话，我就陪你慢慢接住。`;
  }

  if (compact.length <= maxChars) {
    return compact;
  }

  const clipped = compact.slice(0, maxChars);
  const breakpoints = ["。", "！", "？", "\n"];
  const lastBoundary = Math.max(
    ...breakpoints.map((token) => clipped.lastIndexOf(token)),
  );

  if (lastBoundary > Math.floor(maxChars * 0.55)) {
    return clipped.slice(0, lastBoundary + 1).trim();
  }

  return `${clipped.trim()}…`;
}

export async function generateCompanionReply(params: {
  memories: PromptMemory[];
  recentMessages: PromptMessage[];
  companionSettings?: CompanionSettings;
}) {
  const client = getGeminiClient();
  const settings = normalizeCompanionSettings(params.companionSettings);

  const contents = [
    buildMemoryContext(params.memories),
    buildConversationTranscriptWithSettings(params.recentMessages, settings),
    `请基于上面的长期记忆和最近对话，以“${settings.companionName}”的身份继续回复${settings.userNickname}。`,
  ].join("\n\n");

  const candidateModels = Array.from(
    new Set([env.GEMINI_MODEL, "gemini-2.5-flash-lite"]),
  );

  let lastError: unknown;

  for (const model of candidateModels) {
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: getSystemPrompt(settings),
          maxOutputTokens: 220,
          temperature: 0.8,
          topP: 0.9,
        },
      });

      return sanitizeAssistantReply(
        response.text ?? "",
        env.CHAT_MAX_REPLY_CHARS,
        settings.userNickname,
      );
    } catch (error) {
      lastError = error;
      if (!isModelBusyError(error) || model === candidateModels.at(-1)) {
        break;
      }
    }
  }

  throw toCompanionReplyError(lastError);
}

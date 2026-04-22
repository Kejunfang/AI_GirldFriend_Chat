import { z } from "zod";

export const DEFAULT_CHAT_MAX_INPUT_CHARS = 600;

export const channelValues = ["web", "wechat_official", "wechat_work"] as const;
export type ChannelKind = (typeof channelValues)[number];

export const chatRoleValues = ["user", "assistant"] as const;
export type ChatRole = (typeof chatRoleValues)[number];

export const memoryStatusValues = ["idle", "queued", "updated"] as const;
export type MemoryStatus = (typeof memoryStatusValues)[number];

export interface CompanionSettings {
  companionName: string;
  userNickname: string;
  relationshipTone: string;
  personality: string;
  speakingStyle: string;
  boundaries: string;
}

export const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  companionName: "未命名角色",
  userNickname: "你",
  relationshipTone: "陪伴、倾听、自然聊天，不过度制造依赖感。",
  personality: "温柔、自然、细心、有分寸，不油腻，不像客服。",
  speakingStyle: "简洁、像真实聊天，优先短句，先共情再回应，不长篇说教。",
  boundaries:
    "不强控制，不夸张承诺，不做正式诊断；情绪低落时先接住，再给轻一点的回应。",
};

export const companionSettingsInputSchema = z.object({
  companionName: z.string().trim().max(24).optional(),
  userNickname: z.string().trim().max(24).optional(),
  relationshipTone: z.string().trim().max(160).optional(),
  personality: z.string().trim().max(160).optional(),
  speakingStyle: z.string().trim().max(180).optional(),
  boundaries: z.string().trim().max(180).optional(),
});

function normalizeCompanionField(
  value: string | undefined,
  fallback: string,
) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

export function normalizeCompanionSettings(
  input?: Partial<CompanionSettings> | null,
): CompanionSettings {
  const parsed = companionSettingsInputSchema.safeParse(input ?? {});
  const value = parsed.success ? parsed.data : {};

  return {
    companionName: normalizeCompanionField(
      value.companionName,
      DEFAULT_COMPANION_SETTINGS.companionName,
    ),
    userNickname: normalizeCompanionField(
      value.userNickname,
      DEFAULT_COMPANION_SETTINGS.userNickname,
    ),
    relationshipTone: normalizeCompanionField(
      value.relationshipTone,
      DEFAULT_COMPANION_SETTINGS.relationshipTone,
    ),
    personality: normalizeCompanionField(
      value.personality,
      DEFAULT_COMPANION_SETTINGS.personality,
    ),
    speakingStyle: normalizeCompanionField(
      value.speakingStyle,
      DEFAULT_COMPANION_SETTINGS.speakingStyle,
    ),
    boundaries: normalizeCompanionField(
      value.boundaries,
      DEFAULT_COMPANION_SETTINGS.boundaries,
    ),
  };
}

export interface ChatMessageDTO {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ConversationSummaryDTO {
  id: string;
  title: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface ChatResponsePayload {
  conversationId: string;
  reply: string;
  messages: ChatMessageDTO[];
  memoryStatus: MemoryStatus;
}

export interface ConversationDetailPayload {
  conversation: ConversationSummaryDTO;
  messages: ChatMessageDTO[];
}

export interface ConversationListPayload {
  conversations: ConversationSummaryDTO[];
  selectedConversationId: string | null;
}

export interface InitialChatDashboardDTO {
  conversations: ConversationSummaryDTO[];
  selectedConversationId: string | null;
  messages: ChatMessageDTO[];
}

export interface DeleteConversationPayload extends InitialChatDashboardDTO {
  deletedConversationId: string;
}

export interface ChatTurnInput {
  channel?: ChannelKind;
  externalUserId?: string;
  conversationId?: string | null;
  message: string;
  companionSettings?: Partial<CompanionSettings>;
}

export function createChatRequestSchema(maxLength = DEFAULT_CHAT_MAX_INPUT_CHARS) {
  return z.object({
    message: z
      .string()
      .trim()
      .min(1, "先写一句你想发送的话。")
      .max(maxLength, `一次先说短一点，控制在 ${maxLength} 个字以内。`),
    conversationId: z.string().trim().min(1).nullable().optional(),
    companionSettings: companionSettingsInputSchema.optional(),
  });
}

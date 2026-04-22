"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import type {
  ChatMessageDTO,
  ChatResponsePayload,
  CompanionSettings,
  ConversationDetailPayload,
  ConversationSummaryDTO,
  DeleteConversationPayload,
} from "@/types/chat";
import {
  DEFAULT_CHAT_MAX_INPUT_CHARS,
  DEFAULT_COMPANION_SETTINGS,
  normalizeCompanionSettings,
} from "@/types/chat";

import { hasSpeechSynthesisSupport } from "@/lib/audio/browserSpeech";

import { CompanionSettingsPanel } from "./CompanionSettingsPanel";
import { ConversationSwipeItem } from "./ConversationSwipeItem";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

const VOICE_REPLY_STORAGE_KEY = "ai-companion:auto-voice-reply";
const COMPANION_SETTINGS_STORAGE_KEY = "ai-companion:settings";

interface ChatWindowProps {
  initialConversationId: string | null;
  initialConversations: ConversationSummaryDTO[];
  initialMessages: ChatMessageDTO[];
  initialError?: string | null;
}

function isChatResponsePayload(
  value: ChatResponsePayload | { error?: string },
): value is ChatResponsePayload {
  return "conversationId" in value && "messages" in value && "memoryStatus" in value;
}

export function ChatWindow({
  initialConversationId,
  initialConversations,
  initialMessages,
  initialError = null,
}: ChatWindowProps) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [conversations, setConversations] =
    useState<ConversationSummaryDTO[]>(initialConversations);
  const [messages, setMessages] = useState<ChatMessageDTO[]>(initialMessages);
  const [error, setError] = useState<string | null>(initialError);
  const [revealedConversationId, setRevealedConversationId] = useState<string | null>(
    null,
  );
  const [companionSettings, setCompanionSettings] = useState<CompanionSettings>(
    DEFAULT_COMPANION_SETTINGS,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceReplySupported, setIsVoiceReplySupported] = useState(false);
  const [autoPlayAssistantVoice, setAutoPlayAssistantVoice] = useState(false);
  const [isPending, startTransition] = useTransition();
  const messageViewportRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find(
    (item) => item.id === conversationId,
  );

  useEffect(() => {
    const node = messageViewportRef.current;
    if (!node) {
      return;
    }

    node.scrollTo({
      top: node.scrollHeight,
      behavior: "auto",
    });
  }, [messages, isPending]);

  useEffect(() => {
    if (
      revealedConversationId &&
      !conversations.some((item) => item.id === revealedConversationId)
    ) {
      setRevealedConversationId(null);
    }
  }, [conversations, revealedConversationId]);

  useEffect(() => {
    const savedSettings = window.localStorage.getItem(
      COMPANION_SETTINGS_STORAGE_KEY,
    );

    if (!savedSettings) {
      return;
    }

    try {
      const parsed = JSON.parse(savedSettings) as Partial<CompanionSettings>;
      setCompanionSettings(normalizeCompanionSettings(parsed));
    } catch {
      setCompanionSettings(DEFAULT_COMPANION_SETTINGS);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      COMPANION_SETTINGS_STORAGE_KEY,
      JSON.stringify(companionSettings),
    );
  }, [companionSettings]);

  useEffect(() => {
    const supported = hasSpeechSynthesisSupport();
    setIsVoiceReplySupported(supported);

    if (!supported) {
      return;
    }

    const savedPreference = window.localStorage.getItem(VOICE_REPLY_STORAGE_KEY);
    setAutoPlayAssistantVoice(savedPreference === "on");
  }, []);

  useEffect(() => {
    if (!isVoiceReplySupported) {
      return;
    }

    window.localStorage.setItem(
      VOICE_REPLY_STORAGE_KEY,
      autoPlayAssistantVoice ? "on" : "off",
    );
  }, [autoPlayAssistantVoice, isVoiceReplySupported]);

  const handleSelectConversation = (nextConversationId: string) => {
    if (nextConversationId === conversationId || isPending) {
      return;
    }

    setError(null);
    setRevealedConversationId(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/conversations/${nextConversationId}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as
          | ConversationDetailPayload
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error ? data.error : "这个聊天窗口暂时打不开。",
          );
        }

        if (!("conversation" in data) || !("messages" in data)) {
          throw new Error("聊天窗口数据格式不正确。");
        }

        setConversationId(data.conversation.id);
        setMessages(data.messages);
        setConversations((current) => {
          const merged = current.map((item) =>
            item.id === data.conversation.id ? data.conversation : item,
          );

          return merged.sort((a, b) =>
            b.lastMessageAt.localeCompare(a.lastMessageAt),
          );
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "这个聊天窗口暂时打不开。",
        );
      }
    });
  };

  const handleCreateConversation = () => {
    if (isPending) {
      return;
    }

    setError(null);
    setRevealedConversationId(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
        });

        const data = (await response.json()) as
          | ConversationSummaryDTO
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error ? data.error : "新聊天窗口暂时创建失败。",
          );
        }

        if (!("id" in data) || !("title" in data)) {
          throw new Error("新聊天窗口数据格式不正确。");
        }

        setConversationId(data.id);
        setMessages([]);
        setConversations((current) => [data, ...current]);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "新聊天窗口暂时创建失败。",
        );
      }
    });
  };

  const handleDeleteConversation = (targetConversationId: string) => {
    if (!targetConversationId || isPending) {
      return;
    }

    const shouldDelete = window.confirm(
      "确定删除这个聊天窗口吗？本地数据库里这个窗口的消息记录也会一起删掉。",
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setRevealedConversationId(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/conversations/${targetConversationId}`, {
          method: "DELETE",
        });

        const data = (await response.json()) as
          | DeleteConversationPayload
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error ? data.error : "这个聊天窗口暂时删不掉。",
          );
        }

        if (
          !("deletedConversationId" in data) ||
          !("conversations" in data) ||
          !("messages" in data)
        ) {
          throw new Error("删除聊天窗口后的返回数据格式不正确。");
        }

        setConversations(data.conversations);

        const shouldKeepCurrentConversation =
          conversationId &&
          conversationId !== targetConversationId &&
          data.conversations.some((item) => item.id === conversationId);

        if (shouldKeepCurrentConversation) {
          return;
        }

        setConversationId(data.selectedConversationId);
        setMessages(data.messages);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "这个聊天窗口暂时删不掉。",
        );
      }
    });
  };

  const handleSendMessage = (value: string) => {
    const message = value.trim();
    if (!message || isPending) {
      return;
    }

    setError(null);

    const optimisticUserMessage: ChatMessageDTO = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticUserMessage]);

    startTransition(async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            conversationId,
            companionSettings,
          }),
        });

        const data = (await response.json()) as
          | ChatResponsePayload
          | { error?: string };

        if (!response.ok) {
          const message =
            "error" in data ? data.error : "当前角色暂时没有接上，请稍后再试一次。";
          throw new Error(message ?? "当前角色暂时没有接上，请稍后再试一次。");
        }

        if (!isChatResponsePayload(data)) {
          throw new Error("接口返回的数据格式不正确。");
        }

        setConversationId(data.conversationId);
        setMessages((current) => {
          const filtered = current.filter(
            (item) => item.id !== optimisticUserMessage.id,
          );
          return [...filtered, ...data.messages];
        });
        setConversations((current) => {
          const nextTitle =
            selectedConversation?.title && selectedConversation.title !== "新的聊天窗口"
              ? selectedConversation.title
              : message.slice(0, 12);
          const currentSummary = current.find(
            (item) => item.id === data.conversationId,
          );
          const nextSummary: ConversationSummaryDTO = {
            id: data.conversationId,
            title:
              currentSummary?.title && currentSummary.title !== "新的聊天窗口"
                ? currentSummary.title
                : nextTitle,
            lastMessagePreview: data.reply.slice(0, 28),
            lastMessageAt: data.messages.at(-1)?.createdAt ?? new Date().toISOString(),
            createdAt: currentSummary?.createdAt ?? new Date().toISOString(),
          };
          const filtered = current.filter((item) => item.id !== data.conversationId);

          return [nextSummary, ...filtered].sort((a, b) =>
            b.lastMessageAt.localeCompare(a.lastMessageAt),
          );
        });
      } catch (requestError) {
        setMessages((current) =>
          current.filter((item) => item.id !== optimisticUserMessage.id),
        );
        setError(
          requestError instanceof Error
            ? requestError.message
            : "发送失败，请稍后再试。",
        );
      }
    });
  };

  const handleSettingsChange = (
    key: keyof CompanionSettings,
    value: string,
  ) => {
    setCompanionSettings((current) =>
      normalizeCompanionSettings({
        ...current,
        [key]: value,
      }),
    );
  };

  return (
    <section className="ambient-panel flex h-full min-h-0 overflow-hidden rounded-[2rem]">
      <aside className="hidden w-[18rem] flex-none border-r border-leaf/10 bg-white/22 lg:flex lg:flex-col">
        <div className="border-b border-leaf/10 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">聊天窗口</p>
              <p className="mt-1 text-xs leading-5 text-ink/55">
                左滑窗口可删除；角色名字和语气可以在上方角色设定里自己改。
              </p>
            </div>
            <button
              type="button"
              className="rounded-full bg-user-bubble px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#253b41] disabled:cursor-not-allowed disabled:bg-[#8ea09b]"
              disabled={isPending}
              onClick={handleCreateConversation}
            >
              新开窗口
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <div className="space-y-2">
            {conversations.map((item) => {
              const isActive = item.id === conversationId;

              return (
                <ConversationSwipeItem
                  key={item.id}
                  conversation={item}
                  isActive={isActive}
                  isOpen={revealedConversationId === item.id}
                  isPending={isPending}
                  onDelete={() => handleDeleteConversation(item.id)}
                  onOpenChange={(open) =>
                    setRevealedConversationId(open ? item.id : null)
                  }
                  onSelect={() => handleSelectConversation(item.id)}
                />
              );
            })}
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-leaf/10 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-[2rem] leading-none text-ink">
                  {companionSettings.companionName}
                </p>
                <p className="mt-2 text-sm text-ink/65 sm:text-base">
                  她会叫你：{companionSettings.userNickname}
                </p>
                {selectedConversation ? (
                  <p className="mt-2 text-xs text-ink/45">
                    当前窗口：{selectedConversation.title}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  className="rounded-full border border-leaf/12 bg-white/60 px-3 py-2 font-medium text-ink/72 transition hover:bg-white"
                  onClick={() => setIsSettingsOpen((current) => !current)}
                >
                  {isSettingsOpen ? "收起设定" : "角色设定"}
                </button>
                <button
                  type="button"
                  disabled={!isVoiceReplySupported}
                  className={`rounded-full border px-3 py-2 font-medium transition ${
                    autoPlayAssistantVoice
                      ? "border-leaf/16 bg-white text-ink shadow-[0_14px_28px_-24px_rgba(36,52,59,0.7)]"
                    : "border-leaf/12 bg-white/55 text-ink/62 hover:bg-white/75"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  onClick={() =>
                    setAutoPlayAssistantVoice((current) => !current)
                  }
                >
                  {isVoiceReplySupported
                    ? autoPlayAssistantVoice
                      ? "语音陪伴开启"
                      : "语音陪伴关闭"
                    : "当前浏览器不支持语音播报"}
                </button>
              </div>
            </div>

            {isSettingsOpen ? (
              <CompanionSettingsPanel
                settings={companionSettings}
                onChange={handleSettingsChange}
                onClose={() => setIsSettingsOpen(false)}
                onReset={() =>
                  setCompanionSettings(DEFAULT_COMPANION_SETTINGS)
                }
              />
            ) : null}

            <div className="space-y-2 lg:hidden">
              <button
                type="button"
                className="rounded-full bg-user-bubble px-4 py-2 text-xs font-semibold text-white"
                disabled={isPending}
                onClick={handleCreateConversation}
              >
                新开窗口
              </button>
              <div className="max-h-40 space-y-2 overflow-y-auto overscroll-contain pr-1">
                {conversations.map((item) => (
                  <ConversationSwipeItem
                    key={item.id}
                    conversation={item}
                    isActive={item.id === conversationId}
                    isOpen={revealedConversationId === item.id}
                    isPending={isPending}
                    variant="compact"
                    onDelete={() => handleDeleteConversation(item.id)}
                    onOpenChange={(open) =>
                      setRevealedConversationId(open ? item.id : null)
                    }
                    onSelect={() => handleSelectConversation(item.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </header>

        <div
          ref={messageViewportRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6"
        >
          <MessageList
            autoPlayAssistantVoice={autoPlayAssistantVoice}
            conversationId={conversationId}
            messages={messages}
            isPending={isPending}
          />
        </div>

        <div className="border-t border-leaf/10 bg-white/35 px-4 py-4 sm:px-6">
          {error ? (
            <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <MessageInput
            disabled={isPending}
            maxLength={DEFAULT_CHAT_MAX_INPUT_CHARS}
            onSubmit={handleSendMessage}
          />
        </div>
      </div>
    </section>
  );
}

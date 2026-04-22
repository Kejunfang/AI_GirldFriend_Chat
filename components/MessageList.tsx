"use client";

import { useEffect, useRef, useState } from "react";

import type { ChatMessageDTO } from "@/types/chat";

import {
  createCompanionUtterance,
  hasSpeechSynthesisSupport,
} from "@/lib/audio/browserSpeech";
import { cn } from "@/lib/utils/cn";
import { formatTimeLabel } from "@/lib/utils/format";

interface MessageListProps {
  conversationId?: string | null;
  messages: ChatMessageDTO[];
  isPending?: boolean;
  autoPlayAssistantVoice?: boolean;
}

export function MessageList({
  conversationId = null,
  messages,
  isPending = false,
  autoPlayAssistantVoice = false,
}: MessageListProps) {
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSeenConversationIdRef = useRef<string | null>(null);
  const lastAutoPlayedMessageIdRef = useRef<string | null>(null);
  const stopSpeakingRef = useRef<() => void>(() => {});
  const speakMessageRef = useRef<(messageId: string, content: string) => void>(
    () => {},
  );

  const latestAssistantMessage =
    [...messages].reverse().find((message) => message.role === "assistant") ?? null;
  const latestAssistantMessageId = latestAssistantMessage?.id ?? null;
  const latestAssistantMessageContent = latestAssistantMessage?.content ?? "";

  stopSpeakingRef.current = () => {
    if (!hasSpeechSynthesisSupport()) {
      return;
    }

    activeUtteranceRef.current = null;
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
  };

  speakMessageRef.current = (messageId: string, content: string) => {
    if (!hasSpeechSynthesisSupport()) {
      return;
    }

    if (speakingMessageId === messageId) {
      stopSpeakingRef.current();
      return;
    }

    stopSpeakingRef.current();

    const utterance = createCompanionUtterance(content);
    activeUtteranceRef.current = utterance;
    setSpeakingMessageId(messageId);

    utterance.onend = () => {
      if (activeUtteranceRef.current === utterance) {
        activeUtteranceRef.current = null;
        setSpeakingMessageId(null);
      }
    };

    utterance.onerror = () => {
      if (activeUtteranceRef.current === utterance) {
        activeUtteranceRef.current = null;
        setSpeakingMessageId(null);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const supported = hasSpeechSynthesisSupport();
    setIsVoiceSupported(supported);

    if (!supported) {
      return;
    }

    const handleVoicesChanged = () => {
      setIsVoiceSupported(hasSpeechSynthesisSupport());
    };

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        handleVoicesChanged,
      );
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (lastSeenConversationIdRef.current === conversationId) {
      return;
    }

    lastSeenConversationIdRef.current = conversationId;
    lastAutoPlayedMessageIdRef.current = latestAssistantMessageId;
    stopSpeakingRef.current();
  }, [conversationId, latestAssistantMessageId]);

  useEffect(() => {
    if (
      !autoPlayAssistantVoice ||
      !isVoiceSupported ||
      !latestAssistantMessageId ||
      !latestAssistantMessageContent
    ) {
      return;
    }

    if (lastAutoPlayedMessageIdRef.current === latestAssistantMessageId) {
      return;
    }

    lastAutoPlayedMessageIdRef.current = latestAssistantMessageId;
    speakMessageRef.current(
      latestAssistantMessageId,
      latestAssistantMessageContent,
    );
  }, [
    autoPlayAssistantVoice,
    isVoiceSupported,
    latestAssistantMessageContent,
    latestAssistantMessageId,
  ]);

  if (!messages.length) {
    return (
      <div className="flex h-full min-h-[26rem] items-center justify-center">
        <div className="max-w-md rounded-[1.8rem] border border-dashed border-leaf/18 bg-white/45 px-6 py-8 text-center text-sm leading-7 text-ink/62">
          <p className="font-display text-2xl text-ink">先设定角色，再开始聊天</p>
          <p className="mt-3">
            你可以先打开上方的角色设定，自定义名字、称呼和语气。设好之后，再从一句近况开始。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isLatest = index === messages.length - 1;

        return (
          <div
            key={message.id}
            className={cn(
              "flex w-full animate-reveal",
              isUser ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-[1.65rem] px-4 py-3 text-[15px] leading-7 shadow-[0_18px_40px_-34px_rgba(36,52,59,0.8)] sm:max-w-[72%]",
                isUser
                  ? "rounded-br-md bg-user-bubble text-user-bubble-text"
                  : "rounded-bl-md bg-assistant-bubble text-assistant-bubble-text",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <div className="mt-2 flex items-center gap-3 text-[11px]">
                <span
                  className={cn(
                    isUser ? "text-white/66" : "text-ink/38",
                  )}
                >
                  {formatTimeLabel(message.createdAt)}
                  {isLatest && isUser && isPending ? " · 发送中" : null}
                </span>
                {!isUser && isVoiceSupported ? (
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                      speakingMessageId === message.id
                        ? "border-rose-200 bg-rose-50 text-rose-600"
                        : "border-leaf/10 bg-white/70 text-ink/54 hover:bg-white",
                    )}
                    onClick={() =>
                      speakMessageRef.current(message.id, message.content)
                    }
                  >
                    {speakingMessageId === message.id ? "停止播报" : "播放语音"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

      {isPending ? (
        <div className="flex justify-start">
          <div className="rounded-[1.65rem] rounded-bl-md bg-assistant-bubble px-4 py-3 shadow-[0_18px_40px_-34px_rgba(36,52,59,0.8)]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-leaf/60 [animation-delay:-0.25s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-leaf/60 [animation-delay:-0.12s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-leaf/60" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

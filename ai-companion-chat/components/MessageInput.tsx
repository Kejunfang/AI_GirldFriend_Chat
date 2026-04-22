"use client";

import { useEffect, useRef, useState } from "react";

import {
  getBrowserSpeechRecognition,
  hasSpeechRecognitionSupport,
  normalizeSpeechRecognitionError,
  type BrowserSpeechRecognition,
} from "@/lib/audio/browserSpeech";

interface MessageInputProps {
  disabled?: boolean;
  maxLength: number;
  onSubmit: (message: string) => void;
}

export function MessageInput({
  disabled = false,
  maxLength,
  onSubmit,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [isSpeechInputSupported, setIsSpeechInputSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const listeningBaseValueRef = useRef("");

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [value]);

  useEffect(() => {
    setIsSpeechInputSupported(hasSpeechRecognitionSupport());

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!disabled) {
      return;
    }

    recognitionRef.current?.stop();
  }, [disabled]);

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const startListening = () => {
    if (disabled) {
      return;
    }

    const RecognitionConstructor = getBrowserSpeechRecognition();

    if (!RecognitionConstructor) {
      setIsSpeechInputSupported(false);
      setSpeechError("当前浏览器不支持语音输入，可以先打字聊天。");
      return;
    }

    const recognition = new RecognitionConstructor();
    listeningBaseValueRef.current = value.trim();
    setSpeechError(null);

    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? "";
      }

      const cleanedTranscript = transcript.trim();
      const baseValue = listeningBaseValueRef.current.trim();

      if (!cleanedTranscript) {
        return;
      }

      setValue(baseValue ? `${baseValue}\n${cleanedTranscript}` : cleanedTranscript);
    };

    recognition.onerror = (event) => {
      const nextError = normalizeSpeechRecognitionError(event.error);

      if (event.error !== "aborted") {
        setSpeechError(nextError);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setSpeechError("语音输入没能启动，刷新页面后再试一次。");
      recognitionRef.current = null;
      setIsListening(false);
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) {
      return;
    }

    stopListening();
    onSubmit(trimmed);
    setValue("");
    setSpeechError(null);
  };

  return (
    <div className="rounded-[1.65rem] border border-leaf/12 bg-white/75 p-3 shadow-[0_18px_40px_-34px_rgba(36,52,59,0.8)] backdrop-blur">
      <div className="flex items-end gap-3">
        <label className="sr-only" htmlFor="chat-message">
          输入消息
        </label>

        <textarea
          id="chat-message"
          ref={textareaRef}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          rows={1}
          placeholder="想从哪句话开始都可以，也可以点一下语音。"
          className="min-h-[52px] flex-1 resize-none border-0 bg-transparent px-2 py-3 text-[15px] leading-7 text-ink outline-none placeholder:text-ink/38 disabled:cursor-not-allowed disabled:opacity-60"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) {
              return;
            }

            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />

        <button
          type="button"
          disabled={disabled || !isSpeechInputSupported}
          aria-pressed={isListening}
          className={`inline-flex h-12 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold transition ${
            isListening
              ? "border-rose-300 bg-rose-50 text-rose-600 shadow-[0_0_0_5px_rgba(244,63,94,0.08)]"
              : "border-leaf/14 bg-white/80 text-ink/72 hover:border-leaf/22 hover:bg-white"
          } disabled:cursor-not-allowed disabled:opacity-55`}
          onClick={() => {
            if (isListening) {
              stopListening();
              return;
            }

            startListening();
          }}
        >
          <span
            className={`mr-2 inline-flex h-2.5 w-2.5 rounded-full ${
              isListening ? "animate-pulse bg-rose-500" : "bg-leaf/45"
            }`}
          />
          {isListening ? "结束" : "语音"}
        </button>

        <button
          type="button"
          disabled={disabled || !value.trim()}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-user-bubble px-5 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-[#253b41] disabled:cursor-not-allowed disabled:bg-[#8ea09b]"
          onClick={submit}
        >
          发送
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between px-2 text-xs text-ink/48">
        <span>
          {speechError
            ? speechError
            : isListening
              ? "正在听你说，点一下结束就会把语音转成文字。"
              : isSpeechInputSupported
                ? "回车发送，Shift + 回车换行，也可以点语音输入。"
                : "回车发送，Shift + 回车换行。当前浏览器暂不支持语音输入。"}
        </span>
        <span>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}

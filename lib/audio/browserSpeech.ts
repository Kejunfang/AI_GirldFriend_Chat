"use client";

export type BrowserSpeechRecognitionErrorCode =
  | "aborted"
  | "audio-capture"
  | "bad-grammar"
  | "language-not-supported"
  | "network"
  | "no-speech"
  | "not-allowed"
  | "service-not-allowed";

export interface BrowserSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

export interface BrowserSpeechRecognitionResultList {
  length: number;
  [index: number]: BrowserSpeechRecognitionResult;
}

export interface BrowserSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: BrowserSpeechRecognitionResultList;
}

export interface BrowserSpeechRecognitionErrorEvent extends Event {
  error: BrowserSpeechRecognitionErrorCode;
  message: string;
}

export interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: ((event: Event) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onstart: ((event: Event) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
}

export interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

const COMPANION_LANG = "zh-CN";

const preferredVoiceHints = [
  "xia",
  "ting",
  "mei",
  "ling",
  "yun",
  "female",
  "woman",
  "xiaoxiao",
  "xiaoyi",
  "zh-cn",
];

export function getBrowserSpeechRecognition() {
  if (typeof window === "undefined") {
    return null;
  }

  const browserWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return (
    browserWindow.SpeechRecognition ??
    browserWindow.webkitSpeechRecognition ??
    null
  );
}

export function hasSpeechRecognitionSupport() {
  return getBrowserSpeechRecognition() !== null;
}

export function hasSpeechSynthesisSupport() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

export function pickCompanionVoice(voices: SpeechSynthesisVoice[]) {
  const zhVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("zh"),
  );

  if (!zhVoices.length) {
    return voices.find((voice) => voice.default) ?? voices[0] ?? null;
  }

  const hintedVoice = zhVoices.find((voice) => {
    const normalized = `${voice.name} ${voice.lang}`.toLowerCase();
    return preferredVoiceHints.some((hint) => normalized.includes(hint));
  });

  return hintedVoice ?? zhVoices.find((voice) => voice.default) ?? zhVoices[0];
}

export function createCompanionUtterance(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = COMPANION_LANG;
  utterance.rate = 1;
  utterance.pitch = 1.04;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const voice = pickCompanionVoice(voices);

  if (voice) {
    utterance.voice = voice;
  }

  return utterance;
}

export function normalizeSpeechRecognitionError(
  error: BrowserSpeechRecognitionErrorCode,
) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "麦克风权限没有打开，先允许浏览器访问麦克风。";
    case "audio-capture":
      return "没有检测到可用麦克风。";
    case "no-speech":
      return "刚刚没有收到清晰语音，可以再说一次。";
    case "network":
      return "语音识别连接暂时不稳定，请稍后再试。";
    case "language-not-supported":
      return "当前浏览器暂时不支持中文语音识别。";
    case "aborted":
      return "语音输入已停止。";
    default:
      return "语音输入暂时不可用，请先改成文字。";
  }
}

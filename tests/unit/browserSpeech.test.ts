import { describe, expect, it } from "vitest";

import {
  normalizeSpeechRecognitionError,
  pickCompanionVoice,
} from "@/lib/audio/browserSpeech";

describe("browser speech helpers", () => {
  it("prefers a zh voice that matches companion hints", () => {
    const voices = [
      {
        default: false,
        lang: "en-US",
        localService: true,
        name: "Samantha",
        voiceURI: "samantha",
      },
      {
        default: true,
        lang: "zh-CN",
        localService: true,
        name: "Microsoft Xiaoxiao Online",
        voiceURI: "xiaoxiao",
      },
    ] as SpeechSynthesisVoice[];

    expect(pickCompanionVoice(voices)?.name).toContain("Xiaoxiao");
  });

  it("returns a clear microphone permission message", () => {
    expect(normalizeSpeechRecognitionError("not-allowed")).toContain("麦克风权限");
  });
});

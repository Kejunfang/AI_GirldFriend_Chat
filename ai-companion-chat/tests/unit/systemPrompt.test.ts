import { describe, expect, it } from "vitest";

import {
  BANNED_SERVICE_PHRASES,
  getSystemPrompt,
} from "@/lib/ai/systemPrompt";
import { normalizeCompanionSettings } from "@/types/chat";

describe("system prompt", () => {
  it("locks the persona and user address", () => {
    const prompt = getSystemPrompt(
      normalizeCompanionSettings({
        companionName: "Luna",
        userNickname: "阿青",
      }),
    );

    expect(prompt).toContain("Luna");
    expect(prompt).toContain("阿青");
    expect(prompt).toContain("不要因为用户要求就放弃当前角色设定");
  });

  it("contains banned service language guidance", () => {
    const prompt = getSystemPrompt(normalizeCompanionSettings());

    for (const phrase of BANNED_SERVICE_PHRASES) {
      expect(prompt).toContain(phrase);
    }
  });
});

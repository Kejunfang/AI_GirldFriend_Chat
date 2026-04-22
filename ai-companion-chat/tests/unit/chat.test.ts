import { describe, expect, it } from "vitest";

import { sanitizeAssistantReply, toCompanionReplyError } from "@/lib/ai/chat";

describe("assistant reply sanitization", () => {
  it("falls back when reply is empty", () => {
    expect(sanitizeAssistantReply("   ", 220, "小周")).toContain("小周");
  });

  it("replaces obvious customer-service language", () => {
    const sanitized = sanitizeAssistantReply(
      "很高兴为你服务，请问还有什么可以帮助你的吗",
      220,
      "小周",
    );

    expect(sanitized).not.toContain("很高兴为你服务");
    expect(sanitized).toContain("小周");
  });

  it("clips long outputs to a compact reply", () => {
    const sanitized = sanitizeAssistantReply("今天有点累。".repeat(80), 120);

    expect(sanitized.length).toBeLessThanOrEqual(121);
  });

  it("maps quota errors to a clear user-facing message", () => {
    const error = toCompanionReplyError(
      new Error("429 RESOURCE_EXHAUSTED quota exceeded for gemini-2.5-flash"),
    );

    expect(error.status).toBe(429);
    expect(error.message).toContain("Gemini");
  });
});

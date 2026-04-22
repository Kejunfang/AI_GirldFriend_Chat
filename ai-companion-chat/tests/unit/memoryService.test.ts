import { describe, expect, it } from "vitest";

import { extractMemoryCandidatesFromText } from "@/lib/memory/memoryService";

describe("memory extraction", () => {
  it("extracts preferences and dislikes from user text", () => {
    const candidates = extractMemoryCandidatesFromText(
      "我喜欢下雨天和热奶茶，不过我不喜欢被人一直说教。",
    );

    expect(
      candidates.some(
        (candidate) =>
          candidate.type === "PREFERENCE" &&
          candidate.content.includes("我喜欢下雨天和热奶茶"),
      ),
    ).toBe(true);

    expect(
      candidates.some(
        (candidate) =>
          candidate.type === "DISLIKE" &&
          candidate.content.includes("我不喜欢被人一直说教"),
      ),
    ).toBe(true);
  });

  it("deduplicates repeated matches", () => {
    const candidates = extractMemoryCandidatesFromText(
      "我喜欢散步。我喜欢散步。",
    );

    expect(candidates).toHaveLength(1);
  });
});

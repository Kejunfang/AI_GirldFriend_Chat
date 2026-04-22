import { afterEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: queryRaw,
  },
}));

const { GET } = await import("@/app/api/health/route");

describe("/api/health", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok when database query succeeds", async () => {
    queryRaw.mockResolvedValue([{ ok: 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.database).toBe("up");
  });

  it("returns 503 when database query fails", async () => {
    queryRaw.mockRejectedValue(new Error("db down"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.database).toBe("down");
  });
});

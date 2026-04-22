import "server-only";

import { env } from "@/lib/env";

const requestBuckets = new Map<string, number[]>();

export class RateLimitError extends Error {
  status = 429;

  constructor(message = "你说得有点快了，稍等一下我们再接着聊。") {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function enforceRateLimit(key: string) {
  const now = Date.now();
  const boundary = now - env.RATE_LIMIT_WINDOW_MS;
  const recentHits = (requestBuckets.get(key) ?? []).filter(
    (timestamp) => timestamp > boundary,
  );

  if (recentHits.length >= env.RATE_LIMIT_MAX_REQUESTS) {
    throw new RateLimitError();
  }

  recentHits.push(now);
  requestBuckets.set(key, recentHits);

  return {
    remaining: Math.max(env.RATE_LIMIT_MAX_REQUESTS - recentHits.length, 0),
  };
}

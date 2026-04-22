import "server-only";

import { z } from "zod";

import { DEFAULT_CHAT_MAX_INPUT_CHARS } from "@/types/chat";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  DEV_USER_EXTERNAL_ID: z.string().default("local-dev-user"),
  APP_NAME: z.string().default("AI Companion Chat"),
  CHAT_MAX_INPUT_CHARS: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_CHAT_MAX_INPUT_CHARS),
  CHAT_MAX_REPLY_CHARS: z.coerce.number().int().positive().default(220),
  CHAT_RECENT_MESSAGE_LIMIT: z.coerce.number().int().positive().default(12),
  CHAT_MEMORY_LIMIT: z.coerce.number().int().positive().default(8),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(12),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  DEV_USER_EXTERNAL_ID: process.env.DEV_USER_EXTERNAL_ID,
  APP_NAME: process.env.APP_NAME,
  CHAT_MAX_INPUT_CHARS: process.env.CHAT_MAX_INPUT_CHARS,
  CHAT_MAX_REPLY_CHARS: process.env.CHAT_MAX_REPLY_CHARS,
  CHAT_RECENT_MESSAGE_LIMIT: process.env.CHAT_RECENT_MESSAGE_LIMIT,
  CHAT_MEMORY_LIMIT: process.env.CHAT_MEMORY_LIMIT,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
});

export function requireGeminiKey() {
  const key = env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY;

  if (!key) {
    throw new Error("缺少 GEMINI_API_KEY，请先在 .env.local 中配置。");
  }

  return key;
}

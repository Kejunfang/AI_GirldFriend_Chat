import "server-only";

import { GoogleGenAI } from "@google/genai";

import { requireGeminiKey } from "@/lib/env";

let client: GoogleGenAI | undefined;

export function getGeminiClient() {
  if (!client) {
    client = new GoogleGenAI({
      apiKey: requireGeminiKey(),
    });
  }

  return client;
}

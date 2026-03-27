/**
 * Vision Service — Automatic Fallback Switchboard
 *
 * Reads VISION_AI_FALLBACK_ORDER (comma-separated, e.g. "google,openai")
 * and tries each provider in order. If one fails it logs a warning and
 * moves to the next. Throws only when every provider in the list has failed.
 *
 * Adding a new provider: implement analyzeImage() in a new adapter file
 * and register it in ADAPTERS below.
 */

import { analyzeImage as analyzeWithGoogle } from "./googleVisionAdapter";
import { analyzeImage as analyzeWithOpenAI } from "./openaiVisionAdapter";

type VisionProvider = "google" | "openai";

type AnalyzeFn = (
  imageBase64: string,
  prompt: string,
  mimeType?: string,
) => Promise<string>;

const ADAPTERS: Record<VisionProvider, AnalyzeFn> = {
  google: analyzeWithGoogle,
  openai: analyzeWithOpenAI,
};

const DEFAULT_ORDER: VisionProvider[] = ["openai"];

function resolveOrder(): VisionProvider[] {
  const raw = process.env.VISION_AI_FALLBACK_ORDER || "";
  if (!raw.trim()) return DEFAULT_ORDER;

  const parsed = raw
    .split(",")
    .map((p) => p.trim().toLowerCase() as VisionProvider)
    .filter((p) => p in ADAPTERS);

  return parsed.length > 0 ? parsed : DEFAULT_ORDER;
}

export async function analyzeImageWithFallback(
  imageBase64: string,
  prompt: string,
  mimeType: string = "image/jpeg",
): Promise<string> {
  const order = resolveOrder();

  let lastError: Error = new Error("No providers attempted");

  for (const provider of order) {
    try {
      console.log(`[VisionService] Trying provider: ${provider}`);
      const result = await ADAPTERS[provider](imageBase64, prompt, mimeType);
      console.log(`[VisionService] Success with provider: ${provider}`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[VisionService] Provider "${provider}" failed: ${msg}. Falling back to next...`,
      );
      lastError = err instanceof Error ? err : new Error(msg);
    }
  }

  throw lastError;
}

/**
 * OpenAI Vision Adapter (via Replit AI Integrations proxy or direct key)
 * Implements the standard analyzeImage(imageBase64, prompt, mimeType) contract.
 */

import OpenAI from "openai";

export async function analyzeImage(
  imageBase64: string,
  prompt: string,
  mimeType: string = "image/jpeg",
): Promise<string> {
  const apiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const baseURL =
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
    "https://ai.replit.com/v1";

  const openai = new OpenAI({ apiKey, baseURL });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

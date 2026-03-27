/**
 * Google Gemini Vision Adapter
 * Implements the standard analyzeImage(imageBase64, prompt, mimeType) contract.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function analyzeImage(
  imageBase64: string,
  prompt: string,
  mimeType: string = "image/jpeg",
): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    },
    prompt,
  ]);

  return result.response.text();
}

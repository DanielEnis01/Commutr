import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Send a prompt to Gemini and return the text response.
 */
export async function askGemini(prompt, model = "gemini-2.5-flash-preview-05-20") {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text;
}

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const base64Audio = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="; // tiny valid wav file
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        { inlineData: { data: base64Audio, mimeType: "audio/wav" } },
        { text: "What is this?" }
      ],
    });
    console.log("WORKS 3.6 audio", response.text);
  } catch (e: any) {
    console.error("FAILED 3.6 audio", e.message);
  }
}
test();

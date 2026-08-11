import { GoogleGenAI, Type } from "@google/genai";
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
        { text: "Extract info" }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             hello: { type: Type.STRING }
          }
        }
      }
    });
    console.log("WORKS schema audio", response.text);
  } catch (e: any) {
    console.error("FAILED schema audio", e.message);
  }
}
test();

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "Hello"
    });
    console.log("WORKS 1.5");
  } catch (e: any) {
    console.error("FAILED 1.5", e.message);
  }
}
test();

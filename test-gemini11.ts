import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Hello"
    });
    console.log("WORKS 2.0");
  } catch (e: any) {
    console.error("FAILED 2.0", e.message);
  }
}
test();

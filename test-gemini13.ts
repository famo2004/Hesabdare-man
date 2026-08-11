import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: "Hello"
    });
    console.log("WORKS gemini-flash-latest", response.text);
  } catch (e: any) {
    console.error("FAILED gemini-flash-latest", e.message);
  }
}
test();

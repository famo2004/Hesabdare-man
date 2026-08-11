import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = await ai.models.list();
  for await (const m of models) {
    if (m.name.includes('flash') || m.name.includes('pro')) {
      console.log(m.name);
    }
  }
}
test();

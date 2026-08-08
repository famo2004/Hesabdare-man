import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function test() {
  try {
    const response = await ai.models.list();
    for await (const m of response) {
      console.log(m.name);
    }
  } catch (err: any) {
    console.error("ERROR:", err.message);
  }
}
test();

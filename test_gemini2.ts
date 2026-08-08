import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function test(model: string) {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: "Hello world",
    });
    console.log(`SUCCESS for ${model}:`, response.text?.slice(0,20));
  } catch (err: any) {
    console.error(`ERROR for ${model}:`, err.message);
  }
}
async function runAll() {
  await test("gemini-3.5-flash");
  await test("gemini-3.1-flash-lite");
  await test("gemini-3.5-flash-lite");
  await test("gemini-3-flash-preview");
  await test("gemini-3.1-pro-preview");
}
runAll();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json({ limit: '50mb' }));

  // API Route for Gemini processing
  app.post("/api/parse-speech", async (req, res) => {
    try {
      const { text, audioBase64, mimeType, projects } = req.body;

      if (!text && !audioBase64) {
        return res.status(400).json({ error: "Text or audio is required" });
      }

      let projectsContext = "";
      if (projects && Array.isArray(projects) && projects.length > 0) {
        projectsContext = `Here is the list of predefined project names in the system:
${projects.map((p: any) => `- ${p.name}`).join('\n')}
IMPORTANT: You must search through these predefined projects. If the user mentions any of these names (or something very similar) even WITHOUT saying the word "پروژه" (project), you must assign that transaction to that EXACT project name in the "project" field.`;
      }

      if (!process.env.GEMINI_API_KEY) { 
        return res.status(500).json({ error: "کلید GEMINI_API_KEY در تنظیمات سرور (Netlify) یافت نشد. لطفا در پنل نتلیفای در بخش Environment Variables کلید خود را اضافه کنید." }); 
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
      
      const contents = [];
      if (audioBase64 && mimeType) {
        contents.push({
          inlineData: {
            data: audioBase64,
            mimeType: mimeType
          }
        });
      }
      if (text) {
        contents.push(text);
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction: `You are a helpful assistant for parsing Persian financial transactions from either audio or text.
Extract the transaction details into JSON.
If the text describes a transfer from one account to another, generate TWO transactions:
1. An 'expense' from the source account.
2. An 'income' to the destination account.
If it's a regular transaction, generate ONE transaction.
IMPORTANT: If the user says "پرداخت" (paid), it is ALWAYS an 'expense'. If they say "واریز" (deposited/received), it is ALWAYS an 'income'.
${projectsContext}

Map the extracted information to the following fields:
- type: 'income' or 'expense'
- amount: (number) Extract the amount. e.g., '350 میلیون' -> 350000000. 'هزار' -> 1000.
- project: (string) The name of the project if matched.
- category: (string) The category if mentioned.
- card: (string) The card or bank name if mentioned.
- description: (string) The description/babat of the transaction.
- date: (string, optional) YYYY-MM-DD if explicitly mentioned.
- time: (string, optional) HH:MM format if explicitly mentioned.

Return ONLY valid JSON matching the schema (which is an array of objects).`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "'income' or 'expense'" },
                amount: { type: Type.NUMBER, description: "The amount as an integer number" },
                project: { type: Type.STRING },
                category: { type: Type.STRING },
                card: { type: Type.STRING },
                description: { type: Type.STRING },
                date: { type: Type.STRING }, 
                time: { type: Type.STRING, description: "Time of the transaction in HH:MM format if mentioned, otherwise empty" }
              },
              required: ["type", "amount", "description"]
            }
          }
        }
      });

      let jsonStr = response.text?.trim() || "[]";
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/```json\n/, "").replace(/```$/, "").trim();
      }
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```\n/, "").replace(/```$/, "").trim();
      }

      let data = JSON.parse(jsonStr);
      if (!Array.isArray(data)) {
        data = [data];
      }
      res.json(data);
    } catch (error: any) {
      console.error("Error parsing speech:", error);
      res.status(500).json({ error: "Failed to parse speech", details: error.message });
    }
  });

  // API Route for Excel parsing
  app.post("/api/parse-excel", async (req, res) => {
    try {
      const { csvData, projects, accounts } = req.body;

      if (!csvData) {
        return res.status(400).json({ error: "CSV data is required" });
      }

      let projectsContext = "";
      if (projects && Array.isArray(projects) && projects.length > 0) {
        projectsContext = `Here is the list of predefined project names in the system:
${projects.map((p: any) => `- ${p.name}`).join('\n')}`;
      }
      
      let accountsContext = "";
      if (accounts && Array.isArray(accounts) && accounts.length > 0) {
        accountsContext = `Here is the list of predefined accounts in the system:
${accounts.map((a: any) => `- ${a.name}`).join('\n')}`;
      }

      if (!process.env.GEMINI_API_KEY) { 
        return res.status(500).json({ error: "کلید GEMINI_API_KEY در تنظیمات سرور (Netlify) یافت نشد. لطفا در پنل نتلیفای در بخش Environment Variables کلید خود را اضافه کنید." }); 
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [csvData],
        config: {
          systemInstruction: `You are a helpful assistant for parsing Persian financial transactions from a CSV/Excel file.
Extract the transaction details into a JSON array.
${projectsContext}
${accountsContext}
IMPORTANT: For each row, accurately determine the following:
- type: 'income' (واریز/درآمد) or 'expense' (برداشت/هزینه/پرداخت).
- amount: (number) Extract the amount.
- project: (string) Match with predefined projects if applicable.
- account: (string) Match with predefined accounts if applicable.
- category: (string) The category if mentioned.
- description: (string) The description/babat of the transaction.
- date: (string) Convert the date to YYYY-MM-DD format if possible.

Return ONLY valid JSON matching the schema (which is an array of objects).`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "'income' or 'expense'" },
                amount: { type: Type.NUMBER, description: "The amount as an integer number" },
                project: { type: Type.STRING },
                account: { type: Type.STRING },
                category: { type: Type.STRING },
                description: { type: Type.STRING },
                date: { type: Type.STRING }, 
                time: { type: Type.STRING, description: "Time of the transaction in HH:MM format if mentioned, otherwise empty" }
              },
              required: ["type", "amount", "description"]
            }
          }
        }
      });

      let jsonStr = response.text?.trim() || "[]";
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/```json\n/, "").replace(/```$/, "").trim();
      }
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```\n/, "").replace(/```$/, "").trim();
      }

      let data = JSON.parse(jsonStr);
      if (!Array.isArray(data)) data = [data];

      res.json(data);
    } catch (error) {
      console.error("Error parsing excel:", error);
      res.status(500).json({ error: "Failed to parse excel" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();
const genai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY as string);
async function run() {
  const models = ['gemini-2.0-pro-exp-02-05', 'gemini-2.0-flash-lite-preview-02-05', 'gemini-2.5-pro', 'gemini-2.0-flash-exp'];
  for (const m of models) {
    try {
      const model = genai.getGenerativeModel({ model: m });
      await model.generateContent('test');
      console.log(m, 'SUCCESS');
    } catch (e: any) { console.error(m, 'FAIL:', e.status || e.message); }
  }
}
run();
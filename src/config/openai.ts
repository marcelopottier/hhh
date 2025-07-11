import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from 'dotenv';

dotenv.config();

export const openaiConfig = {
  getLLM() {
    return new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      temperature: 0.2,
    });
  },
};

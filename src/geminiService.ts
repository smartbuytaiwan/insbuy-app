/// <reference types="vite/client" />
import { GoogleGenerativeAI } from "@google/generative-ai";

// ★ 修復重點：建立一個安全的函數來取得 API Key
// 瀏覽器環境 (Vite) 必須用 import.meta.env
// 後端環境 (Node) 用 process.env
const getApiKey = () => {
  // 透過最上方的 reference 指令，TypeScript 現在看得懂 import.meta.env 了
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    return import.meta.env.VITE_API_KEY;
  }
  
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    // @ts-ignore
    return process.env.API_KEY;
  }
  return "";
};

// 初始化 AI
const genAI = new GoogleGenerativeAI(getApiKey());

/**
 * 1. 產生行銷文案
 */
export const generateMarketingCopy = async (productName: string, features: string) => {
  try {
    const key = getApiKey();
    if (!key) return "錯誤：找不到 API Key，請檢查 .env 檔案";

    // 改用 gemini-1.5-flash，這是目前最通用且快速的模型
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `請為這款名為 "${productName}" 的商品撰寫一段吸引人的團購推廣文案。
      特色如下：${features}。
      要求：語氣親切、包含 3-5 個表情符號、強調限量與團購優惠，並以繁體中文撰寫。`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Copy Error:", error);
    return "AI 文案生成失敗，請稍後再試。";
  }
};

/**
 * 2. 聊天機器人
 */
export const getAIChatResponse = async (userMessage: string, history: any[]) => {
  try {
    const key = getApiKey();
    if (!key) return "錯誤：找不到 API Key";

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const chatHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: "你是 InsBuy 拍拍購平台的 AI 購物小助手。請協助使用者解答關於團購流程、商品諮詢或一般幫助。語氣要專業且友善，使用繁體中文。",
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (error) {
    console.error("Chat Error:", error);
    return "連線發生問題，請檢查網路或 API Key。";
  }
};

/**
 * 3. 文字轉向量 (Embedding)
 */
export const textToVector = async (text: string) => {
  try {
    const key = getApiKey();
    if (!key) return [];

    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding Error:", error);
    return [];
  }
};
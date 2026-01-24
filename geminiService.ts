import { GoogleGenAI } from "@google/genai";

export const generateMarketingCopy = async (productName: string, features: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `請為這款名為 "${productName}" 的商品撰寫一段吸引人的團購推廣文案。
      特色如下：${features}。
      要求：語氣親切、包含 3-5 個表情符號、強調限量與團購優惠，並以繁體中文撰寫。`,
    });
    return response.text || "無法生成文案，請稍後再試。";
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "無法生成文案，請稍後再試。";
  }
};

export const getAIChatResponse = async (userMessage: string, history: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: userMessage }] },
      config: {
        systemInstruction: "你是 InsBuy 拍拍購平台的 AI 購物小助手。請協助使用者解答關於團購流程、商品諮詢或一般幫助。語氣要專業且友善，使用繁體中文。",
      },
    });
    return response.text || "小助手現在有點忙，請等一下再問我吧！";
  } catch (error) {
    console.error("Chat AI Error:", error);
    return "抱歉，連線發生了一點問題。";
  }
};
import { GoogleGenerativeAI } from "@google/generative-ai";

// 可用的免費模型列表，按優先順序排列
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b"
];

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export interface AnimeCheckRequest {
  name: string;
  current: string;
}

export interface AnimeUpdate {
  name: string;
  latest: string;
}

export interface AIResponse {
  updates: AnimeUpdate[];
}

/**
 * 客戶端 AI 檢查邏輯：具備多模型自動切換功能
 */
export async function checkAnimeUpdates(animations: AnimeCheckRequest[]): Promise<AIResponse> {
  const today = new Date().toLocaleDateString('zh-TW');
  const prompt = `你是一個專業的影視數據抓取助手。
今天是 ${today}。
任務：利用 Google 搜尋查詢清單中作品的「已播出」最新集數。

核心搜查邏輯 (極重要)：
1. **打破官方迷思**：許多動畫 (尤其是國漫) 在官方平台的集數標記是「當季進度」(如 160)，但在第三方站點、YouTube 或海外版則是「總累進集數」(如 210)。**你必須搜尋並回報網路上能找到的最高「已播出」數字**。
2. **優先搜尋關鍵字**：除了搜尋作品名，請嘗試搭配「最新集數」、「總集數」、「劇迷」、「Gimy」、「YouTube」進行核對。
3. **區分版本**：只要是「已播出」的內容（不論是特典、特別篇或總集數標記），只要數值較大就採用。
4. **排除誤區**：絕對不要把「小說章節」或「漫畫話數」當作動畫集數。動畫集數通常伴隨著「集」、「EP」或「影片長度」。

規則：
1. **強制採用最高值**：如果搜尋結果有衝突，請無條件採用數值最大的「已播影片」集數。例如：搜尋到 160 與 210，且 210 標明為影片或在影視站上架，就填 210。
2. **嚴禁預測未來**：只回報「現在已經看得到」的集數，不要回報預告資訊。
3. **格式一致性**：回報格式必須與目前進度（如「第 X 季 第 Y 集」）完全一致。
4. **參考目前進度**：如果搜尋到的最大值小於目前進度，則維持目前進度。
5. 僅回傳純 JSON 格式：{"updates": [{"name": "名稱", "latest": "數字或狀態"}]}。

清單：
${animations.map((a) => `${a.name} (目前: ${a.current})`).join("\n")}`;

  let lastError: any = null;

  // 遍歷模型列表進行重試
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        // 正式啟用 Google Search 工具以獲取實時數據
        tools: [
          {
            // @ts-ignore
            googleSearch: {},
          },
        ],
      } as any);

      const generationConfig = {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      };

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });

      const response = await result.response;
      let text = response.text();

      // 清理可能的 JSON Markdown 標籤
      const cleanedText = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanedText) as AIResponse;

      // 簡單校驗回傳格式
      if (!parsed.updates || !Array.isArray(parsed.updates)) {
        throw new Error("AI 回傳格式不正確");
      }

      return parsed;

    } catch (error: any) {
      console.warn(`Model ${modelName} failed, trying next... Error:`, error.message);
      lastError = error;

      const errMsg = error.message?.toLowerCase() || "";
      // 如果是 429, 503 或配額問題，則繼續嘗試下一個模型
      if (errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("too many")) {
        continue;
      }

      // 其他嚴重錯誤則直接拋出
      throw error;
    }
  }

  throw lastError || new Error("所有 AI 模型均無法提供服務，請稍後再試。");
}

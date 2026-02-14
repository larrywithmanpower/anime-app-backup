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
  const prompt = `今天是 ${today}。你的任務是利用 Google 搜尋下列動畫在「劇迷 Gimy」、「YouTube」或「age動漫」等網站上的最新已播出集數。

極重要邏輯：
1. **取全國網最高值**：不要理會官方(如騰訊)標註的「季集數」(如 160)，必須回傳網路上能找到的最高「總累計集數」(如 210)。只要數值較大且已播出，就採用。
2. **區分版本**：只要是影片形式的已播出內容，數值最高的即為最新。嚴禁回報預告、小說章節。
3. **嚴格 JSON 格式**：僅回傳 JSON 格式，不准有任何其他文字或 Markdown 標籤。

輸出格式：{"updates": [{"name": "名稱", "latest": "數字或狀態"}]}

動畫清單與目前進度：
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
        maxOutputTokens: 4096, // 提高上限避免碎片化輸出
        // 注意：啟用 Google Search Tool 時暫不支援 responseMimeType: "application/json"
      };

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });

      const response = await result.response;
      let text = response.text();

      // 第一步：清空所有 Markdown 代碼塊標記
      let sanitizedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

      // 第二步：「括號平衡解析」技術 - 尋找第一個完整的 JSON 物件區塊
      // 這樣即便 AI 在後面重複輸出或產生雜訊，我們也只取第一個合法的 JSON 塊
      let balancedJson = "";
      const startIdx = sanitizedText.indexOf('{');
      if (startIdx !== -1) {
        let depth = 0;
        for (let i = startIdx; i < sanitizedText.length; i++) {
          if (sanitizedText[i] === '{') depth++;
          else if (sanitizedText[i] === '}') depth--;

          if (depth === 0) {
            balancedJson = sanitizedText.substring(startIdx, i + 1);
            break;
          }
        }
      }

      // 如果沒找到平衡括號，則回退到原本的邏輯
      const finalJson = balancedJson || sanitizedText;

      try {
        const parsed = JSON.parse(finalJson) as AIResponse;

        if (!parsed.updates || !Array.isArray(parsed.updates)) {
          throw new Error("AI 回傳格式不正確");
        }

        return parsed;
      } catch (parseError) {
        console.error("JSON Parse Error. Raw:", text, "Extracted:", finalJson);
        throw new Error("AI 回傳了損壞的格式，正在嘗試切換模型重試...");
      }

    } catch (error: any) {
      console.warn(`Model ${modelName} failed, trying next... Error:`, error.message);

      let friendlyMessage = error.message;
      const errMsg = error.message?.toLowerCase() || "";

      // 錯誤訊息中文化轉譯層
      if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("too many requests")) {
        friendlyMessage = `模型 ${modelName} 回報次數已上限`;
      } else if (errMsg.includes("503") || errMsg.includes("unavailable")) {
        friendlyMessage = `模型 ${modelName} 暫時繁忙`;
      } else if (errMsg.includes("403") || errMsg.includes("api key") || errMsg.includes("invalid")) {
        friendlyMessage = "API 金鑰無效或受限";
      } else if (errMsg.includes("json") || errMsg.includes("format") || errMsg.includes("parse")) {
        friendlyMessage = "AI 回傳格式異常";
      }

      lastError = new Error(friendlyMessage);

      // 如果是配額或繁忙問題，則繼續嘗試下一個模型
      if (errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("too many") || friendlyMessage.includes("格式異常")) {
        continue;
      }

      // 其他嚴重錯誤則直接拋出
      throw lastError;
    }
  }

  throw lastError || new Error("所有 AI 模型均無法提供服務，請稍後再試。");
}

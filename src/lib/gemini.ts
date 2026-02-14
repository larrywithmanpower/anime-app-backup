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

// 安全診斷：僅在瀏覽器端檢查金鑰是否存在，不外洩內容
if (typeof window !== "undefined") {
  if (!API_KEY) {
    console.warn("⚠️ [AI Debug] 偵測到 API 金鑰為空。請檢查 GitHub Secrets 是否正確設定並推送到 Actions。");
  } else {
    console.log(`✅ [AI Debug] API 金鑰已載入，長度為: ${API_KEY.length} 字元。`);
  }
}

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

核心邏輯 (重要)：
1. **格式繼承 (極重要)**：你必須觀察「目前進度」的文字格式。如果目前進度是「第 1 季 第 160 集」，回傳時必須也使用「第 X 季 第 Y 集」的格式，僅更動數字。如果格式是純集數「160」，就回傳純數字。
2. **取最高累計值**：忽略官方分季標籤，抓取網路上能找到的最高「總累計集數」(如將 1 季 160 集更正為 1 季 210 集)。只要數值較大且已播出，就採用。
3. **區分版本**：只要是影片形式的已播出內容，數值最高的即為最新。嚴禁回報預告、小說章節。
4. **輸出限制**：僅回傳 JSON 格式，不准有任何其他文字。格式：{"updates": [{"name": "名稱", "latest": "相同格式的最新集數"}]}

動畫清單與目前進度（請參考格式）：
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

      // 第二步：「深度掃描解析」與「自動修復」技術
      const allStarts = [];
      for (let i = 0; i < sanitizedText.length; i++) {
        if (sanitizedText[i] === '{') allStarts.push(i);
      }

      // 定義一個修復函式，嘗試補齊截斷的 JSON
      const tryParseWithRepair = (jsonStr: string): AIResponse | null => {
        const repairs = ["", "}", "]}", "]} }", "]} ] }"];
        for (const suffix of repairs) {
          try {
            const parsed = JSON.parse(jsonStr + suffix) as AIResponse;
            if (parsed && Array.isArray(parsed.updates)) return parsed;
          } catch (e) { }
        }
        return null;
      };

      for (const start of allStarts) {
        let depth = 0;
        let foundMatch = false;
        for (let j = start; j < sanitizedText.length; j++) {
          if (sanitizedText[j] === '{') depth++;
          else if (sanitizedText[j] === '}') depth--;

          if (depth === 0) {
            const candidate = sanitizedText.substring(start, j + 1);
            const parsed = tryParseWithRepair(candidate);
            if (parsed) return parsed;
            foundMatch = true;
            break;
          }
        }

        // 如果這個開始位址 $\{起點\}$ 沒找到配對的 $\}$, 且已經到文本末尾，嘗試「截斷修復」
        if (!foundMatch && depth > 0) {
          const candidate = sanitizedText.substring(start);
          const parsed = tryParseWithRepair(candidate);
          if (parsed) return parsed;
        }
      }

      // 第三步：嘗試直接修復解析整個文本
      const finalParsed = tryParseWithRepair(sanitizedText);
      if (finalParsed) return finalParsed;

      console.warn(`[AI] 模型 ${modelName} 內容解析失敗，進入備援循環...`);
      continue;

    } catch (error: any) {
      // 靜默捕捉所有錯誤（包括 403, 429, 503 等），直到所有模型都嘗試過
      console.warn(`[AI] 模型 ${modelName} 發生錯誤:`, error.message);
      lastError = error;
      continue;
    }
  }

  // 只有當所有模型都嘗試過且都失敗時，才向使用者報錯
  throw lastError || new Error("AI 服務連線較擁擠，請稍後再試。");
}

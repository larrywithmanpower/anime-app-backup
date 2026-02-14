import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { animations } = await req.json();
    const today = new Date().toLocaleDateString('zh-TW');

    if (!animations || !Array.isArray(animations)) {
      return NextResponse.json({ error: "Invalid animations list" }, { status: 400 });
    }

    // Use gemini-2.0-flash-lite as requested (or flash)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Using 2.5 Flash as requested by user
      tools: [
        {
          // @ts-ignore: google_search is required for 2.5 models but might not be in older SDK types
          googleSearch: {},
        },
      ],
    });

    const prompt = `你是一個專業的影視數據抓取助手。
今天是 ${today}。
任務：利用 Google 搜尋查詢清單中作品的「已播出」最新集數（針對台灣/中文圈的官方進度）。

規則：
1. **嚴禁預測未來集數**：只回報「已經播出」的集數。不要回報預告、預演或下週預期的集數。
2. **格式一致性**：如果目前進度使用「第 X 季 第 Y 集」或「S2 E10」等格式，請務必以此**完全相同的格式**回報最新集數。
3. **參考目前進度**：我會提供目前的集數。如果搜尋到的最新集數等於或小於目前進度，請回報目前進度的數字。
4. **模糊搜尋**：如果搜尋不到精確名稱，請嘗試搜尋系列名稱（例如「仙逆」搜尋「仙逆 動畫」）。
5. **若完全查不到資料**：如果 Google 搜尋不到任何確定的已播出集數資訊，請在 latest 欄位填入「搜尋失敗」。
6. 僅回傳 JSON 格式：{"updates": [{"name": "名稱", "latest": "數字或狀態"}]}。name 必須與清單完全一致。

清單（包含目前進度）：
${animations.map((a: any) => `${a.name} (目前: ${a.current})`).join("\n")}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();


    // Clean up potential JSON markdown block
    const cleanedText = text.replace(/```json|```/g, "").trim();

    try {
      const data = JSON.parse(cleanedText);
      return NextResponse.json(data);
    } catch (parseError) {
      console.error("JSON Parse Error:", cleanedText);
      return NextResponse.json({ error: "Failed to parse AI response", raw: cleanedText }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

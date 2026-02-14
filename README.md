# 📺 Anime Tracker (Next.js + Google Sheets)

**🔗 Live Demo:** [https://larrywithmanpower.github.io/anime-app-backup/](https://larrywithmanpower.github.io/anime-app-backup/)

這是一個極簡、美觀且強大的動畫追蹤應用程式。它使用 **Next.js** 驅動前端，並以 **Google Sheets** 作為資料庫（透過 Google Apps Script 連接）。

## ✨ 功能亮點

- **多帳號支援**：支援建立多個獨立帳號（分頁），資料互不干擾。
- **AI 自動追蹤**：整合 Google 第二代雙魚座 (Gemini) 模型，對收藏項目進行全網自動集數更新檢查。
- **紅色呼吸燈提醒**：當 AI 偵測到新集數時，會以醒目的紅色呼吸燈紅點與標籤通知。
- **排版優化與交互**：自動截斷長標題以維持排版整齊，支援「點擊展開」查看完整名稱。
- **收藏過濾**：僅針對點亮「星號」的作品進行 AI 搜尋，節省資源並精確追蹤。

---

## 🛠️ 使用說明

### 1. 帳號管理
- **登入/建立**：
    - 在首頁輸入您想要的名稱（例如：`larry`）點擊**登入**。
    - 若帳號不存在，可點擊「建立新帳號」，系統會自動在 Google Sheets 建立對應分頁。
- **刪除帳號**：
    - 點擊標題下方的「[ 註銷帳號 ]」。
    - **注意**：這會永久刪除 Google Sheets 中該分頁的所有資料。

### 2. 動畫追蹤
- **新增項目**：點擊右上角的 `+` 按鈕。
- **收藏與 AI 檢查**：
    - 點選動畫標題旁的 **「星號」** 將其納入追蹤清單。
    - 點擊右上角 **「紫色雷達圖示」** 啟動 AI 檢查。
- **查看長名稱**：若名稱被截斷，**直接點擊動畫標題** 即可展開顯示完整名稱，再次點擊可收合。
- **更新提示**：若出現 **紅色呼吸燈**，代表 AI 發現了比您目前進度更新的集數。
- **修改名稱**：點擊動畫標題旁的「筆」圖示。
- **刪除項目**：點擊卡片右側的小垃圾桶。

---

## 🚀 部署指南 (GitHub Pages)

### 第一步：在 GitHub 設定環境變數
1. 進入 GitHub Repo 的 **Settings > Secrets and variables > Actions**。
2. 建立新 Secret：
   - **Name**: `NEXT_PUBLIC_APPS_SCRIPT_URL`
   - **Value**: (您的 Google Apps Script 網頁應用程式 URL)

### 第二步：推送程式碼
```bash
git add .
git commit -m "deploy: finalize project for github pages"
git push origin main
```

### 第三步：啟用 GitHub Actions 部署
1. 進入 Repo 的 **Settings > Pages**。
2. **Build and deployment > Source** 選擇 **GitHub Actions**。
3. 稍等幾分鐘，Action 運行綠燈後即可在提供的 URL 查看網頁。

---

## 📝 技術備份
- **Google Apps Script** 原始碼備份於專案根目錄的 `apps-script-code.gs`。
- 本專案已開啟 **Static Export** 模式，請勿手動移除 `next.config.ts` 中的 `output: 'export'`。

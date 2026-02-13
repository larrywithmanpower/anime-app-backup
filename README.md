# 📺 Anime Tracker (Next.js + Google Sheets)

這是一個極簡、美觀且強大的動畫追蹤應用程式。它使用 **Next.js** 驅動前端，並以 **Google Sheets** 作為資料庫（透過 Google Apps Script 連接）。

## ✨ 功能亮點

- **多帳號支援**：支援建立多個獨立帳號（分頁），資料互不干擾。
- **靈活進度**：進度欄位支援自由文字輸入（例如：「第一季 完」、「第 5 話」）。
- **快速操作**：一鍵增減集數、隨時修改動畫名稱。
- **安全防護**：刪除帳號/項目皆有二次確認機制，並具備資料庫標題列保護。
- **完全靜態**：專為 GitHub Pages 優化，無需伺服器維護。

---

## 🛠️ 使用說明

### 1. 帳號管理
- **登入/建立**：
    - 在首頁輸入您想要的名稱（例如：`larry`）點擊**登入**。
    - 若帳號不存在，可點擊「建立新帳號」，系統會自動在 Google Sheets 建立對應分頁。
- **刪除帳號**：
    - 點擊標題下方的紅色垃圾桶圖示。
    - **注意**：這會永久刪除 Google Sheets 中該分頁的所有資料。

### 2. 動畫追蹤
- **新增項目**：點擊右上角的 `+` 或畫中央的大按鈕，輸入動畫名稱即可。
- **更新進度**：
    - 點擊 `-` 或 `+` 按鈕進行數字調整。
    - 點擊中間的進度文字直接進行輸入。
- **修改名稱**：點擊動畫標題旁的「筆」圖示進行編輯。
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

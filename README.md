# 📺 追番進度 (Next.js + Google Sheets)

**🔗 Live Demo:** [https://larrywithmanpower.github.io/anime-app-backup/](https://larrywithmanpower.github.io/anime-app-backup/)

動畫、日韓歐美劇、漫畫的追看進度管理。前端 **Next.js**（static export），資料庫是 **Google Sheets**（透過 Google Apps Script 連接），作品資訊來自 **Bangumi**。全部走免費額度，沒有自建後端、沒有 API 金鑰。

## ✨ 功能

- **搜尋新增**：輸入名稱自動搜尋 Bangumi，選中後帶入封面、總集數與類型；搜不到可手動建立
- **狀態分類**：在追 / 待看 / 完結 / 棄追，預設只顯示「在追」，清單再多也不會被淹沒
- **進度條**：填了總集數就顯示 `8 / 24` 與進度條，追平時直接給「標為完結」
- **快速觀看**：存 gimy 網址後，卡片的「看」會自動帶下一集；換網域只要改設定裡的一個值
- **秒開**：先用本機快取渲染，再背景同步雲端
- **多帳號**：每個帳號對應一張 Sheet 分頁，資料互不干擾

## 🛠️ 使用說明

### 帳號
- 首頁輸入名稱登入；不存在可點「建立新帳號」，會自動建立對應的 Sheets 分頁
- 登出與註銷都在右上角 ⚙ 設定裡

### 記錄進度
- 卡片上的 `＋` `－` 或直接輸入數字，連按只會送出最後一次
- 搜尋會**跨全部狀態**尋找，不受目前篩選影響
- 看完的作品改成「完結」而不是刪除，之後還查得到

### 觀看連結
- 編輯作品時貼上 gimy 作品頁網址，卡片會出現「看」直接跳下一集
- 其他平台網址也能貼，只是不會自動帶集數
- gimy 換網域時到 ⚙ 設定改一次即可全部生效（設定存在本機，換裝置要重設）

## 🚀 部署

### 1. GitHub Secret
Repo **Settings > Secrets and variables > Actions** 新增：
- Name: `NEXT_PUBLIC_APPS_SCRIPT_URL`
- Value: 你的 Google Apps Script 網頁應用程式 URL

### 2. 推送
Push 到 `main` 會觸發 `.github/workflows/nextjs.yml` 自動建置並發佈到 GitHub Pages。
（Repo **Settings > Pages > Source** 需選 **GitHub Actions**）

### 3. 部署 Apps Script（改動 `.gs` 時必做）
1. 開 [script.google.com](https://script.google.com) 找到對應專案
2. 貼上 `apps-script-code.gs` 的內容
3. **部署 > 管理部署 > 編輯（鉛筆）> 版本：全新版本 > 部署**

## 📝 技術備註

- 本機開發需在 `.env.local` 設定 `NEXT_PUBLIC_APPS_SCRIPT_URL`
- 已開啟 **Static Export**，請勿移除 `next.config.js` 的 `output: 'export'`
- Sheets schema 為 9 欄，欄位順序與相容性說明見 `CLAUDE.md`

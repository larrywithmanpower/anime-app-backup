# 📺 追番進度 (Next.js + Google Sheets)

**🔗 Live Demo:** [https://larrywithmanpower.github.io/anime-app-backup/](https://larrywithmanpower.github.io/anime-app-backup/)

動畫、日韓歐美劇、漫畫的追看進度管理。前端 **Next.js**（static export），資料庫是 **Google Sheets**（透過 Google Apps Script 連接），作品資訊來自 **Bangumi**，播出排程來自 **TVmaze**。全部走免費額度，沒有自建後端、沒有 API 金鑰。

## ✨ 功能

- **搜尋新增**：輸入名稱自動搜尋 Bangumi，選中後帶入封面、總集數與類型；搜不到可手動建立
- **狀態分類**：在追 / 待看 / 完結 / 棄追，預設只顯示「在追」，清單再多也不會被淹沒
- **進度條**：綁定排程後顯示 `88 / 90`（分母是已播集數），追到最新一集 `＋` 就停用
- **播出排程**：綁 TVmaze 後每天自動更新下一集日期，卡片直接標「08.21 更新」
- **完結提示**：追完整季（依 TVmaze 的本季總集數，含尚未播出的）才給「標為完結」
- **新季偵測**：完結的作品出了新一季會在卡片上提示，點一下就能帶著排程加進清單
- **行事曆提醒**（選用）：每天把近 14 天的更新寫進 Google 日曆的「追番」行事曆
- **快速觀看**：存 gimy 網址後，卡片的「看」會自動帶下一集；換網域只要改設定裡的一個值
- **秒開 / 離線**：先用本機快取渲染再背景同步；Service Worker 讓離線也開得起來（PWA 可加到桌面）
- **多帳號**：每個帳號對應一張 Sheet 分頁，資料互不干擾

## 🛠️ 使用說明

### 帳號
- 首頁輸入名稱登入；不存在可點「建立新帳號」，會自動建立對應的 Sheets 分頁
- 登出與註銷都在右上角 ⚙ 設定裡

### 記錄進度
- 卡片上的 `＋` `－` 或直接輸入數字，連按 1.5 秒內只會送出最後一次
- `＋` 加到已播的最新一集就停用（追不到還沒播的集數）；真的要超過就直接改輸入框
- 搜尋會**跨全部狀態**尋找，不受目前篩選影響
- 看完的作品改成「完結」而不是刪除，之後還查得到

### 播出排程與行事曆
- 編輯作品 →「找播出排程」搜 TVmaze，選對的那一部綁定，之後每天自動更新下一集日期
- 刻意不自動配對：同名不同季配錯會每天推錯的提醒，比沒有提醒更糟
- 中文搜不到很正常（TVmaze 對日番只收英文名），系統會自動拿 Bangumi 的別名再試一次
- 行事曆提醒在 ⚙ 設定裡開關，寫進的是專案擁有者的 Google 日曆，因此只對指定帳號顯示

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
- 已開啟 **Static Export**，請勿移除 `next.config.mjs` 的 `output: 'export'`（必須是 `.mjs`，Serwist 只出 ESM）
- 建置指令必須帶 `--webpack`：Serwist 的 plugin mode 不支援 Next 16 預設的 Turbopack
- Sheets schema 為 13 欄，欄位順序、`D`（已播集數）與 `M`（本季總集數）的分工說明見 `CLAUDE.md`
- GAS 的 `/exec` 會間歇性回 404（約 8 次 1 次），因此 GET 一律重試、冪等的寫入也會重試一次
- GAS 端的每日排程更新需在編輯器手動執行一次 `setupDailyTrigger()` 建立觸發器

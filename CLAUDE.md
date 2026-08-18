# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用指令

```bash
npm run dev     # 啟動本地開發伺服器（basePath 為空）
npm run build   # 建置並輸出靜態站至 out/（GitHub Actions 使用）
npm run start   # 啟動正式模式伺服器（此專案採 static export，一般用不到）
npm run lint    # ESLint（flat config，使用 eslint-config-next）
```

本專案 **沒有測試框架**；lint 為唯一自動化檢查。

## 部署

- Push 到 `main` 會觸發 `.github/workflows/nextjs.yml`，以 Next.js static export 建置後發佈到 GitHub Pages
- CI 會注入 Secret 環境變數：`NEXT_PUBLIC_APPS_SCRIPT_URL`
- 本機開發需在 `.env.local` 設定同名變數
- `deploy.sh` 僅初始化 git remote 並 push，不是部署流程本身

## 整體架構

此專案是一個 **純前端 + 無伺服器後端** 的追番應用，不存在自建後端。資料流如下：

```
Browser (Next.js static)  ──► Google Apps Script Webhook  ──► Google Sheets
```

### 兩層關鍵理解

1. **後端即 Google Apps Script**：`apps-script-code.gs` 是整個後端，部署於 Google。前端所有 CRUD 都打 `NEXT_PUBLIC_APPS_SCRIPT_URL`（`GET ?action=getSheets|...` 與 `POST` body `{action, sheet, ...}`）。修改 `.gs` 後必須在 GAS 後台手動「部署 > 管理部署 > 編輯 > 版本：全新版本」才會生效。
2. **Google Sheets 當資料庫**：每個「帳號」對應一張 sheet 分頁，固定 9 欄 schema：
   - A=`最後更新時間`、B=`作品名稱`、C=`目前進度`、D=`總集數`、E=`狀態`
   - F=`觀看連結`、G=`封面圖`、H=`BangumiID`、I=`類型`
   - 第 1 列為表頭（凍結），`rowNumber`（實際 Sheet 列號，從 2 起算）是前端做更新的唯一定位鍵，比名稱比對更可靠
   - 改欄位順序會連鎖破壞 `getSheetData` 與 `useAnimeList` 的 index 映射
   - **舊帳號相容**：D 欄原為「最新進度(AI)」、E 欄原為「追蹤(TRUE/FALSE)」，已改用途。GAS 的 `ensureSchema()` 會在讀取時自動補欄位與表頭；前端 `parseTotalEpisodes`（只收純數字）與 `parseStatus`（只收 4 個合法值，其餘回退 `watching`）負責寬鬆解析殘留值，不需要手動清資料

3. **作品資料源是 Bangumi（bgm.tv）**：`src/lib/bangumi.ts`，匿名呼叫、無金鑰、CORS 全開。
   - 選它而非 AniList 的理由：實測中文命中率遠高（迷宮飯 / 鏈鋸人 / 凡人修仙傳在 AniList 皆搜不到），且同一支 API 涵蓋動畫（type 2）、日韓歐美陸台劇（type 6）、漫畫（type 1）
   - API 要求帶 User-Agent，瀏覽器自動帶，不需（也不能）手動設定
   - 搜尋結果會依 `TYPE_PRIORITY` 重排成「動畫 → 劇集 → 書籍」，否則廣播劇、畫集會蓋過本篇
   - 回傳為簡體中文名，新增流程刻意讓使用者能改寫；搜不到（如繁簡用字差異的「瑯琊榜」）一律可手動建立

### 前端結構

- `src/app/page.tsx`：唯一頁面，純 orchestration 層，把兩個 hook 的狀態與元件串起來
- `src/hooks/useAccounts.ts`：登入/帳號 CRUD、`localStorage.lastAccount` 快速啟動
- `src/hooks/useAnimeList.ts`：清單的全部狀態（清單、modal 開關、搜尋、排序、狀態篩選、樂觀更新、toast）
- `src/lib/bangumi.ts`：Bangumi 搜尋封裝
- `src/lib/watchUrl.ts`：gimy 網址解析與重組（網域存 `localStorage.gimyDomain`）
- `src/components/Modal.tsx`：所有彈窗的共用外殼（遮罩、Esc 關閉、`fieldClass` / `labelClass` 表單樣式）
- `src/components/*`：純展示 + modal 元件
- `src/types/anime.ts`：`AnimeItem`、`WatchStatus`、`CATEGORIES`，以及 `parseStatus` / `parseTotalEpisodes` 兩個舊資料容錯函式

### 視覺約定

- 極簡工具風：`#09090b` 中性深灰底 + 單一 indigo 強調色，**不用** webfont（中文 webfont 動輒數 MB，是首屏最大拖累）
- 色彩 token 定義在 `globals.css` 的 `@theme inline`：`bg` / `surface` / `surface-hi` / `line` / `line-hi` / `accent` / `text` / `dim` / `faint` / `danger` / `success` / `warn`
- 數字（進度、集數）加 `.tnum` 讓寬度穩定，避免 +1 時版面跳動

### 靜態輸出限制

- `next.config.js` 設定 `output: 'export'`、`basePath` 在 production 為 `/anime-app-backup`、`images.unoptimized: true`
- 因此：**不可使用** Next.js server-only 功能（Route Handlers 在執行期、`revalidate`、`dynamic = 'force-dynamic'` 等）
- `manifest.ts` 必須保留 `export const dynamic = 'force-static'`
- 所有私密金鑰一律走 `NEXT_PUBLIC_` 前綴直接打包進 bundle，沒有伺服器端可藏（這是設計取捨，不是 bug）

### 狀態同步模式

`useAnimeList` 普遍使用「本地樂觀更新 + 背景發 POST」：先改 `list` state，才呼叫 GAS。失敗時 `pushToast` 明確提示並 `fetchData()` 重抓真實狀態覆蓋——**不可退回靜默 catch**，那會造成「畫面顯示已更新、雲端其實沒存」的資料遺失。新增與刪除因為牽動 `rowNumber`，一律「POST 成功後再 refetch」。

三個效能關鍵，改動時不要拆掉：

1. **本機快取秒開**：登入時先讀 `localStorage[animeCache:<帳號>]` 直接渲染，再背景 `fetchData()` 覆蓋。GAS 冷啟動要 1～3 秒，這是「開 App 很慢」的唯一有效解法
2. **進度 debounce 500ms**：`scheduleProgressSave` 讓連按 +/- 只送最後一次；`visibilitychange` 與 `pagehide` 會 `flushPendingProgress()` 補送，避免按完就切走沒存到
3. **`displayOrder` 順序快照**：只在載入清單或切換排序時重算，中途改進度不重排，否則卡片會在手指底下跳位

### 篩選行為

預設只顯示「在追」。**有搜尋關鍵字時忽略狀態篩選、跨全部狀態找**——否則搜已完結的作品會找不到。

## 重點注意事項

- React Compiler 已開啟（`next.config.js` 的 `reactCompiler: true`）；避免手動 `useMemo/useCallback` 除非確定有必要
- ESLint 的 `react-hooks/set-state-in-effect` 會擋掉 effect 內同步 setState，`hasMounted` 那類防 hydration 的舊 pattern 不能再用（`initializing` 初始為 true 已足以讓 SSR 與首次 client render 一致）
- TypeScript path alias：`@/*` → `./src/*`
- 修改 GAS schema 時務必同步三處：`apps-script-code.gs` 的 `HEADERS` / `COLUMN_COUNT`、`useAnimeList.ts` 的 `mapRows` index 映射、`updateMeta` 的 `fields` 欄位對照
- `package.json` 裡的 `next-pwa` 是**死依賴**——`next.config.js` 沒有 `withPWA()` 包起來，實際上沒有 service worker，只有 manifest（可加到主畫面）。離線讀取是靠上面的 localStorage 快取達成的
- AI 自動檢查最新集數的功能已移除（原因：Gemini + Google Search 對中文動畫集數準確度不足），現由 Bangumi 搜尋在新增時一次帶入總集數取代

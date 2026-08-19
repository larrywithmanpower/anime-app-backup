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
- GAS 端的每日排程更新（`refreshSchedule`）需在 GAS 編輯器手動執行一次 `setupDailyTrigger()` 建立觸發器；首次執行會要求授權 `UrlFetchApp` 與 `CalendarApp`

## 整體架構

此專案是一個 **純前端 + 無伺服器後端** 的追番應用，不存在自建後端。資料流如下：

```
Browser (Next.js static)  ──► Google Apps Script Webhook  ──► Google Sheets
```

### 兩層關鍵理解

1. **後端即 Google Apps Script**：`apps-script-code.gs` 是整個後端，部署於 Google。前端所有 CRUD 都打 `NEXT_PUBLIC_APPS_SCRIPT_URL`（`GET ?action=getSheets|...` 與 `POST` body `{action, sheet, ...}`）。修改 `.gs` 後必須在 GAS 後台手動「部署 > 管理部署 > 編輯 > 版本：全新版本」才會生效。
2. **Google Sheets 當資料庫**：每個「帳號」對應一張 sheet 分頁，固定 13 欄 schema：
   - A=`最後更新時間`、B=`作品名稱`、C=`目前進度`、D=`總集數`、E=`狀態`
   - F=`觀看連結`、G=`封面圖`、H=`BangumiID`、I=`類型`
   - J=`TVmazeID`、K=`下一集日期`、L=`下一集資訊`、M=`本季總集數`
   - J 由使用者在前端手動綁定；K / L 由 GAS 的 `refreshSchedule()` 每日回填，前端只讀（綁定當下那一次除外）
   - K 欄在 `ensureSchema` 被設成純文字格式。**不要拿掉**：讓 Sheets 認成日期的話，讀出來是 Date 物件、JSON 化後變 UTC，前端整整差一天（`useAnimeList` 的 `parseAirdate` 是第二道防線）
   - 第 1 列為表頭（凍結），`rowNumber`（實際 Sheet 列號，從 2 起算）是前端做更新的唯一定位鍵，比名稱比對更可靠
   - 改欄位順序會連鎖破壞 `getSheetData` 與 `useAnimeList` 的 index 映射
   - **舊帳號相容**：D 欄原為「最新進度(AI)」、E 欄原為「追蹤(TRUE/FALSE)」，已改用途。GAS 的 `ensureSchema()` 會在讀取時自動補欄位與表頭；前端 `parseTotalEpisodes`（只收純數字）與 `parseStatus`（只收 4 個合法值，其餘回退 `watching`）負責寬鬆解析殘留值，不需要手動清資料

3. **作品資料源是 Bangumi（bgm.tv）**：`src/lib/bangumi.ts`，匿名呼叫、無金鑰、CORS 全開。
   - 選它而非 AniList 的理由：實測中文命中率遠高（迷宮飯 / 鏈鋸人 / 凡人修仙傳在 AniList 皆搜不到），且同一支 API 涵蓋動畫（type 2）、日韓歐美陸台劇（type 6）、漫畫（type 1）
   - API 要求帶 User-Agent，瀏覽器自動帶，不需（也不能）手動設定
   - 搜尋結果會依 `TYPE_PRIORITY` 重排成「動畫 → 劇集 → 書籍」，否則廣播劇、畫集會蓋過本篇
   - 回傳為簡體中文名，新增流程刻意讓使用者能改寫；搜不到（如繁簡用字差異的「瑯琊榜」）一律可手動建立

4. **播出排程資料源是 TVmaze**：`src/lib/tvmaze.ts`，同樣免金鑰、CORS 全開，限制是每 IP 每 10 秒 20 次。
   - 為什麼不用 Bangumi 的分集：它的播出日**只有日本動畫有**。實測凡人修仙傳 30 話 0 個播出日、吞噬星空 0 集、蒼蘭訣 36 話 0 個播出日、韓劇分集直接 404，而這些正是清單裡的大宗
   - 授權為 CC BY-SA，**必須標示來源**，因此 `ScheduleBinder` 保留連回 TVmaze 作品頁的連結，行事曆事件說明也帶了出處
   - 華語作品只收簡體，繁體關鍵字幾乎全落空，所以沿用 `t2s.ts` 繁簡並送
   - **刻意不做自動配對**：華語命中率大約只有一半，同名不同季很容易配錯，配錯會每天推錯的更新提醒，比沒有提醒更糟。沿用封面那套「列候選讓人選」
   - 絕對集數取的是分集清單的位置，不是 `season`/`number`——使用者追動畫記的是「第 188 集」，TVmaze 標的卻是 S8E12。`src/lib/tvmaze.ts` 與 `apps-script-code.gs` 各有一份 `pickNextEpisode`，改動要兩邊同步
   - 平常開 App **不會**打 TVmaze，只在綁定時打；清單上的下一集是 GAS 寫進 Sheet 的
   - **TVmaze 只收英文名**，中文關鍵字對日番一律 0 筆。`ScheduleBinder` 搜不到時會拿 `bangumiId` 去 `fetchAltNames()` 撈原文名與「别名」（Bangumi 的別名欄剛好收英文名），再用 `bareTitle()` 削掉「Season 2」「III」「-副標-」這類後綴重搜——TVmaze 收的是整部作品，帶季別後綴會整組落空（實測「Kaiju No. 8 Season 2」0 筆、去掉才中）。使用者照打中文即可
   - `countAiredEpisodes()` 算的是**已播集數**（`airdate <= today`），不是分集清單長度：TVmaze 連已公布未播的都收，拿它當分母會憑空多幾集。名稱有「第X季」就只算那一季（`parseSeasonFromName`），季別在 TVmaze 對不上時退回整部
   - **D 欄雖名為「總集數」，實際存的是已播集數**，且 `refreshSchedule` 每天覆蓋。代價是綁了 TVmaze 的作品手動改 D 欄隔天會被蓋回去
   - **M 欄「本季總集數」才是這一季總共要出幾集**（`countSeasonEpisodes`，不濾播出日），同樣每天覆蓋——TVmaze 只收已公布的集數，加播會讓它變大。兩欄分工：D 是進度條分母與 ＋ 的上限（追不到還沒播的集數），M 是「追完了沒」的判斷依據
   - 因此卡片上的「已追平 · 標為完結」看的是 M 不是 D：史萊姆已播 90 集、這季排到 96，追到 90 只是追上最新一集，不是完結。沒有 M（沒綁 TVmaze、手動建立）才退回「追平且沒有下一集」

5. **已完結作品的新季偵測**：`refreshSchedule` 連 `done` 的也掃（只跳過 `dropped`），但 K / L 欄改裝 `findNewSeasons()` 的結果而不是下一集。
   - 判定方式：TVmaze 分集裡有 `season >` 名稱解析出來的季別，就寫成「第 4 季 · 已開播 · 已播 7 集」這種提示
   - 完結的作品不寫行事曆提醒（`upsertReminder` 只在 `!done` 時呼叫）
   - 前端 `src/lib/newSeason.ts` 把提示反推成「該加進清單的那一季」：從 L 欄取最早的季號，依原名稱的寫法改寫（「一念永恆 第三季」→「一念永恆 第四季」，阿拉伯數字風格則保持阿拉伯數字）。名稱裡沒有「第X季」就不推導，避免生出「XXX 第四季 第四季」
   - 卡片上那個提示因此是可點的：點了開新增視窗、預填名稱與同一個 `tvmazeId`（一個 TVmaze 作品涵蓋所有季別），由使用者確認後才寫入。那一季已經在清單裡就退回純文字提示
   - 一次只推最早的一季；加進去之後那一季自己完結時會再提示下一季
   - `parseSeasonFromName` / `countAiredEpisodes` / `findNewSeasons` 在 `src/lib/tvmaze.ts` 與 `apps-script-code.gs` 各有一份，**改動要兩邊同步**

6. **行事曆提醒是可關的加值功能，預設關閉**：開關值存在 GAS 的 Script Properties（`calendarEnabled`），不是 localStorage——真正在讀它的是跑在 Google 那邊的每日觸發器。
   - 前端走 `src/lib/calendarSetting.ts`（`GET ?action=getSettings` / `POST {action:'updateSettings'}`）
   - 關閉時 `clearFutureReminders()` 只刪「追番」日曆上、說明欄以 `EVENT_MARKER` 開頭、且今天之後的事件，手動加的行程動不到
   - 開啟時 `writeRemindersFromSheet()` 直接讀 Sheet 既有的 K / L 欄補寫，不打 TVmaze
   - `refreshSchedule()` 無論開關都會更新 K / L，只有寫日曆那段受開關控制——卡片上的更新日期不該因為關掉提醒而消失

### 前端結構

- `src/app/page.tsx`：唯一頁面，純 orchestration 層，把兩個 hook 的狀態與元件串起來
- `src/hooks/useAccounts.ts`：登入/帳號 CRUD、`localStorage.lastAccount` 快速啟動
- `src/hooks/useAnimeList.ts`：清單的全部狀態（清單、modal 開關、搜尋、排序、狀態篩選、樂觀更新、toast）
- `src/lib/bangumi.ts`：Bangumi 搜尋封裝
- `src/lib/tvmaze.ts`：TVmaze 搜尋、「下一集」與已播集數計算
- `src/lib/newSeason.ts`：把 GAS 寫的新季提示反推成「該加進清單的那一季」
- `src/lib/gas.ts`：GAS webhook 的共用 GET / POST。`/exec` 端點會間歇性回 404（實測約 8 次 1 次，掛的是轉址到 `script.googleusercontent.com` 那段），所以 GET 一律重試一次；POST **預設不重試**（重送有機會寫入兩次），改由呼叫端自行決定要 refetch 還是回頭讀狀態。只有「把某一列的某幾格設成指定值」這種冪等動作（改進度 `update`、改狀態與編輯欄位 `updateMeta`）才帶 `{ idempotent: true }` 自動重試一次——不重試的話 8 次會有 1 次把使用者剛加的集數打回原值
- `src/lib/calendarSetting.ts`：行事曆開關的讀寫
- `src/lib/watchUrl.ts`：gimy 網址解析與重組（網域存 `localStorage.gimyDomain`）
- `src/components/ScheduleBinder.tsx`：TVmaze 綁定 UI，新增與編輯兩個 modal 共用
- `src/components/Modal.tsx`：所有彈窗的共用外殼（遮罩、Esc 關閉、`fieldClass` / `labelClass` 表單樣式）
- `src/components/*`：純展示 + modal 元件
- `src/types/anime.ts`：`AnimeItem`、`WatchStatus`、`CATEGORIES`，以及 `parseStatus` / `parseTotalEpisodes` 兩個舊資料容錯函式

### 視覺約定

- 極簡工具風：`#09090b` 中性深灰底 + 單一 indigo 強調色，**不用** webfont（中文 webfont 動輒數 MB，是首屏最大拖累）
- 色彩 token 定義在 `globals.css` 的 `@theme inline`：`bg` / `surface` / `surface-hi` / `line` / `line-hi` / `accent` / `text` / `dim` / `faint` / `danger` / `success` / `warn`
- 數字（進度、集數）加 `.tnum` 讓寬度穩定，避免 +1 時版面跳動

### 靜態輸出限制

- `next.config.mjs` 設定 `output: 'export'`、`basePath` 在 production 為 `/anime-app-backup`、`images.unoptimized: true`（必須是 `.mjs`：Serwist 只出 ESM，CommonJS 的 `require()` 載不動）
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

- React Compiler 已開啟（`next.config.mjs` 的 `reactCompiler: true`）；避免手動 `useMemo/useCallback` 除非確定有必要
- ESLint 的 `react-hooks/set-state-in-effect` 會擋掉 effect 內同步 setState，`hasMounted` 那類防 hydration 的舊 pattern 不能再用（`initializing` 初始為 true 已足以讓 SSR 與首次 client render 一致）
- TypeScript path alias：`@/*` → `./src/*`
- 修改 GAS schema 時務必同步四處：`apps-script-code.gs` 的 `HEADERS` / `COLUMN_COUNT`、`updateMeta` 的 `fields` 欄位對照、`addNewItem` 的 `values`、`useAnimeList.ts` 的 `mapRows` index 映射
- **Service worker 走 Serwist**（`src/app/sw.ts` + `next.config.mjs` 的 `withSerwistInit`），產物 `public/sw.js` 是建置時生成、已進 `.gitignore`：
  - 建置指令必須帶 `--webpack`（`package.json` 與 `.github/workflows/nextjs.yml` 各有一份）。Serwist 的 plugin mode 不支援 Next 16 預設的 Turbopack；dev 因為 `disable: !isProd` 關掉 SW，所以還是跑 Turbopack
  - `swUrl` 會被自動套上 `basePath`，**不能自己加**（會變成 `/repo/repo/sw.js`）；`scope` 不會自動套，**必須手動帶** `${basePath}/`，因為子路徑下的 SW 無法宣告根目錄 scope
  - `navigationPreload` 必須關掉，且要自己補一條 `request.mode === 'navigate'` 的 NetworkFirst 規則。`defaultCache` 的 pages 規則比對 `Content-Type: text/html`，但瀏覽器的導覽請求根本不帶這個 header，那條規則永遠不會命中，離線重整會直接 ERR_FAILED
- 離線讀取有兩層：Serwist 快取頁面與靜態資源，清單資料仍靠 `localStorage` 快取
- AI 自動檢查最新集數的功能已移除（原因：Gemini + Google Search 對中文動畫集數準確度不足），現由 Bangumi 搜尋在新增時一次帶入總集數取代

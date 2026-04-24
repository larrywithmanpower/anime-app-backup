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
2. **Google Sheets 當資料庫**：每個「帳號」對應一張 sheet 分頁，固定 5 欄 schema：
   - A=`最後更新時間`、B=`作品名稱`、C=`目前進度`、D=`最新進度(AI)`、E=`追蹤`（TRUE/FALSE）
   - 第 1 列為表頭（凍結），`rowNumber`（實際 Sheet 列號，從 2 起算）是前端做更新的唯一定位鍵，比名稱比對更可靠
   - 改欄位順序會連鎖破壞 `getSheetData` 與 `useAnimeList` 的 index 映射
   - D、E 欄是 AI 檢查功能的遺留欄位（目前前端未使用），GAS 仍維護它們以保持 schema 相容

### 前端結構

- `src/app/page.tsx`：唯一頁面，純 orchestration 層，把兩個 hook 的狀態與元件串起來
- `src/hooks/useAccounts.ts`：登入/帳號 CRUD、`localStorage.lastAccount` 快速啟動
- `src/hooks/useAnimeList.ts`：動畫清單的全部狀態（清單、modal 開關、搜尋、排序、AI 檢查、樂觀更新）
- `src/components/*`：純展示 + modal 元件
- `src/types/anime.ts`：`AnimeItem` 單一介面（`latest`、`favorite` 欄位是 AI 功能遺留，目前未使用）

### 靜態輸出限制

- `next.config.js` 設定 `output: 'export'`、`basePath` 在 production 為 `/anime-app-backup`、`images.unoptimized: true`
- 因此：**不可使用** Next.js server-only 功能（Route Handlers 在執行期、`revalidate`、`dynamic = 'force-dynamic'` 等）
- `manifest.ts` 必須保留 `export const dynamic = 'force-static'`
- 所有私密金鑰一律走 `NEXT_PUBLIC_` 前綴直接打包進 bundle，沒有伺服器端可藏（這是設計取捨，不是 bug）

### 狀態同步模式

`useAnimeList` 普遍使用「本地樂觀更新 + 背景發 POST」：`handleProgressUpdate`、`handleToggleFavorite`、`handleInputChange` 先改 `list` state，才呼叫 GAS。失敗時 `fetchData()` 會重抓真實狀態覆蓋。新增項目因需要拿到 `rowNumber`，採取「POST 成功後再 refetch」。

## 重點注意事項

- React Compiler 已開啟（`next.config.js` 的 `reactCompiler: true`）；避免手動 `useMemo/useCallback` 除非確定有必要
- TypeScript path alias：`@/*` → `./src/*`
- 修改 GAS schema 時務必同步 `useAnimeList.ts` 裡的 `rawData` 欄位 index 映射
- AI 自動檢查最新集數的功能已移除（原因：Gemini + Google Search 對中文動畫集數準確度不足）。若未來要重做，建議評估 Bangumi (bgm.tv) API 或 AniList GraphQL 作為結構化資料源

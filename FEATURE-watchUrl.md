# watchUrl 功能規劃

> 與 Claude 在 2026-05-12 討論的方案。之後接續做時直接照這份走。

---

## 一、目標

每齣動畫卡片加「快速跳到觀看頁面」的按鈕：

- 是 gimy 網址 → 自動帶下一集集數
- 其他平台網址 → 直接開該網址（不帶集數）
- gimy 換網域時，**只改一個全域設定**，所有動畫的 ▶ 連結自動更新

---

## 二、為什麼這樣設計（已討論過的取捨）

### 不選的方案

| 方案 | 不選的原因 |
|---|---|
| AI 自動找最新集數 | CLAUDE.md 已記載「Gemini + Google Search 對中文動畫集數準確度不足」，不重蹈 |
| 自動產生搜尋連結（YouTube/巴哈）| 結果準確度低，動畫名變體、季數、OVA 都搜不準 |
| 每集都存連結 | 太累，每週要手動更新 |
| 整段網址都存（含網域）| gimy 換網域時要逐一改幾十條 |

### 選定方案

- 存「貼上的網址」整段，**渲染時偵測是否 gimy 格式**，是的話抽 ID + 用全域網域重組
- **gimy 網域存 localStorage**，換網域只改一個地方
- 非 gimy 網址寬鬆接受（直接開主頁）

---

## 三、資料層

### Google Sheet schema 變動

新增 F 欄 `觀看連結`（保留 D / E 給舊 AI schema 相容）

```
A=最後更新時間  B=作品名稱  C=目前進度
D=最新進度(AI)  E=追蹤  F=觀看連結  ← 新增
```

舊資料沒有 F 欄 → GAS 讀的時候寫成「F 欄沒值就視為 undefined」，不會壞舊帳號。

### localStorage 新欄位

| key | value | 預設 |
|---|---|---|
| `gimyDomain` | gimy 當前網域 | `https://gimy01.co` |

> ⚠️ localStorage 是 per-browser，每台電腦 / 換瀏覽器要重設一次（gimy 半年才換一次域名，可接受）。

---

## 四、邏輯：點 ▶ 按鈕時

```
讀 watchUrl：

  ├─ 是 gimy 格式（match /\/vod\/(\d+)\.html/）
  │   → 抽 ID → 組成：
  │     ${gimyDomain}/eps/${id}-1-${progress+1}.html
  │
  ├─ 是其他網址
  │   → 直接用 watchUrl，不做集數帶入
  │
  └─ 空值
      → 不顯示按鈕
```

---

## 五、UI 設計

### AddItemModal（新增動畫）

多一個「觀看連結（選填）」input，貼進去後即時識別：

- 空 → 灰色 placeholder「貼上 gimy 動畫主頁網址」
- 有效 gimy 網址 → `✓ 已識別 gimy ID：12345`
- 其他網址 → `✓ 將直接開啟此連結（無自動集數）`
- 不擋你存

### RenameModal → 改造為 EditModal

擴充成「編輯動畫」：可以改名 + 改連結。

### AnimeCard

有 watchUrl 顯示按鈕：

- gimy 格式 → ▶
- 其他平台 → 🔗
- 空值 → 不顯示

### SettingsModal（新元件）

header 加 ⚙ 圖示開啟。內含：

- gimy 網域輸入框（預設 `https://gimy01.co`）
- 儲存到 localStorage

---

## 六、要動的檔案

| 檔案 | 改動 |
|---|---|
| `apps-script-code.gs` | F 欄讀寫、5 欄 → 6 欄 schema、新 action `updateWatchUrl` |
| `src/types/anime.ts` | `AnimeItem` 加 `watchUrl?: string` |
| `src/hooks/useAnimeList.ts` | rawData index 加 F 欄、add/update 帶 watchUrl |
| `src/components/AddItemModal.tsx` | 加連結 input + 即時識別 |
| `src/components/RenameModal.tsx` | 擴充為 EditModal |
| `src/components/AnimeCard.tsx` | 加 ▶ / 🔗 按鈕 |
| `src/components/SettingsModal.tsx` | **新檔案**，設定 gimy 網域 |
| `src/app/page.tsx` | header 加 ⚙、串 SettingsModal |
| `src/lib/watchUrl.ts` | **新檔案**，URL 解析 + 重組工具 |

---

## 七、部署步驟

1. Claude 改完 code → commit + push（GitHub Actions 自動部署 GitHub Pages）
2. **手動部署 GAS 新版**（這步必做）：
   - 開 [script.google.com](https://script.google.com)
   - 找對應專案 → 貼上新版 .gs
   - 「部署 > 管理部署 > 編輯 > 版本：新版本 > 部署」

---

## 八、不用動的部分

- **GCP Console**：anime app 完全不呼叫任何 GCP API（GAS 連自己 GCP project 不算）。不用 enable API、改 IAM、改配額。
- **OAuth scopes**：仍只需 Sheets 操作權限，沒新增。

---

## 九、工程量估計

3–4 小時（含本機測試）。

---

## 十、接續做時

跟 Claude 說「**繼續追番 app 那個 watchUrl**」就會回到這份計畫，直接動工。

/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkFirst, NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // 建置時由 @serwist/next 注入的預快取清單
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // skipWaiting + clientsClaim：新版一到就立刻接手，
  // 避免 service worker 把舊版死死快取住（PWA 最常見的雷）
  skipWaiting: true,
  clientsClaim: true,
  // 必須關閉：開啟時網路一斷，導覽請求會直接失敗（實測 ERR_FAILED），
  // 不會退回快取。這個 app 要離線可用，preload 帶來的好處不值得
  navigationPreload: false,
  runtimeCaching: [
    // 後端資料一律不快取。defaultCache 有一條 cross-origin 的 StaleWhileRevalidate
    // 會把 Apps Script 的回應吃下去，導致清單永遠慢一拍——實測 GAS 已寫入新值、
    // 頁面卻仍拿到舊 JSON（連 fetch 帶 cache: 'no-store' 都擋不掉，因為攔截發生在 SW）。
    // 離線時的清單靠 localStorage 快取，不需要也不該由 SW 代管
    {
      matcher: ({ url }) =>
        url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com',
      handler: new NetworkOnly(),
    },
    // defaultCache 的 pages 規則比對 request 的 Content-Type 是否含 text/html，
    // 但瀏覽器的導覽請求根本不帶這個 header，所以那條規則永遠不會命中。
    // 自己補一條放在最前面，否則會被 defaultCache 的 others 萬用規則吃掉
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'pages',
        networkTimeoutSeconds: 3,
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

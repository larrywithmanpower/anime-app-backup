import withSerwistInit from '@serwist/next';

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'anime-app-backup';
const basePath = isProd ? `/${repoName}` : '';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // swUrl 會被 Serwist 自動套上 basePath，這裡不能自己加（會變成 /repo/repo/sw.js）；
  // 但 scope 不會自動套，必須手動帶——SW 放在子路徑下無法宣告根目錄 scope，上線會註冊失敗
  swUrl: '/sw.js',
  scope: `${basePath}/`,
  // 開發時關掉，避免 SW 快取擋住熱更新
  disable: !isProd,
  reloadOnOnline: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  output: 'export',
  basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

// dev 一定要走沒包過的設定：即使 Serwist 被 disable，withSerwistInit 仍會塞一份 webpack config 進去，
// 而 Next 16 的 Turbopack 只要偵測到 webpack config 又沒有 turbopack config 就直接拒絕啟動。
// 正式建置則帶 --webpack（Serwist 的 plugin mode 不支援 Turbopack）
export default isProd ? withSerwist(nextConfig) : nextConfig;

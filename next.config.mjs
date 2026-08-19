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
  // 開發時關掉，避免 SW 快取擋住熱更新（dev 才能繼續用 Turbopack）
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

export default withSerwist(nextConfig);

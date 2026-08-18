import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://larrywithmanpower.github.io/anime-app-backup/"),
  title: "追番進度",
  description: "動畫、日劇、影集的追看進度管理",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  // 手機上 header 固定在頂端，避免 focus 輸入框時整頁被放大
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      {/* 字體一律走系統字：中文 webfont 動輒數 MB，是首屏最大的拖累 */}
      <body className="antialiased">{children}</body>
    </html>
  );
}

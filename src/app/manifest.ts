import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '追番進度管理',
    short_name: '追番進度',
    description: 'Anime Tracker - 專屬您的追番進度管理',
    start_url: 'https://larrywithmanpower.github.io/anime-app-backup/',
    scope: '/anime-app-backup/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/anime-app-backup/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/anime-app-backup/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/anime-app-backup/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

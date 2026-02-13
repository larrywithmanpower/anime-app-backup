const isProd = process.env.NODE_ENV === 'production';
const repoName = 'anime-app-backup';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  output: 'export',
  basePath: isProd ? `/${repoName}` : '',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;

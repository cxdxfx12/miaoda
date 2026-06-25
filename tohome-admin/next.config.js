/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    // 服务端代理地址：Docker 内用 gateway:8080，本地开发用 localhost:8090
    const API_TARGET = process.env.API_TARGET || 'http://gateway:8080';
    return [
      {
        source: '/uploads/:path*',
        destination: `${API_TARGET}/uploads/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${API_TARGET}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

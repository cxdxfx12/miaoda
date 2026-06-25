import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '喵搭 - 管理后台',
  description: '杭州喵喵至家网络有限公司 · 上门服务O2O平台管理后台',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

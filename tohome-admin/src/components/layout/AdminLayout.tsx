'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isAuthenticated, pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F7FA]">
        <div className="text-sm text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Sidebar />
      <div className="pl-60">
        <Topbar />
        <main className="p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/lib/utils';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const persist = (useAdminStore as any).persist;
    setHydrated(persist?.hasHydrated?.() ?? true);
    const unsub = persist?.onFinishHydration?.(() => setHydrated(true));
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className={cn('sidebar-transition', sidebarCollapsed ? 'pl-[72px]' : 'pl-[240px]')}>
        <Topbar onToggleSidebar={toggleSidebar} />
        <main className="p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

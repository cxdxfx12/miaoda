'use client';

import { useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';

export default function HomePage() {
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);

  useEffect(() => {
    window.location.href = isAuthenticated ? '/pc_admin/dashboard' : '/pc_admin/login';
  }, [isAuthenticated]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#F5F7FA]">
      <div className="text-sm text-gray-400">加载中...</div>
    </div>
  );
}

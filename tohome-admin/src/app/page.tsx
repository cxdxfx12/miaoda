'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);

  useEffect(() => {
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#F5F7FA]">
      <div className="text-sm text-gray-400">加载中...</div>
    </div>
  );
}

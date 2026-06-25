'use client';

import { Bell, Search, ChevronDown, LogOut, User as UserIcon, MapPin } from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cityNames } from '@/constants/cities';

export function Topbar() {
  const router = useRouter();
  const admin = useAdminStore((s) => s.admin);
  const logout = useAdminStore((s) => s.logout);
  const [showMenu, setShowMenu] = useState(false);
  const [city, setCity] = useState(() => {
    if (typeof window === 'undefined') return '全部城市';
    return localStorage.getItem('admin-current-city') || '全部城市';
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const changeCity = (nextCity: string) => {
    setCity(nextCity);
    localStorage.setItem('admin-current-city', nextCity);
    window.dispatchEvent(new CustomEvent('admin-city-changed', { detail: nextCity }));
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#EEF1F6] bg-white/80 px-6 backdrop-blur-md">
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="搜索订单号/用户手机号/技师姓名..."
          className="h-9 w-full rounded-lg border border-[#EEF1F6] bg-[#F5F7FA] pl-9 pr-4 text-sm placeholder:text-gray-400 focus:border-[#6B7FD7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-[#EEF1F6] bg-[#F8FAFC] px-3">
          <MapPin className="h-4 w-4 text-[#6B7FD7]" />
          <select
            value={city}
            onChange={(e) => changeCity(e.target.value)}
            className="bg-transparent text-sm font-medium text-[#1F2937] outline-none"
          >
            <option>全部城市</option>
            {cityNames.map((name) => <option key={name}>{name}</option>)}
          </select>
        </div>

        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-[#F3F4FE] hover:text-[#6B7FD7]">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#FF6B6B] ring-2 ring-white" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#F3F4FE]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-sm font-semibold text-white">
              {admin?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-[#1F2937]">
                {admin?.username || '管理员'}
              </div>
              <div className="text-[11px] text-gray-400">
                {admin?.role || '超级管理员'}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-lg border border-[#EEF1F6] bg-white py-1 shadow-lg animate-fade-in">
                <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-[#F3F4FE]">
                  <UserIcon className="h-4 w-4" />
                  个人信息
                </button>
                <div className="my-1 h-px bg-[#EEF1F6]" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#EF4444] hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

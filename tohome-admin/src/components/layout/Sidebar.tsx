'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  UserCog,
  Wallet,
  Megaphone,
  Settings,
  BarChart3,
  Tags,
  MapPin,
  MessageSquare,
  CreditCard,
  Globe,
  Smartphone,
  UserCheck,
  Image,
  Package,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: '数据概览', icon: LayoutDashboard },
  { href: '/orders', label: '订单管理', icon: ShoppingBag },
  { href: '/talents', label: '达人管理', icon: UserCog },
  { href: '/talent-review', label: '达人审核', icon: UserCheck },
  { href: '/users', label: '用户管理', icon: Users },
  { href: '/finance', label: '财务管理', icon: Wallet },
  { href: '/dispatch', label: '派单调度', icon: MapPin },
  { href: '/reviews', label: '评价管理', icon: MessageSquare },
  { href: '/services', label: '服务管理', icon: Package },
  { href: '/marketing', label: '营销中心', icon: Megaphone },
  { href: '/marketing/banners', label: '轮播图管理', icon: Image },
  { href: '/analytics', label: '数据分析', icon: BarChart3 },
  { href: '/map-config', label: '地图配置', icon: Globe },
  { href: '/payment-config', label: '支付配置', icon: CreditCard },
  { href: '/wechat-config', label: '微信配置', icon: MessageCircle },
  { href: '/virtual-phone', label: '虚拟电话', icon: Smartphone },
  { href: '/settings', label: '系统设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-[#EEF1F6] bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-[#EEF1F6] px-5">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#EEF1F6] bg-white shadow-glow">
          <img src="/logo.png" alt="喵搭" className="h-8 w-8 object-contain" />
        </div>
        <div>
          <div className="text-base font-bold text-[#1F2937]">喵搭</div>
          <div className="text-[11px] text-gray-400">管理后台 v1.0</div>
        </div>
      </div>

      <nav className="space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'nav-item',
                isActive && 'nav-item-active'
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-3 right-3 rounded-lg border border-[#EEF1F6] bg-gradient-to-br from-[#F3F4FE] to-white p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[#6B7FD7]">
          <Tags className="h-3.5 w-3.5" />
          <span>技术支持</span>
        </div>
        <div className="text-[11px] leading-relaxed text-gray-500">
          7x24小时在线<br />400-888-8888
        </div>
      </div>
    </aside>
  );
}

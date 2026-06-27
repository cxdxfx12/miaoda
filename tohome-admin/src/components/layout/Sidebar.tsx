'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  UserCog,
  Wallet,
  Megaphone,
  Gift,
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
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { settingsApi } from '@/api';

const navItems = [
  { href: '/dashboard', label: '数据概览', icon: LayoutDashboard },
  { href: '/cities', label: '城市管理', icon: Building2 },
  { href: '/orders', label: '订单管理', icon: ShoppingBag },
  { href: '/talents', label: '达人管理', icon: UserCog },
  { href: '/talent-review', label: '达人审核', icon: UserCheck },
  { href: '/users', label: '用户管理', icon: Users },
  { href: '/finance', label: '财务管理', icon: Wallet },
  { href: '/dispatch', label: '派单调度', icon: MapPin },
  { href: '/reviews', label: '评价管理', icon: MessageSquare },
  { href: '/services', label: '服务管理', icon: Package },
  { href: '/marketing', label: '营销中心', icon: Megaphone },
  { href: '/marketing/invites', label: '邀请管理', icon: Gift },
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
  const [servicePhone, setServicePhone] = useState('400-888-8888');
  const [supportPos, setSupportPos] = useState<{ left: number; top: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const supportPosRef = useRef<{ left: number; top: number } | null>(null);

  const loadSupportPhone = async () => {
    try {
      const res: any = await settingsApi.getBasic();
      const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const phone = items.find((item: any) => item.key === 'service_phone')?.value;
      if (phone) setServicePhone(phone);
    } catch {
      // 保留默认客服电话
    }
  };

  useEffect(() => {
    loadSupportPhone();
    const handler = (event: Event) => {
      const phone = (event as CustomEvent<string>).detail;
      if (phone) setServicePhone(phone);
      else loadSupportPhone();
    };
    window.addEventListener('admin-basic-settings-saved', handler);
    return () => window.removeEventListener('admin-basic-settings-saved', handler);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('admin-support-widget-position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const next = {
          left: Math.min(Math.max(12, parsed.left), window.innerWidth - 210),
          top: Math.min(Math.max(72, parsed.top), window.innerHeight - 110),
        };
        supportPosRef.current = next;
        setSupportPos(next);
        return;
      } catch {
        // 使用默认位置
      }
    }
    const next = { left: window.innerWidth - 220, top: window.innerHeight - 120 };
    supportPosRef.current = next;
    setSupportPos(next);
  }, []);

  useEffect(() => {
    if (!dragOffset) return;
    const onMove = (event: MouseEvent) => {
      const next = {
        left: Math.min(Math.max(12, event.clientX - dragOffset.x), window.innerWidth - 210),
        top: Math.min(Math.max(72, event.clientY - dragOffset.y), window.innerHeight - 110),
      };
      supportPosRef.current = next;
      setSupportPos(next);
    };
    const onUp = () => {
      setDragOffset(null);
      if (supportPosRef.current) {
        localStorage.setItem('admin-support-widget-position', JSON.stringify(supportPosRef.current));
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragOffset]);

  const startDragSupport = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!supportPos) return;
    event.preventDefault();
    setDragOffset({
      x: event.clientX - supportPos.left,
      y: event.clientY - supportPos.top,
    });
  };

  return (
    <>
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

        <nav className="max-h-[calc(100vh-4rem)] space-y-1 overflow-y-auto px-3 py-4">
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
      </aside>

      <div
        onMouseDown={startDragSupport}
        className="fixed z-50 w-[196px] cursor-move select-none rounded-2xl border border-[#E6E9F2] bg-white/95 p-3 shadow-[0_18px_45px_rgba(31,41,55,0.16)] backdrop-blur"
        style={supportPos ? { left: supportPos.left, top: supportPos.top } : { right: 24, bottom: 24 }}
        title="按住拖动"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7FD7]">
            <Tags className="h-3.5 w-3.5" />
            <span>技术支持</span>
          </div>
          <span className="rounded-full bg-[#F3F4FE] px-2 py-0.5 text-[10px] text-[#6B7FD7]">可拖动</span>
        </div>
        <div className="text-[11px] leading-relaxed text-gray-500">
          7x24小时在线<br />{servicePhone}
        </div>
      </div>
    </>
  );
}

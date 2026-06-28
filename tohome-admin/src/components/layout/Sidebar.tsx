'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Cat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { settingsApi } from '@/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: '业务管理',
    items: [
      { href: '/dashboard', label: '数据概览', icon: LayoutDashboard },
      { href: '/orders', label: '订单管理', icon: ShoppingBag },
      { href: '/dispatch', label: '派单调度', icon: MapPin },
    ],
  },
  {
    title: '用户管理',
    items: [
      { href: '/talents', label: '达人管理', icon: UserCog },
      { href: '/talent-review', label: '达人审核', icon: UserCheck },
      { href: '/users', label: '用户管理', icon: Users },
    ],
  },
  {
    title: '运营工具',
    items: [
      { href: '/services', label: '服务管理', icon: Package },
      { href: '/marketing', label: '营销中心', icon: Megaphone },
      { href: '/reviews', label: '评价管理', icon: MessageSquare },
      { href: '/finance', label: '财务管理', icon: Wallet },
    ],
  },
  {
    title: '系统配置',
    items: [
      { href: '/analytics', label: '数据分析', icon: BarChart3 },
      { href: '/cities', label: '城市管理', icon: Building2 },
      { href: '/map-config', label: '地图配置', icon: Globe },
      { href: '/payment-config', label: '支付配置', icon: CreditCard },
      { href: '/wechat-config', label: '微信配置', icon: MessageCircle },
      { href: '/virtual-phone', label: '虚拟电话', icon: Smartphone },
      { href: '/settings', label: '系统设置', icon: Settings },
    ],
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
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

  const startDragSupport = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!supportPos) return;
    event.preventDefault();
    setDragOffset({
      x: event.clientX - supportPos.left,
      y: event.clientY - supportPos.top,
    });
  }, [supportPos]);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    const linkContent = (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          active
            ? 'bg-[#F3F4FE] text-[#6B7FD7] font-semibold'
            : 'text-gray-500 hover:bg-[#F8FAFC] hover:text-[#1F2937]'
        )}
      >
        {/* 图标 */}
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
            active
              ? 'bg-[#6B7FD7]/10 text-[#6B7FD7]'
              : 'text-gray-400 group-hover:text-gray-500'
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        {/* 文字 */}
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );

    // 折叠模式下用 Tooltip 显示文字
    if (collapsed) {
      return (
        <TooltipProvider key={item.href} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
            <TooltipContent side="right" className="rounded-md bg-[#1F2937] px-2 py-1 text-xs text-white">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return linkContent;
  };

  return (
    <>
      <aside
        className={cn(
          'sidebar-transition fixed left-0 top-0 z-40 flex h-screen flex-col',
          'bg-white border-r border-[#EEF1F6]',
          collapsed ? 'w-[72px]' : 'w-[240px]'
        )}
      >
        {/* Logo 区域 - 高度 h-16 与 Topbar 对齐 */}
        <div className={cn(
          'flex h-16 shrink-0 items-center border-b border-[#EEF1F6]',
          collapsed ? 'justify-center px-3' : 'gap-2.5 px-5'
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#6B7FD7]">
            <Cat className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-[15px] font-bold text-[#1F2937] tracking-tight">喵搭</div>
              <div className="text-[10px] text-gray-400">管理后台</div>
            </div>
          )}
        </div>

        {/* 菜单区域 */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-4 last:mb-0">
              {/* 分组标题 */}
              {!collapsed && (
                <div className="mb-1.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {group.title}
                </div>
              )}
              {collapsed && (
                <div className="mx-auto mb-1.5 h-px w-6 bg-[#EEF1F6]" />
              )}
              {/* 菜单项 */}
              <div className="space-y-0.5">
                {group.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </nav>

        {/* 底部：折叠按钮 + 版本号 */}
        <div className="shrink-0 border-t border-[#EEF1F6] px-2 py-3">
          {/* 折叠按钮 */}
          <button
            onClick={onToggle}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-[#F8FAFC] hover:text-[#1F2937]',
              collapsed && 'justify-center'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>收起菜单</span>
              </>
            )}
          </button>

          {/* 版本号 */}
          {!collapsed && (
            <div className="mt-2 px-4 text-[10px] text-gray-400">
              v1.0.0 &copy; 2026 喵搭
            </div>
          )}
        </div>
      </aside>

      {/* 技术支持悬浮组件 */}
      <div
        onMouseDown={startDragSupport}
        className="fixed z-50 w-[196px] cursor-move select-none rounded-2xl border border-[#EEF1F6] bg-white/95 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur"
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
        <div className="text-[11px] leading-relaxed text-gray-400">
          7x24小时在线<br />{servicePhone}
        </div>
      </div>
    </>
  );
}

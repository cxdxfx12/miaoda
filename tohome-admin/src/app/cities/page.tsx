'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { analyticsApi } from '@/api';
import { OPERATING_CITIES } from '@/constants/cities';
import { BarChart3, ClipboardList, DollarSign, Package, ShieldCheck, Sparkles, UserCog } from 'lucide-react';

const moduleLinks = [
  { label: '订单管理', href: '/orders', icon: ClipboardList, desc: '按城市查看订单、退款与履约状态' },
  { label: '达人管理', href: '/talents', icon: UserCog, desc: '管理城市达人供给、服务区和上下线' },
  { label: '达人审核', href: '/talent-review', icon: ShieldCheck, desc: '按城市处理入驻审核与资料补全' },
  { label: '财务管理', href: '/finance', icon: DollarSign, desc: '查看城市营收、提现、退款和结算' },
  { label: '服务管理', href: '/services', icon: Package, desc: '配置城市可售服务、价格和规格' },
  { label: '数据分析', href: '/analytics', icon: BarChart3, desc: '沉淀城市经营漏斗和供需热力' },
];

export default function CitiesPage() {
  const [stats, setStats] = useState<Record<string, { orders: number; revenue: number }>>({});
  const [activeCity, setActiveCity] = useState(OPERATING_CITIES[0].name);

  useEffect(() => {
    analyticsApi.getCities().then((res: any) => {
      const list = Array.isArray(res?.data) ? res.data : [];
      const map: Record<string, { orders: number; revenue: number }> = {};
      list.forEach((item: any) => {
        map[item.city] = { orders: Number(item.orders || 0), revenue: Number(item.revenue || 0) };
      });
      setStats(map);
    }).catch(() => setStats({}));
  }, []);

  const active = useMemo(() => OPERATING_CITIES.find((city) => city.name === activeCity) || OPERATING_CITIES[0], [activeCity]);
  const activeStats = stats[active.name] || { orders: 0, revenue: 0 };
  const totalDistricts = OPERATING_CITIES.reduce((sum, city) => sum + city.districts.length, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl bg-[#111827] p-6 text-white shadow-soft">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                <Sparkles className="h-3.5 w-3.5" />
                城市运营中枢
              </div>
              <h1 className="text-3xl font-bold">城市管理</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                城市是后台的一级经营维度。订单、达人、审核、财务、服务和数据分析都应围绕城市沉淀，避免每个模块各自维护城市逻辑。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <div className="text-2xl font-bold">{OPERATING_CITIES.length}</div>
                <div className="mt-1 text-xs text-white/50">运营城市</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <div className="text-2xl font-bold">{totalDistricts}</div>
                <div className="mt-1 text-xs text-white/50">服务区县</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <div className="text-2xl font-bold">6</div>
                <div className="mt-1 text-xs text-white/50">联动模块</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {OPERATING_CITIES.map((city) => {
            const cityStats = stats[city.name] || { orders: 0, revenue: 0 };
            const selected = activeCity === city.name;
            return (
              <button
                key={city.code}
                onClick={() => setActiveCity(city.name)}
                className={`overflow-hidden rounded-2xl border bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft ${selected ? 'border-[#6B7FD7] ring-4 ring-[#6B7FD7]/10' : 'border-[#EEF1F6]'}`}
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${city.theme} text-lg font-bold text-white shadow-soft`}>
                    {city.shortName}
                  </div>
                  <span className="rounded-full bg-[#E6F9F0] px-2.5 py-1 text-xs font-medium text-[#10B981]">已启用</span>
                </div>
                <div className="mt-4 text-xl font-bold text-[#1F2937]">{city.name}</div>
                <div className="mt-1 text-xs text-gray-400">{city.districts.length} 个服务区</div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs text-gray-500">
                  <span>{cityStats.orders} 单</span>
                  <span>¥{cityStats.revenue.toLocaleString()}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-[#EEF1F6] bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">{active.name} · 服务区</h2>
                <p className="mt-1 text-xs text-gray-400">这些区县会作为达人入驻、订单筛选和城市经营分析的基础范围。</p>
              </div>
              <span className="rounded-full bg-[#F3F4FE] px-3 py-1 text-xs font-medium text-[#6B7FD7]">{active.districts.length} 个区</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {active.districts.map((district) => (
                <span key={district} className="rounded-xl border border-[#EEF1F6] bg-[#F8FAFC] px-3 py-2 text-sm text-[#374151]">
                  {district}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#EEF1F6] bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-[#1F2937]">{active.name} · 模块联动</h2>
            <p className="mt-1 text-xs text-gray-400">点击后带入城市参数，后续模块按同一城市上下文筛选。</p>
            <div className="mt-4 grid gap-2">
              {moduleLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={`${item.href}?city=${encodeURIComponent(active.name)}`}
                    className="group flex items-center gap-3 rounded-xl border border-[#EEF1F6] p-3 transition-all hover:border-[#6B7FD7]/40 hover:bg-[#F8FAFF]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4FE] text-[#6B7FD7]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#1F2937]">{item.label}</div>
                      <div className="truncate text-xs text-gray-400">{item.desc}</div>
                    </div>
                    <span className="text-xs text-gray-300 group-hover:text-[#6B7FD7]">进入</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

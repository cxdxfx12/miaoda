'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Download, TrendingUp, Users, ShoppingBag, MapPin, Loader2 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { analyticsApi, financeApi } from '@/api';

interface RevenueItem { month: string; revenue: number; cost: number; profit: number; orders: number; }
interface UserItem { day: string; new: number; active: number; }
interface CityItem { city: string; orders: number; revenue: number; }
interface KpiData { month_revenue: number; month_orders: number; month_new_users: number; city_count: number; }

const COLORS = ['#6B7FD7', '#FFB84D', '#34D399', '#F472B6', '#94A3B8'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueItem[]>([]);
  const [userGrowth, setUserGrowth] = useState<UserItem[]>([]);
  const [cityData, setCityData] = useState<CityItem[]>([]);
  const [kpi, setKpi] = useState<KpiData>({ month_revenue: 0, month_orders: 0, month_new_users: 0, city_count: 0 });
  const [serviceDist] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [revRes, userRes, cityRes, finRes] = await Promise.all([
          analyticsApi.getRevenue(6),
          analyticsApi.getUsers(7),
          analyticsApi.getCities(),
          financeApi.getOverview(),
        ]);
        const revData = (revRes as any)?.data || [];
        setRevenueData(Array.isArray(revData) ? revData : []);
        const userData = (userRes as any)?.data || [];
        setUserGrowth(Array.isArray(userData) ? userData : []);
        const cityDataArr = (cityRes as any)?.data || [];
        setCityData(Array.isArray(cityDataArr) ? cityDataArr : []);
        const fin = (finRes as any)?.data || {};
        setKpi({
          month_revenue: fin?.month_revenue || 0,
          month_orders: fin?.month_orders || 0,
          month_new_users: 0,
          city_count: cityDataArr.length,
        });
      } catch {
        setRevenueData([]);
        setUserGrowth([]);
        setCityData([]);
        setKpi({ month_revenue: 0, month_orders: 0, month_new_users: 0, city_count: 0 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatK = (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toFixed(0);

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">数据分析</h1>
          <p className="mt-1 text-sm text-gray-400">多维度业务数据洞察</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-3 py-1.5 text-sm font-medium text-white shadow-soft">
          <Download className="h-4 w-4" />导出报告
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" /></div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: '月营收', value: `¥${formatK(kpi.month_revenue)}`, icon: TrendingUp, color: 'from-[#6B7FD7] to-[#8B9AE3]' },
              { label: '月订单', value: kpi.month_orders.toLocaleString(), icon: ShoppingBag, color: 'from-[#34D399] to-[#6EE7B7]' },
              { label: '覆盖城市', value: kpi.city_count.toString(), icon: MapPin, color: 'from-[#FFB84D] to-[#FFC97A]' },
              { label: '总用户', value: '--', icon: Users, color: 'from-[#F472B6] to-[#FBA3D0]' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-gray-500">{s.label}</div>
                      <div className="mt-2 text-2xl font-bold text-[#1F2937]">{s.value}</div>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="admin-card p-5">
              <h3 className="mb-1 text-base font-semibold text-[#1F2937]">营收分析</h3>
              <p className="mb-4 text-xs text-gray-400">近6个月营收/成本/利润</p>
              {revenueData.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">暂无数据</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #EEF1F6' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="revenue" stroke="#6B7FD7" strokeWidth={2.5} name="营收" />
                    <Line type="monotone" dataKey="cost" stroke="#FFB84D" strokeWidth={2.5} name="成本" />
                    <Line type="monotone" dataKey="profit" stroke="#34D399" strokeWidth={2.5} name="利润" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="admin-card p-5">
              <h3 className="mb-1 text-base font-semibold text-[#1F2937]">用户增长</h3>
              <p className="mb-4 text-xs text-gray-400">本周新增/活跃用户</p>
              {userGrowth.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">暂无数据</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                    <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #EEF1F6' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="new" fill="#6B7FD7" radius={[4, 4, 0, 0]} name="新增" />
                    <Bar dataKey="active" fill="#FFB84D" radius={[4, 4, 0, 0]} name="活跃" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="admin-card p-5">
              <h3 className="mb-1 text-base font-semibold text-[#1F2937]">服务类型</h3>
              <p className="mb-4 text-xs text-gray-400">订单分布</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={serviceDist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {serviceDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {serviceDist.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-gray-600">{s.name}</span><span className="ml-auto text-gray-500">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card col-span-1 p-5 lg:col-span-2">
              <h3 className="mb-1 text-base font-semibold text-[#1F2937]">城市排行</h3>
              <p className="mb-4 text-xs text-gray-400">订单数与销售额 TOP 城市</p>
              {cityData.length === 0 ? (
                <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">暂无数据</div>
              ) : (
                <div className="space-y-3">
                  {cityData.map((c, i) => {
                    const max = Math.max(...cityData.map(x => x.orders), 1);
                    const pct = (c.orders / max) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                          i === 0 ? 'bg-gradient-to-br from-[#FFB84D] to-[#FFC97A] text-white' :
                          i === 1 ? 'bg-gradient-to-br from-[#94A3B8] to-[#CBD5E1] text-white' :
                          i === 2 ? 'bg-gradient-to-br from-[#CD7F32] to-[#E69955] text-white' :
                          'bg-[#F3F4FE] text-[#6B7FD7]'
                        }`}>{i + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-[#1F2937]">{c.city}</span>
                            <span className="text-gray-500">{c.orders.toLocaleString()} 单 · ¥{c.revenue?.toLocaleString?.() || c.revenue}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F5F7FA]">
                            <div className="h-full bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

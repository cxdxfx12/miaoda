'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Download, ArrowUpRight, Wallet, CreditCard, Coins, Receipt, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { financeApi } from '@/api';

interface FinOverview { month_revenue: number; month_orders: number; talent_income: number; platform_income: number; }
interface TrendItem { month: string; revenue: number; cost: number; profit: number; }
interface TxnItem { id: number; payment_no: string; order_no: string; amount: number; pay_method: string; status: string; created_at: string; }

type FilterType = 'all' | 'wechat' | 'alipay' | 'balance';
const typeMap: Record<FilterType, string> = { all: '', wechat: '微信支付', alipay: '支付宝', balance: '余额支付' };

// --- Mock 数据 ---
const MOCK_OVERVIEW: FinOverview = { month_revenue: 482560, month_orders: 328, talent_income: 312800, platform_income: 169760 };
const MOCK_TREND: TrendItem[] = [
  { month: '01月', revenue: 320000, cost: 210000, profit: 110000 },
  { month: '02月', revenue: 280000, cost: 185000, profit: 95000 },
  { month: '03月', revenue: 365000, cost: 240000, profit: 125000 },
  { month: '04月', revenue: 410000, cost: 265000, profit: 145000 },
  { month: '05月', revenue: 450000, cost: 290000, profit: 160000 },
  { month: '06月', revenue: 482560, cost: 312800, profit: 169760 },
];
const MOCK_TXNS: TxnItem[] = [
  { id: 1, payment_no: 'PAY202606230001', order_no: 'ORD202606230001', amount: 298, pay_method: '微信支付', status: '成功', created_at: '2026-06-23 14:30' },
  { id: 2, payment_no: 'PAY202606230002', order_no: 'ORD202606230002', amount: 398, pay_method: '支付宝', status: '成功', created_at: '2026-06-23 13:15' },
  { id: 3, payment_no: 'PAY202606230003', order_no: 'ORD202606230003', amount: 198, pay_method: '微信支付', status: '成功', created_at: '2026-06-23 11:45' },
  { id: 4, payment_no: 'PAY202606230004', order_no: 'ORD202606230004', amount: 598, pay_method: '支付宝', status: '处理中', created_at: '2026-06-23 10:20' },
  { id: 5, payment_no: 'PAY202606220005', order_no: 'ORD202606220005', amount: 268, pay_method: '微信支付', status: '成功', created_at: '2026-06-22 19:00' },
  { id: 6, payment_no: 'PAY202606220006', order_no: 'ORD202606220006', amount: 358, pay_method: '余额支付', status: '成功', created_at: '2026-06-22 16:30' },
  { id: 7, payment_no: 'PAY202606220007', order_no: 'ORD202606220007', amount: 498, pay_method: '微信支付', status: '成功', created_at: '2026-06-22 14:10' },
  { id: 8, payment_no: 'PAY202606210008', order_no: 'ORD202606210008', amount: 328, pay_method: '支付宝', status: '成功', created_at: '2026-06-21 20:45' },
  { id: 9, payment_no: 'PAY202606210009', order_no: 'ORD202606210009', amount: 198, pay_method: '余额支付', status: '成功', created_at: '2026-06-21 17:30' },
  { id: 10, payment_no: 'PAY202606200010', order_no: 'ORD202606200010', amount: 588, pay_method: '微信支付', status: '成功', created_at: '2026-06-20 12:00' },
];

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<FinOverview>(MOCK_OVERVIEW);
  const [trendData, setTrendData] = useState<TrendItem[]>(MOCK_TREND);
  const [transactions, setTransactions] = useState<TxnItem[]>(MOCK_TXNS);
  const [totalTxns, setTotalTxns] = useState(MOCK_TXNS.length);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => { loadOverview(); }, []);
  useEffect(() => { loadTransactions(); }, [page, filter]);

  async function loadOverview() {
    try {
      const [o, t] = await Promise.all([
        financeApi.getOverview(),
        financeApi.getTrend(6),
      ]);
      const ov = (o as any)?.data || {};
      if (ov.month_revenue) setOverview(ov);
      const td = ((t as any)?.data) || [];
      if (td.length) setTrendData(td);
    } catch { /* backend unavailable, using mock */ } finally { setLoading(false); }
  }

  async function loadTransactions() {
    try {
      const res: any = await financeApi.getTransactions({ page, page_size: 10, type: typeMap[filter] });
      const list = res?.data?.list ?? [];
      if (list.length) { setTransactions(list.slice(0, 10)); setTotalTxns(res?.data?.total || list.length); }
    } catch { /* backend unavailable, using mock */ }
  }

  const formatAmount = (v: number) => `¥${(v || 0).toLocaleString()}`;

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">财务管理</h1>
          <p className="mt-1 text-sm text-gray-400">财务概览</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" /></div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: '本月营收', value: overview.month_revenue, icon: Wallet, color: 'from-[#6B7FD7] to-[#8B9AE3]' },
              { title: '本月订单', value: overview.month_orders, unit: '单', icon: Receipt, color: 'from-[#34D399] to-[#6EE7B7]' },
              { title: '达人分成', value: overview.talent_income, icon: Coins, color: 'from-[#FFB84D] to-[#FFC97A]' },
              { title: '平台收入', value: overview.platform_income, icon: CreditCard, color: 'from-[#F472B6] to-[#FBA3D0]' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-gray-500">{s.title}</div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#1F2937]">{typeof s.value === 'number' ? (s.value >= 1000 ? (s.value / 1000).toFixed(1) + 'K' : s.value.toLocaleString()) : '--'}</span>
                        {s.unit && <span className="text-sm text-gray-400">{s.unit}</span>}
                      </div>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="admin-card mb-6 overflow-hidden">
            <div className="border-b border-[#EEF1F6] px-5 py-4">
              <h3 className="text-base font-semibold text-[#1F2937]">营收趋势</h3>
            </div>
            <div className="p-5">
              {trendData.length === 0 ? (
                <div className="flex h-[320px] items-center justify-center text-sm text-gray-400">暂无数据</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6B7FD7" stopOpacity={0.3} /><stop offset="95%" stopColor="#6B7FD7" stopOpacity={0} /></linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FFB84D" stopOpacity={0.3} /><stop offset="95%" stopColor="#FFB84D" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #EEF1F6' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#6B7FD7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" name="营收" />
                    <Area type="monotone" dataKey="profit" stroke="#FFB84D" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" name="利润" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#EEF1F6] px-5 py-4">
              <h3 className="text-base font-semibold text-[#1F2937]">资金流水</h3>
              <div className="flex gap-2">
                {(['all', 'wechat', 'alipay', 'balance'] as FilterType[]).map((t) => (
                  <button key={t} onClick={() => { setFilter(t); setPage(1); }}
                    className={`rounded-md px-3 py-1 text-xs ${filter === t ? 'bg-[#6B7FD7] text-white' : 'text-gray-500 hover:bg-[#F3F4FE]'}`}>
                    {t === 'all' ? '全部' : t === 'wechat' ? '微信' : t === 'alipay' ? '支付宝' : '余额'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFBFC] text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">流水号</th>
                    <th className="px-3 py-3 font-medium">金额</th>
                    <th className="px-3 py-3 font-medium">支付方式</th>
                    <th className="px-3 py-3 font-medium">状态</th>
                    <th className="px-3 py-3 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">暂无资金流水</td></tr>
                  ) : (
                    transactions.map((t, i) => (
                      <tr key={i} className="border-t border-[#F5F7FA] hover:bg-[#FAFBFC]">
                        <td className="px-5 py-3 font-mono text-xs text-[#1F2937]">{t.payment_no || t.order_no || '--'}</td>
                        <td className={`px-3 py-3 font-semibold ${(t.amount || 0) > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                          ¥{Math.abs(t.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-gray-600">{t.pay_method || '--'}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            t.status === '成功' ? 'bg-[#E6F9F0] text-[#10B981]' : 'bg-[#FFF4E0] text-[#FF9800]'
                          }`}>{t.status}</span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{t.created_at || '--'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalTxns > 10 && (
              <div className="flex items-center justify-between border-t border-[#EEF1F6] px-5 py-3">
                <span className="text-xs text-gray-500">共 {totalTxns} 条</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="rounded border border-[#EEF1F6] px-3 py-1 text-xs disabled:opacity-40">上页</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * 10 >= totalTxns}
                    className="rounded border border-[#EEF1F6] px-3 py-1 text-xs disabled:opacity-40">下页</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}

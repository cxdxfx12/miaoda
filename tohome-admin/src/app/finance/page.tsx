'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { fmtBeijingTime } from '@/lib/utils';
import { Download, ArrowUpRight, Wallet, CreditCard, Coins, Receipt, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { financeApi } from '@/api';

interface FinOverview { month_revenue: number; month_orders: number; talent_income: number; platform_income: number; }
interface TrendItem { month: string; revenue: number; cost: number; profit: number; }
interface TxnItem { id: number; payment_no: string; order_no: string; amount: number; pay_method: string; status: string; created_at: string; }

type FilterType = 'all' | 'wechat' | 'alipay' | 'balance';
const typeMap: Record<FilterType, string> = { all: '', wechat: '微信支付', alipay: '支付宝', balance: '余额支付' };

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<FinOverview>({ month_revenue: 0, month_orders: 0, talent_income: 0, platform_income: 0 });
  const [trendData, setTrendData] = useState<TrendItem[]>([]);
  const [transactions, setTransactions] = useState<TxnItem[]>([]);
  const [totalTxns, setTotalTxns] = useState(0);
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
      setOverview({
        month_revenue: Number(ov.month_revenue || 0),
        month_orders: Number(ov.month_orders || 0),
        talent_income: Number(ov.talent_income || 0),
        platform_income: Number(ov.platform_income || 0),
      });
      const td = ((t as any)?.data) || [];
      setTrendData(Array.isArray(td) ? td : []);
    } catch {
      setOverview({ month_revenue: 0, month_orders: 0, talent_income: 0, platform_income: 0 });
      setTrendData([]);
    } finally { setLoading(false); }
  }

  async function loadTransactions() {
    try {
      const res: any = await financeApi.getTransactions({ page, page_size: 10, type: typeMap[filter] });
      const list = res?.data?.list ?? [];
      setTransactions(Array.isArray(list) ? list.slice(0, 10) : []);
      setTotalTxns(res?.data?.total || 0);
    } catch {
      setTransactions([]);
      setTotalTxns(0);
    }
  }

  const formatAmount = (v: number) => `¥${(v || 0).toLocaleString()}`;

  return (
    <AdminLayout>
      <PageHeader
        icon={Wallet}
        tag="财务中心"
        title="财务管理"
        subtitle="管理平台收入流水、技师提现和退款记录"
      />

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
                        <td className="px-3 py-3 text-xs text-gray-500">{fmtBeijingTime(t.created_at)}</td>
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

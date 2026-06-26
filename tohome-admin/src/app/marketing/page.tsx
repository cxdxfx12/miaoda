'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus, Gift, Ticket, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { marketingApi } from '@/api';

interface Coupon { id: number; name: string; type: number; value: number; min_amount: number; total_count: number; receive_count: number; start_time: string; end_time: string; status: number; }
interface Activity { id: number; name: string; type: string; start_time: string; end_time: string; status: number; order_count: number; revenue: number; }

const typeLabels: Record<number, string> = { 1: '满减券', 2: '折扣券', 3: '代金券' };
const statusLabels: Record<number, string> = { 0: '未开始', 1: '进行中', 2: '已结束' };
const typeColor: Record<string, string> = {
  '满减券': 'bg-[#FFF4E0] text-[#FF9800]', '折扣券': 'bg-[#E8EBFD] text-[#6B7FD7]',
  '代金券': 'bg-[#FFE5EE] text-[#F472B6]', '满减活动': 'bg-[#E6F9F0] text-[#10B981]',
  '折扣活动': 'bg-[#E8EBFD] text-[#6B7FD7]', '新人活动': 'bg-[#FFF4E0] text-[#FF9800]',
  '会员活动': 'bg-[#F3E8FF] text-[#8B5CF6]',
};
const statusColor: Record<string, string> = {
  '进行中': 'bg-[#E6F9F0] text-[#10B981]', '已结束': 'bg-gray-100 text-gray-500', '未开始': 'bg-[#E8EBFD] text-[#6B7FD7]',
};

export default function MarketingPage() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [overview, setOverview] = useState({ coupon_total: 0, coupon_used: 0, activity_active: 0 });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [ov, co, ac] = await Promise.all([
        marketingApi.getOverview(),
        marketingApi.getCoupons({ page: 1, page_size: 50 }),
        marketingApi.getActivities(),
      ]);
      setOverview({ coupon_total: 0, coupon_used: 0, activity_active: 0, ...((ov as any)?.data || {}) });
      const cList = (co as any)?.data?.list ?? (co as any)?.data ?? [];
      setCoupons(Array.isArray(cList) ? cList : []);
      const aList = (ac as any)?.data?.list ?? (ac as any)?.data ?? [];
      setActivities(Array.isArray(aList) ? aList : []);
    } catch {
      setOverview({ coupon_total: 0, coupon_used: 0, activity_active: 0 });
      setCoupons([]);
      setActivities([]);
    }
    finally { setLoading(false); }
  }

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">营销中心</h1>
          <p className="mt-1 text-sm text-gray-400">优惠券与营销活动管理</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" /></div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: '优惠券总数', value: overview.coupon_total.toLocaleString(), icon: Ticket, color: 'from-[#6B7FD7] to-[#8B9AE3]' },
              { label: '已使用', value: overview.coupon_used.toLocaleString(), icon: Gift, color: 'from-[#34D399] to-[#6EE7B7]' },
              { label: '活动中', value: overview.activity_active.toString(), icon: Calendar, color: 'from-[#FFB84D] to-[#FFC97A]' },
              { label: '优惠券数', value: coupons.length.toString(), unit: '种', icon: TrendingUp, color: 'from-[#F472B6] to-[#FBA3D0]' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="stat-card flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">{s.label}</div>
                    <div className="mt-1 text-2xl font-bold text-[#1F2937]">{s.value}{s.unit && <span className="ml-1 text-sm text-gray-400">{s.unit}</span>}</div>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.color}`}><Icon className="h-5 w-5 text-white" /></div>
                </div>
              );
            })}
          </div>

          {/* 营销活动 */}
          <div className="admin-card mb-6 overflow-hidden">
            <div className="border-b border-[#EEF1F6] px-5 py-4"><h3 className="text-base font-semibold text-[#1F2937]">营销活动</h3></div>
            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
              {activities.length === 0 ? (
                <div className="col-span-full py-8 text-center text-sm text-gray-400">暂无营销活动</div>
              ) : (
                activities.map((a) => {
                  const stLabel = statusLabels[a.status] || '未知';
                  return (
                    <div key={a.id} className="rounded-xl border border-[#EEF1F6] p-4 transition-all hover:border-[#C9D1FA] hover:shadow-soft">
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColor[a.type] || 'bg-gray-100 text-gray-500'}`}>{a.type}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[stLabel]}`}>{stLabel}</span>
                      </div>
                      <h4 className="mt-2 font-semibold text-[#1F2937]">{a.name}</h4>
                      <div className="mt-1 text-xs text-gray-400">{a.start_time?.slice(0, 10)} ~ {a.end_time?.slice(0, 10)}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#F5F7FA] pt-3">
                        <div><div className="text-[11px] text-gray-400">订单数</div><div className="mt-0.5 text-sm font-semibold text-[#1F2937]">{a.order_count}</div></div>
                        <div><div className="text-[11px] text-gray-400">销售额</div><div className="mt-0.5 text-sm font-semibold text-[#1F2937]">¥{(a.revenue || 0).toLocaleString()}</div></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 优惠券列表 */}
          <div className="admin-card overflow-hidden">
            <div className="border-b border-[#EEF1F6] px-5 py-4"><h3 className="text-base font-semibold text-[#1F2937]">优惠券管理</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFBFC] text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">优惠券名称</th>
                    <th className="px-3 py-3 font-medium">类型</th>
                    <th className="px-3 py-3 font-medium">面额/折扣</th>
                    <th className="px-3 py-3 font-medium">使用条件</th>
                    <th className="px-3 py-3 font-medium">发放/使用</th>
                    <th className="px-3 py-3 font-medium">使用率</th>
                    <th className="px-3 py-3 font-medium">有效期</th>
                    <th className="px-3 py-3 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">暂无优惠券</td></tr>
                  ) : (
                    coupons.map((c) => {
                      const tpLabel = typeLabels[c.type] || '未知';
                      const stLabel = statusLabels[c.status] || '未知';
                      const usageRate = c.total_count > 0 ? ((c.receive_count / c.total_count) * 100).toFixed(1) : '0';
                      return (
                        <tr key={c.id} className="border-t border-[#F5F7FA] hover:bg-[#FAFBFC]">
                          <td className="px-5 py-3 font-medium text-[#1F2937]">{c.name}</td>
                          <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${typeColor[tpLabel]}`}>{tpLabel}</span></td>
                          <td className="px-3 py-3 font-semibold text-[#FF6B6B]">{c.type === 2 ? `${c.value}折` : `¥${c.value}`}</td>
                          <td className="px-3 py-3 text-gray-600">{c.min_amount > 0 ? `满${c.min_amount}可用` : '无门槛'}</td>
                          <td className="px-3 py-3 text-gray-600">{c.receive_count} / {c.total_count}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#F5F7FA]">
                                <div className="h-full bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3]" style={{ width: `${usageRate}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{usageRate}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500">{c.end_time?.slice(0, 10) || '--'}</td>
                          <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor[stLabel]}`}>{stLabel}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

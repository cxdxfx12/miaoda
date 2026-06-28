'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { marketingApi } from '@/api';
import { Gift, Loader2, Search, Users, CheckCircle2, Clock } from 'lucide-react';

const statusMap: Record<number, { text: string; cls: string }> = {
  0: { text: '已注册', cls: 'bg-[#FFF7E6] text-[#F59E0B]' },
  1: { text: '首单完成', cls: 'bg-[#E8EBFD] text-[#6B7FD7]' },
  2: { text: '奖励已发放', cls: 'bg-[#E6F9F0] text-[#10B981]' },
};

export default function InviteAdminPage() {
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState(-1);
  const [rows, setRows] = useState<any[]>([]);
  const [overview, setOverview] = useState({ total: 0, pending: 0, rewarded: 0 });

  async function loadData() {
    setLoading(true);
    try {
      const res: any = await marketingApi.getInvites({ page: 1, page_size: 50, status, keyword });
      const data = res?.data || {};
      setRows(Array.isArray(data.list) ? data.list : []);
      setOverview({ total: 0, pending: 0, rewarded: 0, ...(data.overview || {}) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [status]);

  return (
    <AdminLayout>
      <PageHeader
        icon={Gift}
        tag="增长工具"
        title="邀请管理"
        subtitle="管理邀请活动、邀请码和奖励发放记录"
        stats={[
          { value: String(overview.total), label: '累计邀请' },
          { value: String(overview.pending), label: '待生效' },
          { value: String(overview.rewarded), label: '已发奖励' },
        ]}
      />

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#EEF1F6] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[#1F2937]"><Gift className="h-5 w-5 text-[#6B7FD7]" />邀请记录</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadData()} placeholder="昵称/手机号/邀请码" className="h-10 w-56 rounded-xl border border-[#E6E9F2] pl-9 pr-3 text-sm outline-none focus:border-[#6B7FD7]" />
            </div>
            <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className="h-10 rounded-xl border border-[#E6E9F2] px-3 text-sm outline-none">
              <option value={-1}>全部状态</option>
              <option value={0}>已注册</option>
              <option value={1}>首单完成</option>
              <option value={2}>奖励已发放</option>
            </select>
            <button onClick={loadData} className="rounded-xl bg-[#6B7FD7] px-4 text-sm font-semibold text-white">查询</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFBFC] text-left text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">邀请码</th>
                  <th className="px-3 py-3 font-medium">邀请人</th>
                  <th className="px-3 py-3 font-medium">被邀请人</th>
                  <th className="px-3 py-3 font-medium">状态</th>
                  <th className="px-3 py-3 font-medium">注册时间</th>
                  <th className="px-3 py-3 font-medium">奖励时间</th>
                  <th className="px-3 py-3 font-medium">订单ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F7]">
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">暂无邀请记录</td></tr>
                ) : rows.map((r) => {
                  const st = statusMap[r.status] || statusMap[0];
                  return (
                    <tr key={r.id} className="hover:bg-[#FAFBFC]">
                      <td className="px-5 py-3 font-semibold text-[#6B7FD7]">{r.invite_code}</td>
                      <td className="px-3 py-3">{r.inviter_name || '-'}<div className="text-xs text-gray-400">{r.inviter_phone}</div></td>
                      <td className="px-3 py-3">{r.invitee_name || '-'}<div className="text-xs text-gray-400">{r.invitee_phone}</div></td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${st.cls}`}>{st.text}</span></td>
                      <td className="px-3 py-3 text-gray-500">{String(r.registered_at || '').slice(0, 16).replace('T', ' ')}</td>
                      <td className="px-3 py-3 text-gray-500">{r.rewarded_at ? String(r.rewarded_at).slice(0, 16).replace('T', ' ') : '-'}</td>
                      <td className="px-3 py-3 text-gray-500">{r.reward_order_id || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

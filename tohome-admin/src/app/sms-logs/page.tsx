'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Search,
  MessageSquare,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Percent,
} from 'lucide-react';
import { api } from '@/lib/api';

interface SmsLog {
  id: number;
  phone: string;
  code: string;
  type: string;
  content: string;
  provider: string;
  status: number; // 1=success, 0=fail
  ip: string;
  created_at: string;
}

interface SmsStats {
  today_sent: number;
  total_sent: number;
  success_rate: string;
}

const PAGE_SIZE = 20;


export default function SmsLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [stats, setStats] = useState<SmsStats>({ today_sent: 0, total_sent: 0, success_rate: '0%' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadStats = useCallback(async () => {
    try {
      const res: any = await api.get('/api/v1/admin/sms/stats');
      const d = res?.data || res || {};
      const totalVal = Number(d.total || 0);
      const successVal = Number(d.success || 0);
      const failVal = Number(d.fail || 0);
      const sentVal = successVal + failVal;
      const rate = sentVal > 0 ? ((successVal / sentVal) * 100).toFixed(1) + '%' : '0%';
      setStats({
        today_sent: Number(d.today_count || 0),
        total_sent: totalVal,
        success_rate: rate,
      });
    } catch {
      // backend unavailable
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));
      if (phone.trim()) params.set('phone', phone.trim());
      if (status) params.set('status', status);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const res: any = await api.get(`/api/v1/admin/sms/logs?${params.toString()}`);
      const d = res?.data || res || {};
      setLogs(Array.isArray(d.list) ? d.list : []);
      setTotal(Number(d.total || 0));
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, phone, status, startDate, endDate]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

  const handleReset = () => {
    setPhone('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const fmtTime = (t: string) => {
    if (!t) return '-';
    const d = new Date(t + 'Z'); // 后端返回的时间无时区，按 UTC 处理
    if (Number.isNaN(d.getTime())) return t;
    // 转为北京时间 UTC+8
    const bj = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    return `${bj.getFullYear()}-${String(bj.getMonth() + 1).padStart(2, '0')}-${String(bj.getDate()).padStart(2, '0')} ${String(bj.getHours()).padStart(2, '0')}:${String(bj.getMinutes()).padStart(2, '0')}:${String(bj.getSeconds()).padStart(2, '0')}`;
  };

  const statCards = [
    {
      label: '今日发送',
      value: stats.today_sent.toLocaleString(),
      icon: Send,
      gradient: 'from-[#6B7FD7] to-[#8B9AE3]',
      bg: 'bg-[#EEF2FF]',
    },
    {
      label: '总发送',
      value: stats.total_sent.toLocaleString(),
      icon: BarChart3,
      gradient: 'from-[#0F766E] to-[#14B8A6]',
      bg: 'bg-[#CCFBF1]',
    },
    {
      label: '成功率',
      value: stats.success_rate,
      icon: Percent,
      gradient: 'from-[#F59E0B] to-[#F97316]',
      bg: 'bg-[#FEF3C7]',
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        icon={MessageSquare}
        tag="系统配置"
        title="短信记录"
        subtitle="查看短信发送日志和统计数据"
      />

      {/* 统计卡片 */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="admin-card flex items-center gap-4 p-5"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.bg}`}
              >
                <Icon
                  className={`h-6 w-6 bg-gradient-to-r ${card.gradient} bg-clip-text`}
                  style={{
                    color: card.gradient === 'from-[#6B7FD7] to-[#8B9AE3]'
                      ? '#6B7FD7'
                      : card.gradient === 'from-[#0F766E] to-[#14B8A6]'
                        ? '#0F766E'
                        : '#F59E0B',
                  }}
                />
              </div>
              <div>
                <div className="text-sm text-gray-400">{card.label}</div>
                <div className="mt-1 text-2xl font-bold text-[#1F2937]">
                  {card.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 搜索栏 */}
      <div className="admin-card mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1" style={{ minWidth: 180 }}>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              手机号
            </label>
            <input
              type="text"
              placeholder="输入手机号搜索"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-10 w-full rounded-lg border border-[#EEF1F6] bg-white px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
            />
          </div>
          <div style={{ minWidth: 140 }}>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              状态
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#EEF1F6] bg-white px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
            >
              <option value="">全部</option>
              <option value="1">成功</option>
              <option value="0">失败</option>
            </select>
          </div>
          <div style={{ minWidth: 160 }}>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              开始日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#EEF1F6] bg-white px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
            />
          </div>
          <div style={{ minWidth: 160 }}>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              结束日期
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#EEF1F6] bg-white px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-4 text-sm font-medium text-white shadow-soft"
            >
              <Search className="h-4 w-4" />
              搜索
            </button>
            <button
              onClick={handleReset}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#EEF1F6] bg-white px-4 text-sm font-medium text-gray-600 hover:bg-[#F8FAFC]"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 列表表格 */}
      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            暂无短信记录
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#F5F7FA] bg-[#F8FAFC]">
                    <th className="px-5 py-3 text-left font-medium text-gray-500">
                      手机号
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500">
                      验证码
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500">
                      类型
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500">
                      内容
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500">
                      服务商
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500">
                      状态
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500">
                      IP
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500">
                      发送时间
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F7FA]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAFBFC]">
                      <td className="px-5 py-3 font-medium text-[#1F2937]">
                        {log.phone || '-'}
                      </td>
                      <td className="px-5 py-3 font-mono text-sm font-medium text-[#1F2937]">
                        {log.code || '-'}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        <span className="rounded-md bg-[#F3F4FE] px-2 py-0.5 text-[11px] font-medium text-[#6B7FD7]">
                          {log.type || '-'}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-5 py-3 text-gray-600">
                        {log.content || '-'}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {log.provider || '-'}
                      </td>
                      <td className="px-5 py-3">
                        {log.status === 1 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            成功
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                            <XCircle className="h-3.5 w-3.5" />
                            失败
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-400">
                        {log.ip || '-'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-400">
                        {fmtTime(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between border-t border-[#F5F7FA] px-5 py-4">
              <div className="text-sm text-gray-400">
                共 {total} 条记录，第 {page}/{totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EEF1F6] text-gray-500 hover:bg-[#F8FAFC] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                        page === pageNum
                          ? 'bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] text-white shadow-soft'
                          : 'border border-[#EEF1F6] text-gray-600 hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EEF1F6] text-gray-500 hover:bg-[#F8FAFC] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

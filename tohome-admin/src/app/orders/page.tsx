'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Search, Download, Filter, MoreVertical, Eye, Phone, MessageSquare, Loader2 } from 'lucide-react';
import { orderApi } from '@/api/orders';

const tabs = ['全部', '待支付', '待服务', '服务中', '已完成', '已取消', '已退款'];
const tabStatusMap: Record<string, string> = {
  '待支付': '0',
  '待服务': '1',
  '服务中': '3',
  '已完成': '4',
  '已取消': '5',
  '已退款': '6',
};

const statusLabelMap: Record<number, string> = {
  0: '待支付', 1: '待服务', 2: '已接单', 3: '服务中', 4: '已完成', 5: '已取消', 6: '已退款',
};
const statusColor: Record<string, string> = {
  '已完成': 'bg-[#E6F9F0] text-[#10B981]',
  '服务中': 'bg-[#E8EBFD] text-[#6B7FD7]',
  '待服务': 'bg-[#FFF4E0] text-[#FF9800]',
  '已接单': 'bg-[#E8EBFD] text-[#6B7FD7]',
  '待支付': 'bg-[#FFE5EE] text-[#F472B6]',
  '已取消': 'bg-gray-100 text-gray-500',
  '已退款': 'bg-red-50 text-[#EF4444]',
};

// --- Mock 数据 ---
const MOCK_ORDERS = [
  { id: 1, order_no: 'ORD202606230001', user_name: '张先生', user_phone: '13812345678', talent_name: '李达人', service_name: '中式推拿', service_spec: 60, final_amount: 298, status: 4, created_at: '2026-06-23T14:30:00' },
  { id: 2, order_no: 'ORD202606230002', user_name: '王女士', user_phone: '13987654321', talent_name: '陈达人', service_name: '精油SPA', service_spec: 90, final_amount: 398, status: 3, created_at: '2026-06-23T13:15:00' },
  { id: 3, order_no: 'ORD202606230003', user_name: '刘先生', user_phone: '18611111111', talent_name: '', service_name: '足疗按摩', service_spec: 45, final_amount: 198, status: 1, created_at: '2026-06-23T11:45:00' },
  { id: 4, order_no: 'ORD202606230004', user_name: '赵女士', user_phone: '13722222222', talent_name: '王达人', service_name: '泰式按摩', service_spec: 120, final_amount: 498, status: 4, created_at: '2026-06-23T10:20:00' },
  { id: 5, order_no: 'ORD202606220005', user_name: '孙先生', user_phone: '15633333333', talent_name: '林达人', service_name: '中式推拿', service_spec: 60, final_amount: 268, status: 5, created_at: '2026-06-22T19:00:00' },
  { id: 6, order_no: 'ORD202606220006', user_name: '杨女士', user_phone: '18544444444', talent_name: '周达人', service_name: '精油SPA', service_spec: 90, final_amount: 358, status: 3, created_at: '2026-06-22T16:30:00' },
  { id: 7, order_no: 'ORD202606220007', user_name: '周先生', user_phone: '13255555555', talent_name: '', service_name: '足疗按摩', service_spec: 45, final_amount: 198, status: 0, created_at: '2026-06-22T14:10:00' },
  { id: 8, order_no: 'ORD202606210008', user_name: '吴女士', user_phone: '18966666666', talent_name: '黄达人', service_name: '中式推拿', service_spec: 60, final_amount: 298, status: 4, created_at: '2026-06-21T20:45:00' },
  { id: 9, order_no: 'ORD202606210009', user_name: '郑先生', user_phone: '15077777777', talent_name: '马达人', service_name: '泰式按摩', service_spec: 120, final_amount: 598, status: 6, created_at: '2026-06-21T17:30:00' },
  { id: 10, order_no: 'ORD202606200010', user_name: '陈女士', user_phone: '13188888888', talent_name: '谢达人', service_name: '精油SPA', service_spec: 90, final_amount: 558, status: 4, created_at: '2026-06-20T12:00:00' },
];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [orders, setOrders] = useState<any[]>(MOCK_ORDERS);
  const [total, setTotal] = useState(MOCK_ORDERS.length);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (activeTab !== '全部') params.status = tabStatusMap[activeTab];
      if (keyword) params.keyword = keyword;
      const res: any = await orderApi.list(params);
      setOrders(res?.data?.list || []);
      setTotal(res?.data?.total || 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [activeTab, keyword]);
  useEffect(() => { fetchOrders(); }, [activeTab, keyword, page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">订单管理</h1>
          <p className="mt-1 text-sm text-gray-400">共 {total.toLocaleString()} 个订单</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-[#EEF1F6] bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-[#F3F4FE]">
            <Filter className="h-4 w-4" />筛选
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-3 py-1.5 text-sm text-white shadow-soft hover:from-[#5668C2] hover:to-[#6B7FD7]">
            <Download className="h-4 w-4" />导出
          </button>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        {/* 标签栏 */}
        <div className="flex items-center gap-1 border-b border-[#EEF1F6] px-5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === tab ? 'text-[#6B7FD7]' : 'text-gray-500 hover:text-[#1F2937]'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-[#6B7FD7]" />
              )}
            </button>
          ))}
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-3 border-b border-[#EEF1F6] px-5 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              type="text"
              placeholder="搜索订单号/用户手机号/达人姓名..."
              className="h-9 w-full rounded-md border border-[#EEF1F6] bg-[#F5F7FA] pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[#6B7FD7] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-[#6B7FD7]" />
            </div>
          ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] text-left text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                </th>
                <th className="px-3 py-3 font-medium">订单号</th>
                <th className="px-3 py-3 font-medium">用户信息</th>
                <th className="px-3 py-3 font-medium">达人</th>
                <th className="px-3 py-3 font-medium">服务项目</th>
                <th className="px-3 py-3 font-medium">金额</th>
                <th className="px-3 py-3 font-medium">支付</th>
                <th className="px-3 py-3 font-medium">状态</th>
                <th className="px-3 py-3 font-medium">下单时间</th>
                <th className="px-3 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => {
                const statusLabel = statusLabelMap[o.status] || '未知';
                const sc = statusColor[statusLabel] || 'bg-gray-100 text-gray-500';
                return (
                <tr key={o.id || i} className="border-t border-[#F5F7FA] hover:bg-[#FAFBFC]">
                  <td className="px-5 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-[#1F2937]">{o.order_no || '-'}</td>
                  <td className="px-3 py-3">
                    <div className="text-[#1F2937]">{o.user_name || '-'}</div>
                    <div className="text-xs text-gray-400">{(o.user_phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{o.talent_name || '等待派单'}</td>
                  <td className="px-3 py-3 text-gray-600">{o.service_name}{o.service_spec ? `${o.service_spec}分钟` : ''}</td>
                  <td className="px-3 py-3 font-semibold text-[#1F2937]">¥{o.final_amount || 0}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">余额</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sc}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString('zh-CN') + ' ' + new Date(o.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button title="查看" className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-[#F3F4FE] hover:text-[#6B7FD7]">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button title="电话" className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-[#F3F4FE] hover:text-[#6B7FD7]">
                        <Phone className="h-4 w-4" />
                      </button>
                      <button title="消息" className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-[#F3F4FE] hover:text-[#6B7FD7]">
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button title="更多" className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-[#F3F4FE] hover:text-[#6B7FD7]">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400 text-sm">暂无订单数据</td></tr>
              )}
            </tbody>
          </table>
          )}
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between border-t border-[#EEF1F6] px-5 py-3">
          <div className="text-xs text-gray-500">显示 {orders.length} 共 {total.toLocaleString()} 条</div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 rounded-md border border-[#EEF1F6] bg-white px-3 text-xs text-gray-600 hover:bg-[#F3F4FE] disabled:opacity-40"
            >上一页</button>
            <button className="h-8 min-w-[32px] rounded-md bg-[#6B7FD7] text-xs text-white">{page}</button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="h-8 rounded-md border border-[#EEF1F6] bg-white px-3 text-xs text-gray-600 hover:bg-[#F3F4FE] disabled:opacity-40"
            >下一页</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

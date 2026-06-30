'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Search, Download, Filter, MoreVertical, Eye, Phone, MessageSquare, Loader2, ShoppingBag } from 'lucide-react';
import { orderApi } from '@/api/orders';
import { fmtBeijingTime } from '@/lib/utils';

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
  0: '待支付', 1: '待接单', 2: '已接单', 3: '服务中',
  4: '已完成', 5: '已取消', 6: '已退款', 7: '技师已出发', 8: '技师已到达',
};
const statusColor: Record<number, string> = {
  0: 'bg-amber-50 text-amber-700',
  1: 'bg-blue-50 text-blue-700',
  2: 'bg-indigo-50 text-indigo-700',
  3: 'bg-pink-50 text-pink-700',
  4: 'bg-emerald-50 text-emerald-700',
  5: 'bg-gray-50 text-gray-600',
  6: 'bg-red-50 text-red-700',
  7: 'bg-orange-50 text-orange-700',
  8: 'bg-teal-50 text-teal-700',
};

// 订单详情抽屉
function OrderDetailDrawer({ orderId, open, onClose }: { orderId: string | null; open: boolean; onClose: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      setLoading(true);
      fetch(`/api/v1/admin/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      })
        .then(r => r.json())
        .then(data => {
          setOrder(data.data || data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [open, orderId]);

  // 订单流程时间轴
  const flowSteps = [
    { key: 'paid_at', label: '已支付', icon: '💰', color: '#F59E0B' },
    { key: 'accepted_at', label: '已接单', icon: '✅', color: '#7C5CFC' },
    { key: 'departed_at', label: '已出发', icon: '🚗', color: '#D97706' },
    { key: 'arrived_at', label: '已到达', icon: '📍', color: '#059669' },
    { key: 'start_time', label: '开始服务', icon: '🔧', color: '#EC4899' },
    { key: 'completed_at', label: '已完成', icon: '🎉', color: '#10B981' },
  ];

  const STATUS_TEXT: Record<number, string> = {
    0: '待支付', 1: '待接单', 2: '已接单', 7: '技师已出发', 8: '技师已到达',
    3: '服务中', 4: '已完成', 5: '已取消', 6: '已退款',
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'hidden'}`}>
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* 抽屉 */}
      <div className="absolute right-0 top-0 bottom-0 w-[480px] max-w-[90vw] bg-white shadow-xl flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg">订单详情</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <div className="text-center py-12 text-gray-400">加载中...</div>}
          {!loading && !order && <div className="text-center py-12 text-gray-400">订单不存在</div>}
          {order && (
            <>
              {/* 状态 */}
              <div className="mb-4">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-indigo-50 text-indigo-700">
                  {STATUS_TEXT[order.status] || '未知'}
                </span>
                <span className="ml-3 text-sm text-gray-500">{order.order_no || ''}</span>
              </div>

              {/* 时间轴 */}
              {(order.status >= 1 && order.status !== 5 && order.status !== 6) && (
                <div className="mb-6 bg-gray-50 rounded-xl p-4">
                  <div className="text-sm font-bold text-gray-700 mb-4">服务进度</div>
                  <div className="space-y-0">
                    {flowSteps.map((step, i) => {
                      const timeVal = order[step.key];
                      const stepStatus = order.status >= [1, 2, 7, 8, 3, 4][i];
                      const isLast = i === flowSteps.length - 1;
                      return (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                              timeVal ? '' : 'bg-gray-200 text-gray-400'
                            }`} style={timeVal ? { background: step.color + '20', color: step.color } : {}}>
                              {step.icon}
                            </div>
                            {!isLast && <div className={`w-0.5 h-6 ${timeVal ? 'bg-gray-300' : 'bg-gray-200'}`} />}
                          </div>
                          <div className="pb-4">
                            <div className={`text-sm ${timeVal ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>{step.label}</div>
                            {timeVal && <div className="text-xs text-gray-400 mt-0.5">{fmtBeijingTime(timeVal)}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 订单信息 */}
              <div className="space-y-3">
                {[
                  { label: '服务项目', value: order.service_name },
                  { label: '用户', value: order.user_name != null && typeof order.user_name === 'object' ? (order.user_name.String || '待分配') : (order.user_name || '待分配') },
                  { label: '达人', value: order.technician_name != null && typeof order.technician_name === 'object' ? (order.technician_name.String || '待分配') : (order.technician_name || '待分配') },
                  { label: '服务城市', value: order.city != null && typeof order.city === 'object' ? (order.city.String || '-') : (order.city || '-') },
                  { label: '服务地址', value: order.address },
                  { label: '预约时间', value: fmtBeijingTime(order.appointment_time) },
                  { label: '订单金额', value: `¥${order.amount || 0}` },
                  { label: '车费', value: order.travel_fee ? `¥${order.travel_fee}` : '-' },
                  { label: '合计支付', value: order.total_amount ? `¥${order.total_amount}` : '-' },
                  { label: '下单时间', value: fmtBeijingTime(order.created_at) },
                  { label: '支付时间', value: fmtBeijingTime(order.paid_at) },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className="text-sm font-medium text-gray-800">{item.value || '-'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
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

  const safeStr = (v: any, fallback = '-') => {
    if (v == null) return fallback;
    if (typeof v === 'object') return v.String || fallback;
    return v || fallback;
  };

  return (
    <AdminLayout>
      <PageHeader
        icon={ShoppingBag}
        tag="订单中心"
        title="订单管理"
        subtitle="管理和追踪所有服务订单，支持按状态筛选、关键词搜索和详情查看"
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/20">
              <Filter className="h-4 w-4" />筛选
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/30">
              <Download className="h-4 w-4" />导出
            </button>
          </div>
        }
      />

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
                const sc = statusColor[o.status] || 'bg-gray-100 text-gray-500';
                return (
                <tr key={o.id || i} className="border-t border-[#F5F7FA] hover:bg-[#FAFBFC] cursor-pointer" onClick={() => setDetailOrderId(String(o.id))}>
                  <td className="px-5 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-[#1F2937]">{o.order_no || '-'}</td>
                  <td className="px-3 py-3">
                    <div className="text-[#1F2937]">{safeStr(o.user_name)}</div>
                    <div className="text-xs text-gray-400">{(o.user_phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{o.talent_name || '等待派单'}</td>
                  <td className="px-3 py-3 text-gray-600">{o.service_name}{o.service_spec ? `${o.service_spec}分钟` : ''}</td>
                  <td className="px-3 py-3 font-semibold text-[#1F2937]">¥{safeStr(o.final_amount, '0')}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{o.pay_method === 2 ? '微信' : o.pay_method === 3 ? '支付宝' : '余额'}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sc}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">
                    {fmtBeijingTime(o.created_at)}
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
      <OrderDetailDrawer orderId={detailOrderId} open={!!detailOrderId} onClose={() => setDetailOrderId(null)} />
    </AdminLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { adminApi } from '@/api/admin';
import {
  Users,
  UserCog,
  ShoppingBag,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

const stats = [
  {
    title: '今日订单',
    value: '328',
    unit: '单',
    change: '+12.5%',
    trend: 'up',
    icon: ShoppingBag,
    color: 'from-[#6B7FD7] to-[#8B9AE3]',
  },
  {
    title: '今日营收',
    value: '48,256',
    unit: '元',
    change: '+8.2%',
    trend: 'up',
    icon: Wallet,
    color: 'from-[#FFB84D] to-[#FFC97A]',
  },
  {
    title: '活跃用户',
    value: '1,892',
    unit: '人',
    change: '+5.7%',
    trend: 'up',
    icon: Users,
    color: 'from-[#34D399] to-[#6EE7B7]',
  },
  {
    title: '在线达人',
    value: '156',
    unit: '人',
    change: '-2.1%',
    trend: 'down',
    icon: UserCog,
    color: 'from-[#F472B6] to-[#FBA3D0]',
  },
];

const orderTrend = [
  { date: '06-17', orders: 245, revenue: 36500 },
  { date: '06-18', orders: 268, revenue: 39800 },
  { date: '06-19', orders: 312, revenue: 46200 },
  { date: '06-20', orders: 289, revenue: 42800 },
  { date: '06-21', orders: 356, revenue: 52300 },
  { date: '06-22', orders: 298, revenue: 44500 },
  { date: '06-23', orders: 328, revenue: 48256 },
];

const orderStatus = [
  { name: '已完成', value: 156, color: '#34D399' },
  { name: '服务中', value: 48, color: '#6B7FD7' },
  { name: '待服务', value: 23, color: '#FFB84D' },
  { name: '已取消', value: 12, color: '#F472B6' },
];

const serviceType = [
  { name: '中式推拿', value: 95 },
  { name: '精油SPA', value: 78 },
  { name: '足疗按摩', value: 65 },
  { name: '泰式按摩', value: 52 },
  { name: '其他', value: 38 },
];

const recentOrders = [
  { id: 'ORD202606230001', user: '张*明', tech: '李达人', amount: 298, status: '已完成', time: '2分钟前' },
  { id: 'ORD202606230002', user: '王*华', tech: '陈达人', amount: 398, status: '服务中', time: '5分钟前' },
  { id: 'ORD202606230003', user: '刘*芳', tech: '等待派单', amount: 198, status: '待服务', time: '8分钟前' },
  { id: 'ORD202606230004', user: '陈*军', tech: '王达人', amount: 498, status: '已完成', time: '12分钟前' },
  { id: 'ORD202606230005', user: '赵*丽', tech: '林达人', amount: 268, status: '已取消', time: '15分钟前' },
  { id: 'ORD202606230006', user: '孙*伟', tech: '周达人', amount: 358, status: '服务中', time: '18分钟前' },
];

const statusColor: Record<string, { bg: string; text: string; icon: any }> = {
  '已完成': { bg: 'bg-[#E6F9F0]', text: 'text-[#10B981]', icon: CheckCircle2 },
  '服务中': { bg: 'bg-[#E8EBFD]', text: 'text-[#6B7FD7]', icon: Clock },
  '待服务': { bg: 'bg-[#FFF4E0]', text: 'text-[#FF9800]', icon: AlertCircle },
  '已取消': { bg: 'bg-[#FFE5EE]', text: 'text-[#F472B6]', icon: XCircle },
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard().then((res: any) => {
      if (res?.data?.stats) {
        const s = res.data.stats;
        stats[0].value = String(s.today_orders || 328);
        stats[1].value = String(s.today_revenue || 48256);
        stats[2].value = String(s.active_users || 1892);
        stats[3].value = String(s.online_talents || 156);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">数据概览</h1>
          <p className="mt-1 text-sm text-gray-400">2026年6月23日 · 实时数据</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button className="rounded-md border border-[#EEF1F6] bg-white px-3 py-1.5 text-gray-600 hover:bg-[#F3F4FE]">
            今日
          </button>
          <button className="rounded-md border border-[#EEF1F6] bg-white px-3 py-1.5 text-gray-600 hover:bg-[#F3F4FE]">
            本周
          </button>
          <button className="rounded-md border border-[#6B7FD7] bg-[#6B7FD7] px-3 py-1.5 text-white">
            本月
          </button>
          <button className="rounded-md border border-[#EEF1F6] bg-white px-3 py-1.5 text-gray-600 hover:bg-[#F3F4FE]">
            自定义
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          const TrendIcon = s.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={i} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500">{s.title}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#1F2937]">{s.value}</span>
                    <span className="text-sm text-gray-400">{s.unit}</span>
                  </div>
                  <div className={`mt-2 flex items-center gap-1 text-xs ${s.trend === 'up' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    <span>较昨日 {s.change}</span>
                  </div>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-soft`}>
                  <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 图表区域 */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="admin-card col-span-1 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#1F2937]">订单趋势</h3>
              <p className="text-xs text-gray-400">近7日订单量与营收</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={orderTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B7FD7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6B7FD7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #EEF1F6', borderRadius: 8 }}
                labelStyle={{ color: '#1F2937' }}
              />
              <Line type="monotone" dataKey="orders" stroke="#6B7FD7" strokeWidth={2.5} dot={{ r: 4, fill: '#6B7FD7' }} activeDot={{ r: 6 }} name="订单量" />
              <Line type="monotone" dataKey="revenue" stroke="#FFB84D" strokeWidth={2.5} dot={{ r: 4, fill: '#FFB84D' }} activeDot={{ r: 6 }} name="营收(元)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-card p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-[#1F2937]">订单状态</h3>
            <p className="text-xs text-gray-400">今日订单分布</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={orderStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {orderStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #EEF1F6' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {orderStatus.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="text-gray-600">{s.name}</span>
                <span className="ml-auto font-medium text-[#1F2937]">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="admin-card col-span-1 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1F2937]">最新订单</h3>
            <a className="flex items-center gap-1 text-xs text-[#6B7FD7] hover:underline" href="/orders">
              查看全部 <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EEF1F6] text-left text-xs text-gray-400">
                  <th className="py-2.5 font-medium">订单号</th>
                  <th className="py-2.5 font-medium">用户</th>
                  <th className="py-2.5 font-medium">达人</th>
                  <th className="py-2.5 font-medium">金额</th>
                  <th className="py-2.5 font-medium">状态</th>
                  <th className="py-2.5 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o, i) => {
                  const sc = statusColor[o.status];
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={i} className="border-b border-[#F5F7FA] last:border-0 hover:bg-[#FAFBFC]">
                      <td className="py-3 font-mono text-xs text-[#1F2937]">{o.id}</td>
                      <td className="py-3 text-gray-600">{o.user}</td>
                      <td className="py-3 text-gray-600">{o.tech}</td>
                      <td className="py-3 font-medium text-[#1F2937]">¥{o.amount}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${sc.bg} ${sc.text}`}>
                          <StatusIcon className="h-3 w-3" />
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-400">{o.time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card p-5">
          <h3 className="mb-1 text-base font-semibold text-[#1F2937]">服务类型分布</h3>
          <p className="mb-4 text-xs text-gray-400">近7日订单</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={serviceType} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" horizontal={false} />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={70} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #EEF1F6' }} />
              <Bar dataKey="value" fill="#6B7FD7" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="admin-card p-5">
        <h3 className="mb-4 text-base font-semibold text-[#1F2937]">快速操作</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: '新增达人', desc: '录入新达人信息', color: 'from-[#6B7FD7] to-[#8B9AE3]' },
            { label: '订单退款', desc: '处理退款申请', color: 'from-[#FFB84D] to-[#FFC97A]' },
            { label: '活动发布', desc: '创建营销活动', color: 'from-[#F472B6] to-[#FBA3D0]' },
            { label: '数据导出', desc: '导出财务报表', color: 'from-[#34D399] to-[#6EE7B7]' },
          ].map((q, i) => (
            <button
              key={i}
              className="group flex items-center gap-3 rounded-lg border border-[#EEF1F6] bg-white p-3 text-left transition-all hover:border-[#C9D1FA] hover:shadow-soft"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${q.color}`}>
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#1F2937]">{q.label}</div>
                <div className="text-[11px] text-gray-400">{q.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

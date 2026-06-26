'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { MapPin, Navigation, Phone, User, Clock, Loader2 } from 'lucide-react';
import { dispatchApi } from '@/api';

interface Order { id: number; order_no: string; user_name: string; service_name: string; service_address: any; status: number; }
interface Talent { id: number; real_name: string; avatar: string; rating: number; work_status: number; current_lat?: number; current_lng?: number; }
interface Stats { pending: number; available: number; dispatching: number; avg_response: number; }

export default function DispatchPage() {
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [availableTechs, setAvailableTechs] = useState<Talent[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, available: 0, dispatching: 0, avg_response: 0 });
  const [dispatching, setDispatching] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        dispatchApi.getOverview(),
        dispatchApi.getPendingOrders(),
      ]);
      const st = (s as any)?.data || {};
      setStats({
        pending: st.pending_count || st.pending || 0,
        available: st.available || st.available_count || 0,
        dispatching: st.dispatching || 0,
        avg_response: st.avg_response || 0,
      });
      const orders = (p as any)?.data?.list ?? [];
      setPendingOrders(Array.isArray(orders) ? orders : []);
      setAvailableTechs([]);
    } catch {
      setStats({ pending: 0, available: 0, dispatching: 0, avg_response: 0 });
      setPendingOrders([]);
      setAvailableTechs([]);
    }
    finally { setLoading(false); }
  }

  async function handleAssign(orderId: number, techId: number) {
    setDispatching(orderId);
    try {
      await dispatchApi.dispatch(orderId, techId);
      loadData();
    } catch { alert('派单失败，请检查订单和达人状态后重试'); }
    finally { setDispatching(null); }
  }

  async function handleAutoDispatch() {
    setDispatching(-1);
    try {
      await dispatchApi.autoDispatch();
      loadData();
    } catch { alert('自动派单失败，请检查待派订单和可用达人后重试'); }
    finally { setDispatching(null); }
  }

  const getAddressText = (addr: any) => {
    if (!addr) return '未知地址';
    if (typeof addr === 'string') return addr;
    const a = addr;
    return [a.city, a.district, a.detail].filter(Boolean).join(' ') || JSON.stringify(addr);
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">派单调度</h1>
          <p className="mt-1 text-sm text-gray-400">实时订单派发与达人调度</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoDispatch}
            disabled={dispatching === -1}
            className="rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-3 py-1.5 text-sm font-medium text-white shadow-soft disabled:opacity-60"
          >
            {dispatching === -1 ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : null}自动派单
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" /></div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: '待派订单', value: stats.pending.toString(), color: 'from-[#FFB84D] to-[#FFC97A]' },
              { label: '可派达人', value: stats.available.toString(), color: 'from-[#34D399] to-[#6EE7B7]' },
              { label: '派单中', value: stats.dispatching.toString(), color: 'from-[#6B7FD7] to-[#8B9AE3]' },
              { label: '平均响应', value: stats.avg_response.toString(), unit: '秒', color: 'from-[#F472B6] to-[#FBA3D0]' },
            ].map((s, i) => (
              <div key={i} className="stat-card flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">{s.label}</div>
                  <div className="mt-1 text-2xl font-bold text-[#1F2937]">{s.value}{s.unit && <span className="ml-1 text-sm text-gray-400">{s.unit}</span>}</div>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.color}`} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="admin-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#1F2937]">待派订单</h3>
                <span className="rounded-full bg-[#FFF4E0] px-2 py-0.5 text-[11px] font-medium text-[#FF9800]">{pendingOrders.length} 个待处理</span>
              </div>
              {pendingOrders.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">暂无待派订单</div>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.map((o) => (
                    <div key={o.id} className="rounded-lg border border-[#EEF1F6] bg-white p-3 transition-all hover:shadow-soft">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[#1F2937]">{o.order_no}</span>
                        <div className="flex items-center gap-1 text-xs text-gray-400"><Clock className="h-3 w-3" />待接单</div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-[#1F2937]">{o.user_name}</span>
                        <span className="text-xs text-gray-400">· {o.service_name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />{getAddressText(o.service_address)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#1F2937]">可派达人</h3>
                <span className="rounded-full bg-[#E6F9F0] px-2 py-0.5 text-[11px] font-medium text-[#10B981]">{availableTechs.length} 人可用</span>
              </div>
              {availableTechs.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">请先选择待派订单查看可派达人</div>
              ) : (
                <div className="space-y-3">
                  {availableTechs.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[#EEF1F6] bg-white p-3 transition-all hover:border-[#C9D1FA] hover:shadow-soft">
                      <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6B7FD7] to-[#8B9AE3] text-base font-bold text-white">
                          {t.real_name?.charAt(0) || '?'}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${t.work_status === 1 ? 'bg-[#10B981]' : 'bg-[#6B7FD7]'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[#1F2937]">{t.real_name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-0.5"><span className="text-[#FFB84D]">★</span>{t.rating?.toFixed(1) || '5.0'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <button className="rounded-md bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-2.5 py-1 text-xs text-white">派 单</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

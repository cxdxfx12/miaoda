// 订单API
import { api } from './client';

export interface Order {
  id: number;
  order_no: string;
  user_id: number;
  user_name: string;
  user_phone: string;
  talent_id: number;
  talent_name: string;
  talent_phone: string;
  service_id: number;
  service_name: string;
  service_spec: string;
  service_duration: number;
  service_address: {
    province: string;
    city: string;
    district: string;
    detail: string;
    lat: number;
    lng: number;
  };
  appointment_time: string;
  start_time: string;
  end_time: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  status: number;
  remark: string;
  created_at: string;
}

export interface OrderTimeline {
  status: number;
  status_text: string;
  time: string;
}

export const orderApi = {
  // 创建订单
  createOrder: (data: {
    service_id: number;
    spec_name: string;
    talent_id?: number;
    appointment_time: string;
    address: any;
    contact_name: string;
    contact_phone: string;
    remark?: string;
    coupon_id?: number;
  }) => api.post<{ data: Order }>('/orders', data),

  // 订单列表
  listOrders: (params: {
    status?: number[];
    page?: number;
    page_size?: number;
  }) => api.get<{ data: { list: Order[]; total: number } }>('/orders', { params }),

  // 订单详情
  getOrderDetail: (id: number) =>
    api.get<{ data: Order & { timeline: OrderTimeline[] } }>(`/orders/${id}`),

  // 取消订单
  cancelOrder: (id: number, reason: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),

  // 支付订单
  payOrder: (id: number, payMethod: number, payChannel: string) =>
    api.post(`/orders/${id}/pay`, { pay_method: payMethod, pay_channel: payChannel }),

  // 评价订单
  reviewOrder: (id: number, data: {
    rating: number;
    content: string;
    tags?: string[];
    images?: string[];
    is_anonymous?: boolean;
  }) => api.post(`/orders/${id}/review`, data),

  // 加时申请
  requestExtraTime: (id: number, extraMinutes: number, extraAmount: number) =>
    api.post(`/orders/${id}/extra-time`, {
      extra_minutes: extraMinutes,
      extra_amount: extraAmount,
    }),
};

// 支付API
import { api } from './client';

export interface Payment {
  id: number;
  payment_no: string;
  order_id: number;
  order_no: string;
  amount: number;
  pay_method: number;
  pay_channel: string;
  status: number;
  pay_params?: any;
}

export const paymentApi = {
  // 创建支付
  createPayment: (orderId: number, payMethod: number, payChannel: string) =>
    api.post<{ data: Payment }>('/payments/create', {
      order_id: orderId,
      pay_method: payMethod,
      pay_channel: payChannel,
    }),

  // 查询支付状态
  getPayment: (id: number) => api.get<{ data: Payment }>(`/payments/${id}`),
};

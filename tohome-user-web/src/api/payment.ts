import { api } from './client';

export const paymentApi = {
  create: (data: { order_id: number; pay_method: number; client_ip?: string }) => api.post('/payments/create', data),
  simulateSuccess: (paymentNo: string) => api.post(`/payments/${paymentNo}/simulate-success`),
};

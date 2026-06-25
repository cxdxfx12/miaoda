import { api } from '@/lib/api';

export interface OrderListParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  status?: string;
  pay_method?: string;
  start_date?: string;
  end_date?: string;
}

export const orderApi = {
  list: (params?: OrderListParams) =>
    api.get('/api/v1/admin/orders', { params }),

  detail: (id: string) =>
    api.get(`/api/v1/admin/orders/${id}`),

  refund: (id: string, reason?: string) =>
    api.post(`/api/v1/admin/orders/${id}/refund`, { reason }),

  export: (params?: OrderListParams) =>
    api.get('/api/v1/admin/orders/export', { params, responseType: 'blob' }),
};

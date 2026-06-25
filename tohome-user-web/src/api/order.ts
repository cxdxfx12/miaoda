import { api } from './client';

export const orderApi = {
  create: (data: any) => api.post('/orders', data),
  list: (params?: any) => api.get('/orders', params),
  detail: (id: number) => api.get(`/orders/${id}`),
  cancel: (id: number) => api.post(`/orders/${id}/cancel`),
  pay: (id: number) => api.post(`/orders/${id}/pay`),
  review: (id: number, data: any) => api.post(`/orders/${id}/review`, data),
};

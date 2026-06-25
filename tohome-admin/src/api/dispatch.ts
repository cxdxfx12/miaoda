import { api } from '@/lib/api';

export const dispatchApi = {
  getOverview: () =>
    api.get('/api/v1/admin/dispatch/stats'),

  getPendingOrders: () =>
    api.get('/api/v1/admin/dispatch/pending'),

  getAvailableTechs: (orderId: number) =>
    api.get(`/api/v1/admin/dispatch/available-talents/${orderId}`),

  dispatch: (orderId: number, techId: number) =>
    api.post('/api/v1/admin/dispatch/assign', { order_id: orderId, talent_id: techId }),

  autoDispatch: () =>
    api.post('/api/v1/admin/dispatch/auto'),
};

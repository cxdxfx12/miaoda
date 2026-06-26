import { api } from '@/lib/api';

export type MobilePermission =
  | 'dashboard'
  | 'cities'
  | 'orders'
  | 'talents'
  | 'talent-review'
  | 'users'
  | 'services'
  | 'finance'
  | 'dispatch'
  | 'reviews'
  | 'marketing'
  | 'banners'
  | 'analytics';

export const mobileAdminApi = {
  me: () => api.get('/api/v1/admin/mobile/me'),
  overview: () => api.get('/api/v1/admin/mobile/overview'),
  orders: (params?: Record<string, unknown>) => api.get('/api/v1/admin/mobile/orders', { params }),
  talents: () => api.get('/api/v1/admin/mobile/talents'),
  users: () => api.get('/api/v1/admin/mobile/users'),
  admins: () => api.get('/api/v1/admin/mobile/admins'),
  createAdmin: (data: Record<string, unknown>) => api.post('/api/v1/admin/mobile/admins', data),
  updateAdmin: (id: number, data: Record<string, unknown>) => api.put(`/api/v1/admin/mobile/admins/${id}`, data),
};

import { api } from '@/lib/api';

export const adminApi = {
  login: (username: string, password: string) =>
    api.post('/api/v1/admin/auth/login', { username, password }),

  getDashboard: () =>
    api.get('/api/v1/admin/dashboard'),

  getStats: (period: string) =>
    api.get('/api/v1/admin/stats', { params: { period } }),

  getServiceStatus: () =>
    api.get('/api/v1/admin/services/status'),

  backup: () =>
    api.post('/api/v1/admin/backup'),
};

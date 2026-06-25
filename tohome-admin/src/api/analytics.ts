import { api } from '@/lib/api';

export const analyticsApi = {
  getRevenue: (months?: number) =>
    api.get('/api/v1/admin/analytics/revenue', { params: { months: months || 6 } }),

  getUsers: (days?: number) =>
    api.get('/api/v1/admin/analytics/users', { params: { days: days || 7 } }),

  getCities: () =>
    api.get('/api/v1/admin/analytics/cities'),

  getFinanceOverview: () =>
    api.get('/api/v1/admin/finance/overview'),

  getFinanceTrend: (months?: number) =>
    api.get('/api/v1/admin/finance/trend', { params: { months: months || 6 } }),
};

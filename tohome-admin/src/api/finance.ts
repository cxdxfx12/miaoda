import { api } from '@/lib/api';

export interface FinanceListParams {
  page?: number;
  page_size?: number;
  type?: string;
  start_date?: string;
  end_date?: string;
}

export const financeApi = {
  getOverview: () =>
    api.get('/api/v1/admin/finance/overview'),

  getTrend: (months?: number) =>
    api.get('/api/v1/admin/finance/trend', { params: { months } }),

  getTransactions: (params?: FinanceListParams) =>
    api.get('/api/v1/admin/finance/transactions', { params }),

  export: (params?: FinanceListParams) =>
    api.get('/api/v1/admin/finance/export', { params, responseType: 'blob' }),
};

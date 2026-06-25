// 达人端 API
import { api } from './client';

export interface TalentInfo {
  id: number;
  real_name: string;
  avatar: string;
  phone: string;
  rating: number;
  service_count: number;
  balance: number;
  total_income: number;
  work_status: number;
}

export const techApi = {
  // 获取达人资料
  getProfile: () => api.get<{ data: TalentInfo }>('/talent/profile'),

  // 更新工作状态
  updateWorkStatus: (status: number) => api.post('/talent/status', { status }),

  // 获取收入统计
  getIncomeStatistics: () => api.get<any>('/talent/income/statistics'),

  // 获取收入记录
  getIncomeRecords: (page: number) => api.get<any>('/talent/income/records', { params: { page } }),

  // 申请提现
  requestWithdraw: (data: { amount: number; bank_name: string; bank_account: string; account_name: string }) =>
    api.post('/talent/income/withdraw', data),

  // 获取工作台数据
  getDashboard: () => api.get<any>('/talent/dashboard'),
};

export const talentOrderApi = {
  // 待接订单
  getPending: () => api.get<any>('/talent/orders/pending'),

  // 当前订单
  getCurrent: () => api.get<any>('/talent/orders/current'),

  // 接单
  accept: (id: number) => api.post(`/talent/orders/${id}/accept`),

  // 拒单
  reject: (id: number, reason: string) => api.post(`/talent/orders/${id}/reject`, { reason }),

  // 更新订单状态
  updateStatus: (id: number, status: string, lat?: number, lng?: number) =>
    api.post(`/talent/orders/${id}/status`, { status, lat, lng }),

  // 更新位置
  updateLocation: (lat: number, lng: number) => api.post('/talent/location', { lat, lng }),
};

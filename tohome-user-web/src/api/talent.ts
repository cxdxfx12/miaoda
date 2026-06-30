import { api } from './client';

export const talentApi = {
  nearby: (params: any) => api.get('/talents/nearby', params),
  detail: (id: number) => api.get(`/talents/${id}`),
  reviews: (id: number) => api.get(`/talents/${id}/reviews`),
  apply: (data: {
    real_name: string;
    id_card: string;
    gender: number;
    birthday: string;
    phone: string;
    avatar?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    skills: number[];
    certificates?: string[];
    life_photos?: string[];
    art_photos?: string[];
    service_city: string;
    service_districts: string[];
    introduction?: string;
  }) => api.post('/user/talent/apply', data),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/user/talent/upload', formData);
  },
  // 达人工作台接口（需要达人身份token）
  profile: () => api.get('/talent/profile'),
  updateProfile: (data: any) => api.put('/talent/profile', data),
  dashboard: () => api.get('/talent/dashboard'),
  incomeStats: () => api.get('/talent/income/statistics'),
  updateWorkStatus: (status: number) => api.post('/talent/status', { status }),

  // 订单池 / 抢单
  grabPoolList: (params?: { filter?: string; page?: number; page_size?: number; lat?: number; lng?: number }) =>
    api.get('/talent/grab-pool/list', params),
  grabPoolStats: () => api.get('/talent/grab-pool/stats'),
  grabOrder: (orderId: number) => api.post(`/talent/grab-pool/${orderId}/grab`, {}),

  // 我的订单
  pendingOrders: () => api.get('/talent/orders/pending'),
  currentOrder: () => api.get('/talent/orders/current'),
  acceptOrder: (id: number) => api.post(`/talent/orders/${id}/accept`, {}),
  rejectOrder: (id: number, reason: string) => api.post(`/talent/orders/${id}/reject`, { reason }),
  updateOrderStatus: (id: number, status: number) => api.post(`/talent/orders/${id}/status`, { status }),

  // 服务项目
  serviceCategories: () => api.get('/services/categories'),
  serviceList: (params?: { category_id?: number; keyword?: string; page?: number; page_size?: number }) =>
    api.get('/services', params),
  myServices: () => api.get('/talent/center/services'),
  addMyService: (serviceId: number, customPrice?: number) =>
    api.post('/talent/center/services', { service_id: serviceId, custom_price: customPrice }),
  removeMyService: (serviceId: number) => api.delete(`/talent/center/services/${serviceId}`),

  // 收入 / 提现
  incomeRecords: (params?: { page?: number; page_size?: number }) =>
    api.get('/talent/income/records', params),
  withdraw: (data: { amount: number; bank_name?: string; bank_account?: string; account_name?: string }) =>
    api.post('/talent/center/withdraws', data),
  withdrawList: (params?: { page?: number; page_size?: number }) =>
    api.get('/talent/center/withdraws', params),

  // 位置上报
  updateLocation: (lat: number, lng: number) => api.post('/talent/location', { lat, lng }),

  // 服务地址管理
  addresses: () => api.get('/talent/center/addresses'),
  addAddress: (data: any) => api.post('/talent/center/addresses', data),
  updateAddress: (id: number, data: any) => api.put(`/talent/center/addresses/${id}`, data),
  deleteAddress: (id: number) => api.delete(`/talent/center/addresses/${id}`),
  setDefaultAddress: (id: number) => api.put(`/talent/center/addresses/${id}/default`, {}),
};

import { api } from '@/lib/api';

export const configApi = {
  getMapConfig: () =>
    api.get('/api/v1/admin/config/map'),

  saveMapConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/map', data),

  getPaymentConfig: () =>
    api.get('/api/v1/admin/config/payment'),

  savePaymentConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/payment', data),

  getPhoneConfig: () =>
    api.get('/api/v1/admin/config/phone'),

  savePhoneConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/phone', data),

  testPhoneConnection: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/phone/test', data),

  // 微信服务号配置
  getWechatConfig: () =>
    api.get('/api/v1/admin/config/wechat_mp'),

  saveWechatConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/wechat_mp', data),
};

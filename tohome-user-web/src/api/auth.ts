import { api } from './client';

export const authApi = {
  sendSms: (phone: string) => api.post('/auth/sms/send', { phone }),
  login: (phone: string, code: string) => api.post('/auth/login', { phone, code }),
  getWechatConfig: () => api.get('/auth/wechat/config'),
  wechatLogin: (code: string, state?: string) => api.post('/auth/wechat/login', { code, state }),
  logout: () => api.post('/user/logout'),
};

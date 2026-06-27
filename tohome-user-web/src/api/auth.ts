import { api } from './client';

export const authApi = {
  sendSms: (phone: string) => api.post('/auth/sms/send', { phone }),
  login: (phone: string, code: string, inviteCode?: string) => api.post('/auth/login', { phone, code, invite_code: inviteCode }),
  getWechatConfig: () => api.get('/auth/wechat/config'),
  wechatLogin: (code: string, state?: string, inviteCode?: string) => api.post('/auth/wechat/login', { code, state, invite_code: inviteCode }),
  logout: () => api.post('/user/logout'),
};

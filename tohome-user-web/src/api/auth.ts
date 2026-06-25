import { api } from './client';

export const authApi = {
  sendSms: (phone: string) => api.post('/auth/sms/send', { phone }),
  login: (phone: string, code: string) => api.post('/auth/login', { phone, code }),
  logout: () => api.post('/user/logout'),
};

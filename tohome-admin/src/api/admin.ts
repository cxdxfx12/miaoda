import { api } from '@/lib/api';

export const adminApi = {
  login: (username: string, password: string) =>
    api.post('/api/v1/admin/auth/login', { username, password }),

  getProfile: () =>
    api.get('/api/v1/admin/profile'),

  updateProfile: (data: { nickname: string; email?: string; phone?: string; avatar?: string }) =>
    api.put('/api/v1/admin/profile', data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/v1/admin/upload', formData);
  },

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/api/v1/admin/profile/password', {
      old_password: oldPassword,
      new_password: newPassword,
    }),

  getDashboard: () =>
    api.get('/api/v1/admin/dashboard'),

  getStats: (period: string) =>
    api.get('/api/v1/admin/stats', { params: { period } }),

  getServiceStatus: () =>
    api.get('/api/v1/admin/services/status'),

  backup: () =>
    api.post('/api/v1/admin/backup'),
};

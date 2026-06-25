import { api } from '@/lib/api';

export const settingsApi = {
  getBasic: () =>
    api.get('/api/v1/admin/settings/basic'),

  saveBasic: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/settings/basic', data),

  getNotify: () =>
    api.get('/api/v1/admin/settings/notify'),

  saveNotify: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/settings/notify', data),

  getSecurity: () =>
    api.get('/api/v1/admin/settings/security'),

  saveSecurity: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/settings/security', data),

  getSupport: () =>
    api.get('/api/v1/admin/settings/support'),

  saveSupport: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/settings/support', data),

  getBackups: () =>
    api.get('/api/v1/admin/settings/backups'),

  createBackup: () =>
    api.post('/api/v1/admin/settings/backups'),

  getServerStatus: () =>
    api.get('/api/v1/admin/settings/server-status'),
};

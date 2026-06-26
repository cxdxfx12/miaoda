import { api } from '@/lib/api';

export const settingsApi = {
  getBasic: () =>
    api.get('/api/v1/admin/settings/basic'),

  saveBasic: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/settings/basic', data),

  getSite: () =>
    api.get('/api/v1/admin/settings/site'),

  saveSite: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/settings/site', data),

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

  getCommission: () =>
    api.get('/api/v1/admin/settings/commission'),

  saveCommission: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/settings/commission', data),

  getTravelFee: () =>
    api.get('/api/v1/admin/settings/travel_fee'),

  saveTravelFee: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/settings/travel_fee', data),

  getWeCom: () =>
    api.get('/api/v1/admin/settings/wecom'),

  saveWeCom: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/settings/wecom', data),

  testWeCom: (data?: Record<string, unknown>) =>
    api.post('/api/v1/admin/settings/wecom/test', data || {}),

  getBackups: () =>
    api.get('/api/v1/admin/settings/backups'),

  createBackup: () =>
    api.post('/api/v1/admin/settings/backups'),

  getServerStatus: () =>
    api.get('/api/v1/admin/settings/server-status'),
};

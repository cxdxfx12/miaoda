import { api } from './client';

export const inviteApi = {
  getMine: () => api.get('/user/invite'),
  validate: (code: string) => api.get('/auth/invite/validate', { code }),
};

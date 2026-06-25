import { api } from './client';

export const serviceApi = {
  listCategories: () => api.get('/services/categories'),
  listServices: (params?: any) => api.get('/services', params),
  getServiceDetail: (id: number) => api.get(`/services/${id}`),
};

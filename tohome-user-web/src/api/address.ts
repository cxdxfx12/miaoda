import { api } from './client';

export type UserAddressPayload = {
  contact_name: string;
  contact_phone: string;
  province?: string;
  city: string;
  district?: string;
  detail: string;
  lat?: number | null;
  lng?: number | null;
  is_default?: number;
  tag?: string | null;
};

export const addressApi = {
  list: () => api.get('/user/addresses'),
  create: (data: UserAddressPayload) => api.post('/user/addresses', data),
  update: (id: number, data: UserAddressPayload) => api.put(`/user/addresses/${id}`, data),
  remove: (id: number) => api.delete(`/user/addresses/${id}`),
  setDefault: (id: number) => api.put(`/user/addresses/${id}/default`, {}),
};

import { api } from '@/lib/api';

export interface UserListParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  level?: string;
  status?: string;
}

export interface UserCreateParams {
  phone: string;
  nickname: string;
  password: string;
  gender: number;
  avatar?: string;
  city?: string;
  member_level?: number;
}

export const userApi = {
  list: (params?: UserListParams) =>
    api.get('/api/v1/admin/users', { params }),

  detail: (id: number) =>
    api.get(`/api/v1/admin/users/${id}`),

  create: (data: UserCreateParams) =>
    api.post('/api/v1/admin/users', data),

  update: (id: number, data: Partial<UserCreateParams>) =>
    api.put(`/api/v1/admin/users/${id}`, data),

  disable: (id: number) =>
    api.post(`/api/v1/admin/users/${id}/disable`),

  enable: (id: number) =>
    api.post(`/api/v1/admin/users/${id}/enable`),

  delete: (id: number) =>
    api.delete(`/api/v1/admin/users/${id}`),
};

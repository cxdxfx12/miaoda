// 用户API
import { api } from './client';

export interface UserInfo {
  id: number;
  phone: string;
  nickname: string;
  avatar: string;
  gender: number;
  member_level: number;
  member_points: number;
  status: number;
}

export interface Address {
  id: number;
  user_id: number;
  contact_name: string;
  contact_phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  lat: number;
  lng: number;
  is_default: number;
  tag: string;
}

export const userApi = {
  // 获取用户信息
  getUserInfo: () => api.get<{ data: UserInfo }>('/user/info'),

  // 更新用户信息
  updateUserInfo: (data: Partial<UserInfo>) =>
    api.put('/user/info', data),

  // 修改密码
  updatePassword: (oldPassword: string, newPassword: string) =>
    api.put('/user/password', { old_password: oldPassword, new_password: newPassword }),

  // 地址列表
  listAddresses: () => api.get<{ data: Address[] }>('/user/addresses'),

  // 创建地址
  createAddress: (data: Omit<Address, 'id' | 'user_id'>) =>
    api.post<{ data: Address }>('/user/addresses', data),

  // 更新地址
  updateAddress: (id: number, data: Partial<Address>) =>
    api.put(`/user/addresses/${id}`, data),

  // 删除地址
  deleteAddress: (id: number) => api.delete(`/user/addresses/${id}`),

  // 设置默认地址
  setDefaultAddress: (id: number) => api.put(`/user/addresses/${id}/default`),
};

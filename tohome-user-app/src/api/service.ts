// 服务API
import { api } from './client';

export interface ServiceCategory {
  id: number;
  name: string;
  icon: string;
  sort_order: number;
}

export interface ServiceSpec {
  name: string;
  price: number;
  duration: number;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  cover_image: string;
  images: string[];
  category_id: number;
  base_price: number;
  original_price: number;
  specs: ServiceSpec[];
  rating: number;
  order_count: number;
  category?: ServiceCategory;
}

export interface Talent {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  service_count: number;
  skills: string[];
  distance?: number;
  work_status: number;
  introduction?: string;
}

export const serviceApi = {
  // 分类列表
  listCategories: () => api.get<{ data: ServiceCategory[] }>('/services/categories'),

  // 服务列表
  listServices: (params: {
    category_id?: number;
    keyword?: string;
    page?: number;
    page_size?: number;
  }) => api.get<{ data: { list: Service[]; total: number } }>('/services', { params }),

  // 服务详情
  getServiceDetail: (id: number) =>
    api.get<{ data: Service }>(`/services/${id}`),

  // 附近达人
  getNearbyTalents: (params: {
    lat: number;
    lng: number;
    service_id?: number;
    radius?: number;
  }) => api.get<{ data: Talent[] }>('/talents/nearby', { params }),

  // 达人详情
  getTalentDetail: (id: number) =>
    api.get<{ data: Talent }>(`/talents/${id}`),
};

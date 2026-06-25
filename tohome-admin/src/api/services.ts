import { api } from '@/lib/api';

export interface ServiceSpec {
  name: string;
  price: number;
  duration: number;
}

export interface ServiceItem {
  id: number;
  name: string;
  description: string;
  cover_image: string;
  images: string[];
  category_id: number;
  base_price: number;
  original_price: number;
  specs: ServiceSpec[];
  status: number;
  sort_order: number;
  order_count: number;
  view_count: number;
  category_name?: string;
  category_icon?: string;
}

export interface ServiceCategory {
  id: number;
  name: string;
  icon: string;
  sort_order: number;
  status: number;
}

export interface ServiceListParams {
  page?: number;
  page_size?: number;
  category_id?: number;
  keyword?: string;
}

export const serviceApi = {
  /* ---- 分类管理 ---- */
  getCategories: () =>
    api.get('/api/v1/admin/services/categories'),

  saveCategory: (data: Partial<ServiceCategory>) =>
    api.post('/api/v1/admin/services/categories', data),

  updateCategory: (id: number, data: Partial<ServiceCategory>) =>
    api.put(`/api/v1/admin/services/categories/${id}`, data),

  deleteCategory: (id: number) =>
    api.delete(`/api/v1/admin/services/categories/${id}`),

  /* ---- 服务项目管理 ---- */
  getServices: (params?: ServiceListParams) =>
    api.get('/api/v1/admin/services', { params }),

  getServiceDetail: (id: number) =>
    api.get(`/api/v1/admin/services/${id}`),

  saveService: (data: Partial<ServiceItem>) =>
    api.post('/api/v1/admin/services', data),

  updateService: (id: number, data: Partial<ServiceItem>) =>
    api.put(`/api/v1/admin/services/${id}`, data),

  deleteService: (id: number) =>
    api.delete(`/api/v1/admin/services/${id}`),

  /* ---- 图片上传 ---- */
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/v1/admin/upload', formData);
  },
};

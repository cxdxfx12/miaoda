import { api } from '@/lib/api';

export interface CouponListParams {
  page?: number;
  page_size?: number;
  type?: string;
  status?: string;
}

export interface BannerItem {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  sort: number;
  status: number;
  theme_color: string;
  icon: string;
}

export const marketingApi = {
  getOverview: () =>
    api.get('/api/v1/admin/marketing/overview'),

  getCoupons: (params?: CouponListParams) =>
    api.get('/api/v1/admin/marketing/coupons', { params }),

  getActivities: () =>
    api.get('/api/v1/admin/marketing/activities'),

  /* ---- 轮播图管理 ---- */
  getBanners: () =>
    api.get('/api/v1/admin/marketing/banners'),

  saveBanner: (data: Partial<BannerItem>) =>
    api.post('/api/v1/admin/marketing/banners', data),

  deleteBanner: (id: number) =>
    api.delete(`/api/v1/admin/marketing/banners/${id}`),

  updateBanner: (id: number, data: Partial<BannerItem>) =>
    api.put(`/api/v1/admin/marketing/banners/${id}`, data),

  /** 轮播图图片上传（复用通用上传接口） */
  uploadBannerImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/v1/admin/upload', formData);
  },
};

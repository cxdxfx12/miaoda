import { api } from '@/lib/api';

export interface ReviewListParams {
  page?: number;
  page_size?: number;
  rating?: number;
  tech_id?: number;
  reply_status?: string;
}

export const reviewApi = {
  getOverview: () =>
    api.get('/api/v1/admin/reviews/overview'),

  list: (params?: ReviewListParams) =>
    api.get('/api/v1/admin/reviews', { params }),

  reply: (id: number, content: string) =>
    api.post(`/api/v1/admin/reviews/${id}/reply`, { content }),
};

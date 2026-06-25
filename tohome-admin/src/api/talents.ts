import { api } from '@/lib/api';

export interface TalentListParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  status?: string;
  level?: string;
  city?: string;
}

export interface CreateTalentParams {
  real_name: string;
  phone: string;
  gender: number;
  birthday: string;
  id_card: string;
  avatar: string;
  life_photos: string[];
  art_photos: string[];
  skills: number[];
  certificates: string[];
  service_city: string;
  service_districts: string[];
  emergency_contact: string;
  emergency_phone: string;
  introduction: string;
  auto_approve: boolean;
}

export const talentApi = {
  list: (params?: TalentListParams) =>
    api.get('/api/v1/admin/talents', { params }),

  detail: (id: number) =>
    api.get(`/api/v1/admin/talents/${id}`),

  create: (data: CreateTalentParams) =>
    api.post('/api/v1/admin/talents', data),

  update: (id: number, data: Partial<CreateTalentParams>) =>
    api.put(`/api/v1/admin/talents/${id}`, data),

  review: (id: number, status: string, reason?: string) =>
    api.post(`/api/v1/admin/talents/${id}/review`, { status, reason }),

  batchReview: (ids: number[], status: string) =>
    api.post('/api/v1/admin/talents/batch-review', { ids, status }),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/v1/admin/upload', formData);
  },
};

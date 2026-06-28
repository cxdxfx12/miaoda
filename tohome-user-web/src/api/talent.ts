import { api } from './client';

export const talentApi = {
  nearby: (params: any) => api.get('/talents/nearby', params),
  detail: (id: number) => api.get(`/talents/${id}`),
  reviews: (id: number) => api.get(`/talents/${id}/reviews`),
  apply: (data: {
    real_name: string;
    id_card: string;
    gender: number;
    birthday: string;
    phone: string;
    avatar?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    skills: number[];
    certificates?: string[];
    life_photos?: string[];
    art_photos?: string[];
    service_city: string;
    service_districts: string[];
    introduction?: string;
  }) => api.post('/user/talent/apply', data),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/user/talent/upload', formData);
  },
  // 达人工作台接口（需要达人身份token）
  profile: () => api.get('/talent/profile'),
  dashboard: () => api.get('/talent/dashboard'),
  incomeStats: () => api.get('/talent/income/statistics'),
  updateWorkStatus: (status: number) => api.post('/talent/status', { status }),
};

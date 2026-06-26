import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  const token = localStorage.getItem('miaoda_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    const data: any = res.data;
    if (data && typeof data === 'object' && 'code' in data && data.code !== 0) {
      const err: any = new Error(data.message || '请求失败');
      err.code = data.code;
      err.response = { data };
      return Promise.reject(err);
    }
    return data;
  },
  (err) => {
    if (err.response?.status === 401 || err.response?.data?.code === 1002) {
      localStorage.removeItem('miaoda_token');
      localStorage.removeItem('user_info');
      if (window.location.pathname !== '/login') {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?redirect=${redirect}`;
      }
    }
    return Promise.reject(err);
  }
);

export const api = {
  get: <T>(url: string, params?: any) => apiClient.get<T>(url, { params }),
  post: <T>(url: string, data?: any, config?: any) => apiClient.post<T>(url, data, config),
  put: <T>(url: string, data?: any) => apiClient.put<T>(url, data),
  delete: <T>(url: string) => apiClient.delete<T>(url),
};

export const setToken = (token: string) => localStorage.setItem('miaoda_token', token);
export const getToken = () => localStorage.getItem('miaoda_token');
export const clearToken = () => localStorage.removeItem('miaoda_token');

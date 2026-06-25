// API 客户端
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig } from '../config';

const TOKEN_KEY = 'miaoda_tech_token';
const REFRESH_TOKEN_KEY = 'miaoda_tech_refresh';

export const apiClient: AxiosInstance = axios.create({
  baseURL: AppConfig.API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const response = await axios.post(`${AppConfig.API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          const { token, refresh_token } = response.data.data;
          await AsyncStorage.setItem(TOKEN_KEY, token);
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
          if (originalRequest.headers) {
            (originalRequest.headers as any).Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        }
      } catch (e) {
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => apiClient.get(url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => apiClient.post(url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => apiClient.put(url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => apiClient.delete(url, config),
};

export const setToken = async (token: string, refreshToken: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
};

// 达人相关API
export const authApi = {
  login: (data: { phone: string; code: string }) => api.post<any>('/auth/tech/login', data),
  logout: () => api.post('/auth/tech/logout'),
};

export const orderApi = {
  getPending: () => api.get<any>('/talent/orders/pending'),
  getCurrent: () => api.get<any>('/talent/orders/current'),
  accept: (id: number) => api.post(`/talent/orders/${id}/accept`),
  reject: (id: number, reason: string) => api.post(`/talent/orders/${id}/reject`, { reason }),
  updateStatus: (id: number, status: string, lat?: number, lng?: number) =>
    api.post(`/talent/orders/${id}/status`, { status, lat, lng }),
  updateLocation: (lat: number, lng: number) => api.post('/talent/location', { lat, lng }),
};

export const techApi = {
  getProfile: () => api.get<any>('/talent/profile'),
  updateWorkStatus: (status: number) => api.post('/talent/status', { status }),
  getIncomeStatistics: () => api.get<any>('/talent/income/statistics'),
  getIncomeRecords: (page: number) => api.get<any>('/talent/income/records', { params: { page } }),
  requestWithdraw: (data: { amount: number; bank_name: string; bank_account: string; account_name: string }) =>
    api.post('/talent/income/withdraw', data),
  getDashboard: () => api.get<any>('/talent/dashboard'),
};

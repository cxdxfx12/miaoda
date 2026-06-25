// API 客户端
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig } from '../config';

const TOKEN_KEY = 'miaoda_token';
const REFRESH_TOKEN_KEY = 'miaoda_refresh_token';

export const apiClient: AxiosInstance = axios.create({
  baseURL: AppConfig.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 响应拦截器
apiClient.interceptors.response.use(
  response => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const response = await axios.post(`${AppConfig.API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { token, refresh_token } = response.data.data;
          await AsyncStorage.setItem(TOKEN_KEY, token);
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);

          if (originalRequest.headers) {
            (originalRequest.headers as any).Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // 刷新失败，跳转登录
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// API方法封装
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.get(url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.post(url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.put(url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.delete(url, config),
};

export const setToken = async (token: string, refreshToken: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

// 业务API
export * from './auth';
export * from './user';
export * from './service';
export * from './order';
export * from './payment';

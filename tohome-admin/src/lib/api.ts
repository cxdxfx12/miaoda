// API 客户端
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

// 前端 axios 统一使用相对路径，由 Next.js rewrites 代理到后端
// Docker 构建时 NEXT_PUBLIC_API_URL 会被浏览器端解析，而 gateway 是容器内域名浏览器不可达
// 因此 baseURL 为空字符串，请求如 /api/v1/... 走 Next.js 服务端代理
const API_BASE_URL = '';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    this.client.interceptors.request.use(config => {
      // 自动检测数据类型：JSON → application/json，FormData → 不设（axios 自动加 multipart/form-data + boundary）
      if (!(config.data instanceof FormData)) {
        config.headers.set('Content-Type', 'application/json');
      }
      if (this.token && config.headers) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      response => {
        const data = response.data;
        // 检测业务错误码：code 存在且不为 0 时视为业务错误
        if (data && typeof data === 'object' && 'code' in data && data.code !== 0) {
          const bizCode = data.code;
          const bizMsg = data.message || '请求失败';
          // 1002: 未授权 → 跳转登录
          if (bizCode === 1002) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('admin_token');
              window.location.href = '/pc_admin/login';
            }
          }
          return Promise.reject(new Error(bizMsg));
        }
        return data;
      },
      (error: AxiosError) => {
        // 401 → 跳转登录
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/pc_admin/login';
          }
          return Promise.reject(error);
        }
        // 后端未启动 / 404 / 网络错误 → 仅在开发模式静默返回空数据便于调试
        if (
          !error.response ||
          error.code === 'ERR_NETWORK' ||
          error.code === 'ECONNABORTED' ||
          error.response?.status === 404 ||
          error.response?.status === 502 ||
          error.response?.status === 503
        ) {
          if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.buildId) {
            console.warn('[API] 请求异常，静默返回空数据:', error.config?.url, error.message);
          }
          return Promise.resolve({ data: null, list: [], total: 0 } as any);
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', token);
    }
  }

  loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('admin_token');
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
    }
  }

  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get(url, config) as any;
  }

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post(url, data, config) as any;
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put(url, data, config) as any;
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete(url, config) as any;
  }
}

export const api = new ApiClient();

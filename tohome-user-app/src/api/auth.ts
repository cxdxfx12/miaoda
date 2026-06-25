// 认证API
import { api, setToken, clearToken } from './client';

export interface LoginRequest {
  phone: string;
  code: string;
}

export interface LoginResponse {
  token: string;
  refresh_token: string;
  expire_in: number;
  user_type: number; // 1=用户 2=达人 3=管理员
  user: {
    id: number;
    phone: string;
    nickname: string;
    avatar: string;
    member_level: number;
  };
}

export const authApi = {
  // 发送验证码
  sendSmsCode: (phone: string, type: 'login' | 'register' = 'login') =>
    api.post<{ code: number; message: string }>('/auth/sms/send', { phone, type }),

  // 短信验证码登录
  login: async (data: LoginRequest) => {
    const response = await api.post<{ data: LoginResponse }>('/auth/login', data);
    if (response.data) {
      await setToken(response.data.token, response.data.refresh_token);
    }
    return response.data;
  },

  // 微信OAuth登录（用code换取token）
  wechatLogin: async (code: string) => {
    const response = await api.post<{ data: LoginResponse }>('/auth/wechat/login', { code });
    if (response.data) {
      await setToken(response.data.token, response.data.refresh_token);
    }
    return response.data;
  },

  // 获取微信服务号配置
  getWechatConfig: () =>
    api.get<{ data: { app_id: string; enabled: boolean; redirect_uri: string } }>('/auth/wechat/config'),

  // 退出登录
  logout: async () => {
    try {
      await api.post('/user/logout');
    } finally {
      await clearToken();
    }
  },

  // 刷新token
  refreshToken: (refreshToken: string) =>
    api.post<LoginResponse>('/auth/refresh', { refresh_token: refreshToken }),
};

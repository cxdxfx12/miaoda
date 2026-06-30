import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setToken, clearToken } from '../api/client';
import { authApi } from '../api/auth';

interface UserInfo {
  id: number;
  phone: string;
  nickname: string;
  avatar: string;
  gender: number;
  member_level: number;
  member_points: number;
  user_type?: number;
}

interface UserState {
  token: string | null;
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (phone: string, code: string, inviteCode?: string) => Promise<void>;
  techLogin: (phone: string, code: string) => Promise<void>;
  wechatLogin: (code: string, state?: string, inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUserInfo: (info: UserInfo) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      token: null,
      userInfo: null,
      isLoggedIn: false,
      loading: false,

      login: async (phone, code, inviteCode) => {
        set({ loading: true });
        try {
          const res: any = await authApi.login(phone, code, inviteCode);
          setToken(res.data.token);
          const userInfo = res.data.user || {};
          userInfo.user_type = res.data.user_type;
          set({
            token: res.data.token,
            userInfo,
            isLoggedIn: true,
            loading: false,
          });
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || '登录失败';
          set({ loading: false });
          throw new Error(msg);
        }
      },

      techLogin: async (phone, code) => {
        set({ loading: true });
        try {
          const res: any = await authApi.techLogin(phone, code);
          setToken(res.data.token);
          const userInfo = res.data.user || {};
          userInfo.user_type = 2;
          set({
            token: res.data.token,
            userInfo,
            isLoggedIn: true,
            loading: false,
          });
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || '达人登录失败';
          set({ loading: false });
          throw new Error(msg);
        }
      },

      wechatLogin: async (code, state, inviteCode) => {
        set({ loading: true });
        try {
          const res: any = await authApi.wechatLogin(code, state, inviteCode);
          setToken(res.data.token);
          const userInfo = res.data.user || {};
          userInfo.user_type = res.data.user_type;
          set({
            token: res.data.token,
            userInfo,
            isLoggedIn: true,
            loading: false,
          });
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || '微信登录失败';
          set({ loading: false });
          throw new Error(msg);
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {}
        clearToken();
        set({ token: null, userInfo: null, isLoggedIn: false });
      },

      setUserInfo: (info) => set({ userInfo: info }),
    }),
    {
      name: 'miaoda-user-storage',
      partialize: (state) => ({
        token: state.token,
        userInfo: state.userInfo,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);

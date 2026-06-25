// 全局状态管理 - Zustand
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';
import { userApi, UserInfo } from '../api/user';

interface UserState {
  // 状态
  token: string | null;
  userInfo: UserInfo | null;
  userType: number; // 1=用户 2=达人 3=管理员
  isLoggedIn: boolean;
  loading: boolean;

  // 操作
  login: (phone: string, code: string) => Promise<void>;
  wechatLogin: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUserInfo: () => Promise<void>;
  updateUserInfo: (data: Partial<UserInfo>) => Promise<void>;
  setUserInfo: (info: UserInfo) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      token: null,
      userInfo: null,
      userType: 1,
      isLoggedIn: false,
      loading: false,

      login: async (phone: string, code: string) => {
        set({ loading: true });
        try {
          const response = await authApi.login({ phone, code });
          set({
            token: response.token,
            userInfo: response.user,
            userType: response.user_type || 1,
            isLoggedIn: true,
            loading: false,
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      wechatLogin: async (code: string) => {
        set({ loading: true });
        try {
          const response = await authApi.wechatLogin(code);
          set({
            token: response.token,
            userInfo: response.user,
            userType: response.user_type || 1,
            isLoggedIn: true,
            loading: false,
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (e) {
          // 忽略错误
        }
        set({ token: null, userInfo: null, userType: 1, isLoggedIn: false });
      },

      fetchUserInfo: async () => {
        try {
          const response = await userApi.getUserInfo();
          set({ userInfo: response.data });
        } catch (e) {
          // 忽略错误
        }
      },

      updateUserInfo: async (data: Partial<UserInfo>) => {
        await userApi.updateUserInfo(data);
        await get().fetchUserInfo();
      },

      setUserInfo: (info: UserInfo) => set({ userInfo: info }),
    }),
    {
      name: 'miaoda-user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        token: state.token,
        userInfo: state.userInfo,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);

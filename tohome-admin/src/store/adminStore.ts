// 管理员状态管理
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/lib/api';

export interface AdminInfo {
  id: number;
  username: string;
  realName?: string;
  nickname?: string;
  role: string;
  avatar?: string;
  email?: string;
}

interface AdminState {
  token: string | null;
  admin: AdminInfo | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (admin: AdminInfo, token: string) => void;
  logout: () => void;
  setAdmin: (admin: AdminInfo) => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      isAuthenticated: false,
      loading: false,

      login: (admin, token) => {
        api.setToken(token);
        set({ admin, token, isAuthenticated: true });
      },

      logout: () => {
        api.clearToken();
        set({ admin: null, token: null, isAuthenticated: false });
      },

      setAdmin: (admin) => set({ admin }),
    }),
    {
      name: 'tohome-admin-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

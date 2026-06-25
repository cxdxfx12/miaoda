// 达人状态管理
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, setToken, clearToken, techApi } from '../api/client';

export interface TalentInfo {
  id: number;
  real_name: string;
  avatar: string;
  phone: string;
  rating: number;
  service_count: number;
  balance: number;
  total_income: number;
  work_status: number;
}

interface TechState {
  token: string | null;
  talentInfo: TalentInfo | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateWorkStatus: (status: number) => Promise<void>;
  setTalentInfo: (info: TalentInfo) => void;
}

export const useTechStore = create<TechState>()(
  persist(
    (set, get) => ({
      token: null,
      talentInfo: null,
      isLoggedIn: false,
      loading: false,

      login: async (phone, code) => {
        set({ loading: true });
        try {
          const response = await authApi.login({ phone, code });
          await setToken(response.data.token, response.data.refresh_token);
          set({
            token: response.data.token,
            isLoggedIn: true,
            loading: false,
          });
          await get().fetchProfile();
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        try { await authApi.logout(); } catch (e) {}
        await clearToken();
        set({ token: null, talentInfo: null, isLoggedIn: false });
      },

      fetchProfile: async () => {
        try {
          const response = await techApi.getProfile();
          set({ talentInfo: response.data });
        } catch (e) {}
      },

      updateWorkStatus: async (status) => {
        await techApi.updateWorkStatus(status);
        const current = get().talentInfo;
        if (current) {
          set({ talentInfo: { ...current, work_status: status } });
        }
      },

      setTalentInfo: (info) => set({ talentInfo: info }),
    }),
    {
      name: 'miaoda-tech-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        token: state.token,
        talentInfo: state.talentInfo,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);

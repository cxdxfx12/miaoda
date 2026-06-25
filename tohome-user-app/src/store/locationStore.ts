// 位置状态管理
import { create } from 'zustand';

interface LocationState {
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  address: string;
  setLocation: (lat: number, lng: number, city?: string, district?: string, address?: string) => void;
}

export const useLocationStore = create<LocationState>(set => ({
  latitude: 39.9042, // 默认北京
  longitude: 116.4074,
  city: '北京市',
  district: '朝阳区',
  address: '',
  setLocation: (latitude, longitude, city, district, address) =>
    set({
      latitude,
      longitude,
      city: city || '北京市',
      district: district || '',
      address: address || '',
    }),
}));

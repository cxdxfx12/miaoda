// 工具函数
import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const screen = {
  width: screenWidth,
  height: screenHeight,
};

export const formatPrice = (price: number): string => {
  return `¥${price.toFixed(2)}`;
};

export const formatDate = (date: string | Date, format: string = 'YYYY-MM-DD HH:mm'): string => {
  // 简化实现，实际项目使用dayjs
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes);
};

export const maskPhone = (phone: string): string => {
  if (phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

export const validatePhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  // Haversine公式计算两点距离（单位：km）
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const generateAvatar = (seed: string): string => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

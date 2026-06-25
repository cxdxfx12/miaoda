// 主题 - 设计系统
// 配色基于放松、舒适、专业的按摩服务调性
// 参考高端O2O商业应用视觉风格

export const colors = {
  // 主色调 - 优雅深蓝紫 (高端商业感)
  primary: '#5B6ABF',
  primaryLight: '#7C8BDB',
  primaryDark: '#4855A8',
  primaryBg: '#EDEFFB',
  primaryGradient: ['#4A55A2', '#7B6EC8'] as readonly [string, string],

  // 辅助色 - 暖金 (奢华感)
  secondary: '#E8A840',
  secondaryLight: '#F0C870',
  secondaryDark: '#C88C28',
  secondaryBg: '#FFF8ED',
  gold: '#D4A853',
  goldLight: '#F5E6C8',

  // 功能色
  success: '#34C759',
  successBg: '#EEFBF0',
  warning: '#F59E0B',
  warningBg: '#FFFDEB',
  error: '#FA5252',
  errorBg: '#FFF0F0',
  info: '#3B82F6',
  infoBg: '#EEF4FF',

  // 文字颜色
  textPrimary: '#1A1D26',
  textSecondary: '#5A5F6E',
  textTertiary: '#9499A6',
  textDisabled: '#CBD0D8',
  textInverse: '#FFFFFF',

  // 背景色
  background: '#F5F6FA',
  backgroundAlt: '#F0F1F5',
  card: '#FFFFFF',
  divider: '#EBEDF0',
  border: '#E2E5E9',

  // 特有装饰色
  rose: '#E8A0B4',
  lavender: '#A78BFA',
  mint: '#6EE7B7',
  sky: '#7DD3FC',

  // 透明度
  mask: 'rgba(0, 0, 0, 0.45)',
  overlay: 'rgba(0, 0, 0, 0.25)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  loose: 1.75,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const theme = {
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  lineHeight,
  shadow,
};

export type Theme = typeof theme;

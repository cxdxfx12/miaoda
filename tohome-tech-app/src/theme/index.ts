// 主题 - 达人端
export const colors = {
  primary: '#1D4ED8',
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  primaryBg: '#EFF6FF',

  secondary: '#10B981',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',

  success: '#52C41A',
  successBg: '#F6FFED',
  warning: '#FAAD14',
  warningBg: '#FFFBE6',
  error: '#FF4D4F',
  errorBg: '#FFF1F0',
  info: '#1890FF',
  infoBg: '#E6F7FF',

  textPrimary: '#1F2937',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  textDisabled: '#D1D5DB',
  textInverse: '#FFFFFF',

  background: '#F9FAFB',
  backgroundAlt: '#F3F4F6',
  card: '#FFFFFF',
  divider: '#E5E7EB',
  border: '#E5E7EB',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };
export const fontSize = { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, xxl: 24, xxxl: 32 };
export const fontWeight = { regular: '400', medium: '500', semibold: '600', bold: '700' } as const;
export const lineHeight = { tight: 1.2, normal: 1.5, loose: 1.75 };

export const shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
};

export const theme = { colors, spacing, radius, fontSize, fontWeight, lineHeight, shadow };
export type Theme = typeof theme;

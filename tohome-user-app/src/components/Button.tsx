// 精美按钮组件 - 商业级质感
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight, shadow } from '../theme';

export type ButtonType = 'primary' | 'secondary' | 'text' | 'outline' | 'danger' | 'gradient';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  type?: ButtonType;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconRight?: boolean;
  fullWidth?: boolean;
  /** 渐变起止色(仅type=gradient生效) */
  gradientFrom?: string;
  gradientTo?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  type = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  iconRight = false,
  fullWidth = false,
  gradientFrom = '#6B7FD7',
  gradientTo = '#8B9FE8',
}) => {
  const sz = BUTTON_SIZES[size];

  // 颜色计算
  const bgColor = type === 'gradient' ? gradientFrom : TYPE_COLORS[type].bg;
  const txtColor = TYPE_COLORS[type].text;
  const spinnerColor = (type === 'primary' || type === 'danger' || type === 'gradient')
    ? '#FFFFFF' : colors.primary;

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        { height: sz.height, paddingHorizontal: sz.px, borderRadius: radius.lg },
        type === 'gradient' && {
          backgroundColor: gradientFrom,
          ...shadow.button,
        },
        type !== 'gradient' && { backgroundColor: bgColor },
        type === 'outline' && styles.outlineBorder,
        type === 'primary' && shadow.button,
        type === 'danger' && shadow.button,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {!iconRight && icon ? <View style={styles.iconLeft}>{icon}</View> : null}
          <Text
            style={[
              styles.label,
              { fontSize: sz.fontSize },
              { color: txtColor },
              textStyle,
            ]}>
            {title}
          </Text>
          {iconRight && icon ? <View style={styles.iconRight}>{icon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const BUTTON_SIZES: Record<ButtonSize, { height: number; px: number; fontSize: number }> = {
  small:  { height: 34, px: spacing.md, fontSize: fontSize.sm },
  medium: { height: 46, px: spacing.lg, fontSize: fontSize.md },
  large:  { height: 54, px: spacing.xl, fontSize: fontSize.lg },
};

const TYPE_COLORS: Record<ButtonType, { bg: string; text: string }> = {
  primary:   { bg: colors.primary,   text: '#FFFFFF' },
  secondary: { bg: colors.primaryBg, text: colors.primary },
  outline:   { bg: 'transparent',    text: colors.primary },
  text:      { bg: 'transparent',    text: colors.primary },
  danger:    { bg: colors.error,     text: '#FFFFFF' },
  gradient:  { bg: colors.primary,   text: '#FFFFFF' },
};

// 增强阴影
const enhancedShadow = {
  button: {
    ...shadow.md,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: { marginRight: spacing.xs },
  iconRight: { marginLeft: spacing.xs },
  label: {
    fontWeight: fontWeight.semibold as any,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

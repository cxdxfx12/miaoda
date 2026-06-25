// 精美按钮组件 - 达人端
import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  ViewStyle, TextStyle, View,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'text' | 'outline' | 'danger' | 'gradient';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconRight?: boolean;
}

export default function Button({
  title, onPress, variant = 'primary', size = 'medium',
  disabled = false, loading = false, style, textStyle,
  fullWidth = false, icon, iconRight = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const sz = SIZE_MAP[size];
  const txtColor = VARIANT_COLORS[variant].text;
  const spinnerColor = (variant === 'primary' || variant === 'danger' || variant === 'gradient')
    ? '#FFFFFF' : colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { height: sz.height, paddingHorizontal: sz.px, borderRadius: radius.lg },
        { backgroundColor: VARIANT_COLORS[variant].bg },
        variant === 'outline' && styles.outlineBorder,
        (variant === 'primary' || variant === 'danger' || variant === 'gradient') && shadow.md,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}>
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.contentRow}>
          {!iconRight && icon ? <View style={styles.iconLeft}>{icon}</View> : null}
          <Text style={[
            styles.label,
            { fontSize: sz.fontSize, color: txtColor },
            textStyle,
          ]}>{title}</Text>
          {iconRight && icon ? <View style={styles.iconRight}>{icon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const SIZE_MAP: Record<ButtonSize, { height: number; px: number; fontSize: number }> = {
  small:  { height: 34, px: spacing.md, fontSize: fontSize.sm },
  medium: { height: 46, px: spacing.lg, fontSize: fontSize.md },
  large:  { height: 54, px: spacing.xl, fontSize: fontSize.lg },
};

const VARIANT_COLORS: Record<ButtonVariant, { bg: string; text: string }> = {
  primary:  { bg: colors.primary,   text: '#FFFFFF' },
  secondary: { bg: colors.primaryBg, text: colors.primary },
  outline:  { bg: 'transparent',    text: colors.primary },
  text:     { bg: 'transparent',    text: colors.primary },
  danger:   { bg: colors.error,     text: '#FFFFFF' },
  gradient: { bg: colors.primary,   text: '#FFFFFF' },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  outlineBorder: { borderWidth: 1.5, borderColor: colors.primary },
  fullWidth: { width: '100%' },
  contentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconLeft: { marginRight: spacing.xs },
  iconRight: { marginLeft: spacing.xs },
  label: { fontWeight: fontWeight.semibold, textAlign: 'center' },
  disabled: { opacity: 0.5 },
});

// 精美徽标组件 - 达人端
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, fontSize, fontWeight } from '../theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'default';
type BadgeType = 'filled' | 'light' | 'dot';

interface BadgeProps {
  label?: string;
  children?: React.ReactNode;
  variant?: BadgeVariant;
  type?: BadgeType;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
  dotColor?: string;
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  success: { bg: '#F6FFED', text: '#52C41A', dot: '#52C41A' },
  warning: { bg: '#FFFBE6', text: '#D48806', dot: '#FAAD14' },
  danger:  { bg: '#FFF1F0', text: '#FF4D4F', dot: '#FF4D4F' },
  info:    { bg: '#E6F7FF', text: '#1890FF', dot: '#1890FF' },
  primary: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#1D4ED8' },
  default: { bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' },
};

export default function Badge({
  label, children, variant = 'default', type = 'light',
  size = 'sm', style, textStyle, dotColor,
}: BadgeProps) {
  const v = VARIANT_COLORS[variant];

  if (type === 'dot') {
    return (
      <View style={[styles.dotRow, style]}>
        <View style={[styles.dot, { backgroundColor: dotColor || v.dot }]} />
        {(label || children) && (
          <Text style={[styles.dotText, size === 'md' && styles.dotTextMd, textStyle]}>
            {label || children}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: type === 'filled' ? v.text : v.bg },
        size === 'md' && styles.badgeMd,
        style,
      ]}>
      <Text
        style={[
          styles.text,
          { color: type === 'filled' ? '#FFFFFF' : v.text },
          size === 'md' && styles.textMd,
          textStyle,
        ]}>
        {label || children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.xs },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  text: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  textMd: { fontSize: fontSize.sm },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotText: { fontSize: fontSize.sm, color: colors.textSecondary },
  dotTextMd: { fontSize: fontSize.base },
});

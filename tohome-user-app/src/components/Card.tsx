// 精美卡片组件 - 支持渐变色头部、阴影层级、紧凑模式
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

interface CardProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** 卡片变体：default 白底 / gradient 渐变头部 / outline 描边 */
  variant?: 'default' | 'gradient' | 'outline';
  /** 阴影层级 */
  elevation?: 'sm' | 'md' | 'lg' | 'none';
  /** 内边距 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** 左侧图标 */
  icon?: React.ReactNode;
  /** 右上角操作区 */
  action?: React.ReactNode;
  /** 额外样式 */
  style?: ViewStyle;
  /** 内容容器样式 */
  contentStyle?: ViewStyle;
  /** 渐变头颜色(仅variant=gradient生效) */
  gradientColor?: string;
}

export default function Card({
  children,
  title,
  subtitle,
  variant = 'default',
  elevation = 'sm',
  padding = 'md',
  icon,
  action,
  style,
  contentStyle,
  gradientColor,
}: CardProps) {
  const pad = PADDING_MAP[padding];

  return (
    <View
      style={[
        styles.card,
        variantStyles[variant].card,
        elevation !== 'none' && shadow[elevation],
        { padding: 0 },
        style,
      ]}>
      {/* 渐变头部 */}
      {variant === 'gradient' && (
        <View
          style={[
            styles.gradientHeader,
            { backgroundColor: gradientColor || colors.primary },
          ]}>
          {icon && <View style={styles.gradientIcon}>{icon}</View>}
          <View style={styles.gradientTextWrap}>
            {title && <Text style={styles.gradientTitle}>{title}</Text>}
            {subtitle && <Text style={styles.gradientSubtitle}>{subtitle}</Text>}
          </View>
          {action && <View style={styles.gradientAction}>{action}</View>}
        </View>
      )}

      {/* 普通头部 */}
      {variant !== 'gradient' && (title || icon || action) && (
        <View style={[styles.header, { paddingHorizontal: pad, paddingTop: pad }]}>
          <View style={styles.headerLeft}>
            {icon && <View style={styles.headerIcon}>{icon}</View>}
            <View style={{ flex: 1 }}>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
          {action && <View>{action}</View>}
        </View>
      )}

      {/* 内容区 */}
      <View style={[
        { padding: pad },
        (variant !== 'gradient' && !title && !icon && !action) && { paddingTop: pad },
        contentStyle,
      ]}>
        {children}
      </View>
    </View>
  );
}

const PADDING_MAP = {
  none: 0,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  // 渐变头部
  gradientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  gradientIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientTextWrap: { flex: 1 },
  gradientTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  gradientSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  gradientAction: {},
});

const variantStyles = {
  default: StyleSheet.create({
    card: { backgroundColor: colors.card },
  }),
  gradient: StyleSheet.create({
    card: { backgroundColor: colors.card },
  }),
  outline: StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
  }),
};

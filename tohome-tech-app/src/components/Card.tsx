// 精美卡片组件 - 达人端
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

interface CardProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'gradient' | 'outline' | 'stat';
  elevation?: 'sm' | 'md' | 'lg' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
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
}: CardProps) {
  const pad = PADDING_MAP[padding];

  return (
    <View
      style={[
        styles.card,
        variantStyles[variant].card,
        variant === 'stat' && styles.statCard,
        elevation !== 'none' && shadow[elevation],
        style,
      ]}>
      {/* 渐变头部 */}
      {variant === 'gradient' && (
        <View style={styles.gradientHeader}>
          {icon && <View style={styles.gradientIcon}>{icon}</View>}
          <View style={styles.gradientTextWrap}>
            {title && <Text style={styles.gradientTitle}>{title}</Text>}
            {subtitle && <Text style={styles.gradientSubtitle}>{subtitle}</Text>}
          </View>
          {action && <View>{action}</View>}
        </View>
      )}

      {/* 普通头部 */}
      {variant !== 'gradient' && (title || icon || action) && (
        <View style={[styles.header, { paddingHorizontal: pad, paddingTop: pad }]}>
          <View style={styles.headerLeft}>
            {icon && <View style={styles.headerIcon}>{icon}</View>}
            <View>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
          {action && <View>{action}</View>}
        </View>
      )}

      <View style={[
        { padding: pad },
        (!title && !icon && !action) && { paddingTop: pad },
        contentStyle,
      ]}>
        {children}
      </View>
    </View>
  );
}

const PADDING_MAP = { none: 0, sm: spacing.sm, md: spacing.md, lg: spacing.lg };

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  statCard: {
    padding: spacing.md,
    minWidth: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
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
  gradientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.primary,
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
});

const variantStyles = {
  default: StyleSheet.create({ card: { backgroundColor: colors.card } }),
  gradient: StyleSheet.create({ card: { backgroundColor: colors.card } }),
  outline: StyleSheet.create({
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  }),
  stat: StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
  }),
};

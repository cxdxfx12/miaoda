// 空状态组件
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { EmptyWallet } from './Icon';
import { colors, spacing, fontSize, fontWeight } from '../theme';

interface EmptyViewProps {
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: ViewStyle;
}

const EmptyView: React.FC<EmptyViewProps> = ({
  message = '暂无数据',
  icon,
  action,
  style,
}) => (
  <View style={[styles.container, style]}>
    <View style={styles.iconWrap}>
      {icon || <EmptyWallet size={48} color={colors.textDisabled} />}
    </View>
    <Text style={styles.message}>{message}</Text>
    {action && <View style={styles.action}>{action}</View>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconWrap: {
    marginBottom: spacing.md,
    opacity: 0.6,
  },
  message: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default EmptyView;

// 加载状态组件
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../theme';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
}

const Loading: React.FC<LoadingProps> = ({ message = '加载中...', size = 'large' }) => (
  <View style={styles.container}>
    <ActivityIndicator size={size} color={colors.primary} />
    {message && <Text style={styles.text}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  text: {
    fontSize: fontSize.base,
    color: colors.textTertiary,
  },
});

export default Loading;

// 骨架屏加载组件 — 商业级 shimmer 动画 (达人端)
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle, Easing } from 'react-native';
import { colors, radius, spacing } from '../theme';

function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.ease, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

interface SkeletonProps { width?: number | string; height?: number; borderRadius?: number; style?: ViewStyle; }

const SkeletonBase: React.FC<SkeletonProps> = ({ width = '100%', height = 16, borderRadius: br = radius.sm, style }) => {
  const shimmer = useShimmer();
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] });
  return (
    <View style={[styles.base, { width: width as any, height, borderRadius: br }, style]}>
      <Animated.View style={[styles.shimmer, { transform: [{ translateX }] }]} />
    </View>
  );
};

const SkeletonText: React.FC<{ lines?: number; lastLineWidth?: string; spacing?: number; style?: ViewStyle }> = ({
  lines = 3, lastLineWidth = '60%', spacing: ls = spacing.sm, style,
}) => (
  <View style={[{ gap: ls }, style]}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBase key={i} height={14} width={i === lines - 1 ? lastLineWidth : '100%'} borderRadius={radius.xs} />
    ))}
  </View>
);

const SkeletonCircle: React.FC<{ size?: number; style?: ViewStyle }> = ({ size = 48, style }) => (
  <SkeletonBase width={size} height={size} borderRadius={size / 2} style={style} />
);

const SkeletonRect: React.FC<SkeletonProps> = (props) => <SkeletonBase {...props} />;

const SkeletonCard: React.FC<{ style?: ViewStyle; withImage?: boolean }> = ({ style, withImage = false }) => (
  <View style={[styles.card, style]}>
    {withImage && <SkeletonRect width="100%" height={160} borderRadius={radius.md} style={{ marginBottom: spacing.md }} />}
    <SkeletonRect width="50%" height={18} borderRadius={radius.xs} style={{ marginBottom: spacing.sm }} />
    <SkeletonText lines={2} lastLineWidth="80%" spacing={spacing.xs} />
  </View>
);

const SkeletonList: React.FC<{ count?: number; itemHeight?: number; style?: ViewStyle }> = ({ count = 4, itemHeight = 80, style }) => (
  <View style={[{ gap: spacing.sm }, style]}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={[styles.listItem, { height: itemHeight }]}>
        <SkeletonCircle size={48} />
        <View style={{ flex: 1 }}>
          <SkeletonRect width="50%" height={16} borderRadius={radius.xs} style={{ marginBottom: 6 }} />
          <SkeletonRect width="80%" height={12} borderRadius={radius.xs} />
        </View>
        <SkeletonRect width={60} height={24} borderRadius={radius.sm} />
      </View>
    ))}
  </View>
);

const SkeletonOrderCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
      <SkeletonRect width="40%" height={18} borderRadius={radius.xs} />
      <SkeletonRect width={60} height={22} borderRadius={radius.full} />
    </View>
    <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
      <SkeletonCircle size={48} />
      <View style={{ flex: 1 }}>
        <SkeletonRect width="60%" height={16} borderRadius={radius.xs} style={{ marginBottom: 6 }} />
        <SkeletonRect width="40%" height={12} borderRadius={radius.xs} />
      </View>
      <SkeletonRect width={80} height={28} borderRadius={radius.md} />
    </View>
    <SkeletonRect width="100%" height={12} borderRadius={radius.xs} />
  </View>
);

export const Skeleton = {
  Base: SkeletonBase, Text: SkeletonText, Circle: SkeletonCircle,
  Rect: SkeletonRect, Card: SkeletonCard, List: SkeletonList,
  OrderCard: SkeletonOrderCard,
};

const sColor1 = '#E8ECF1';
const sColor2 = '#F5F7FA';

const styles = StyleSheet.create({
  base: { backgroundColor: sColor1, overflow: 'hidden' },
  shimmer: { width: 200, height: '100%', backgroundColor: sColor2, opacity: 0.5 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },
  listItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.md, gap: spacing.md,
  },
});

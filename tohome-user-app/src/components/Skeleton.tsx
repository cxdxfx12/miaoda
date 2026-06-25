// 骨架屏加载组件 — 商业级 shimmer 动画
import React, { useEffect, useRef } from 'react';
import {
  Animated, View, StyleSheet, ViewStyle, Easing,
} from 'react-native';
import { colors, radius, spacing } from '../theme';

// ——— 闪光动画 Hook ———
function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return anim;
}

// ——— 基础骨架 ———
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const SkeletonBase: React.FC<SkeletonProps> = ({ width = '100%', height = 16, borderRadius: br = radius.sm, style }) => {
  const shimmer = useShimmer();

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={[styles.base, { width: width as any, height, borderRadius: br }, style]}>
      <Animated.View
        style={[styles.shimmer, { transform: [{ translateX }] }]}
      />
    </View>
  );
};

// ——— 文本骨架 ———
interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  spacing?: number;
  style?: ViewStyle;
}

const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3, lastLineWidth = '60%', spacing: lineSpacing = spacing.sm, style,
}) => (
  <View style={[{ gap: lineSpacing }, style]}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBase
        key={i}
        height={14}
        width={i === lines - 1 ? lastLineWidth : '100%'}
        borderRadius={radius.xs}
      />
    ))}
  </View>
);

// ——— 圆形骨架（头像） ———
interface SkeletonCircleProps {
  size?: number;
  style?: ViewStyle;
}

const SkeletonCircle: React.FC<SkeletonCircleProps> = ({ size = 48, style }) => (
  <SkeletonBase width={size} height={size} borderRadius={size / 2} style={style} />
);

// ——— 矩形骨架 ———
interface SkeletonRectProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const SkeletonRect: React.FC<SkeletonRectProps> = (props) => (
  <SkeletonBase {...props} />
);

// ——— 卡片骨架（含标题行 + 3行文本）———
interface SkeletonCardProps {
  style?: ViewStyle;
  withImage?: boolean;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ style, withImage = false }) => (
  <View style={[styles.card, style]}>
    {withImage && (
      <SkeletonRect
        width="100%"
        height={160}
        borderRadius={radius.md}
        style={{ marginBottom: spacing.md }}
      />
    )}
    <SkeletonRect width="50%" height={18} borderRadius={radius.xs} style={{ marginBottom: spacing.sm }} />
    <SkeletonText lines={2} lastLineWidth="80%" spacing={spacing.xs} />
  </View>
);

// ——— 列表骨架（N个卡片）———
interface SkeletonListProps {
  count?: number;
  itemHeight?: number;
  style?: ViewStyle;
}

const SkeletonList: React.FC<SkeletonListProps> = ({ count = 4, itemHeight = 80, style }) => (
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

// ——— 服务卡片骨架 ———
const SkeletonServiceCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.serviceCard, style]}>
    <SkeletonRect width="100%" height={140} borderRadius={radius.md} />
    <View style={{ padding: spacing.sm }}>
      <SkeletonRect width="70%" height={16} borderRadius={radius.xs} style={{ marginBottom: 6 }} />
      <SkeletonRect width="100%" height={12} borderRadius={radius.xs} style={{ marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonRect width={80} height={20} borderRadius={radius.xs} />
        <SkeletonRect width={60} height={14} borderRadius={radius.xs} />
      </View>
    </View>
  </View>
);

// ——— 达人卡片骨架 ———
const SkeletonTechnicianCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.techCard, style]}>
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <SkeletonCircle size={64} />
      <View style={{ flex: 1 }}>
        <SkeletonRect width="60%" height={18} borderRadius={radius.xs} style={{ marginBottom: 6 }} />
        <SkeletonRect width="40%" height={14} borderRadius={radius.xs} style={{ marginBottom: 4 }} />
        <SkeletonRect width="80%" height={14} borderRadius={radius.xs} style={{ marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <SkeletonRect width={50} height={22} borderRadius={radius.full} />
          <SkeletonRect width={50} height={22} borderRadius={radius.full} />
          <SkeletonRect width={50} height={22} borderRadius={radius.full} />
        </View>
      </View>
    </View>
  </View>
);

// ——— 导出 ———
export const Skeleton = {
  Base: SkeletonBase,
  Text: SkeletonText,
  Circle: SkeletonCircle,
  Rect: SkeletonRect,
  Card: SkeletonCard,
  List: SkeletonList,
  ServiceCard: SkeletonServiceCard,
  TechnicianCard: SkeletonTechnicianCard,
};

// ——— 样式 ———
const shimmerColor1 = '#E8ECF1';
const shimmerColor2 = '#F5F7FA';

const styles = StyleSheet.create({
  base: {
    backgroundColor: shimmerColor1,
    overflow: 'hidden',
  },
  shimmer: {
    width: 200,
    height: '100%',
    backgroundColor: shimmerColor2,
    opacity: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  serviceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  techCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});

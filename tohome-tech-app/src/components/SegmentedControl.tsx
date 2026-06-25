// SegmentedControl 分段控制器 — 达人端
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, ViewStyle, LayoutChangeEvent,
} from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight, shadow } from '../theme';

interface SegmentedControlProps {
  segments: { label: string; value: string; count?: number }[];
  value: string; onChange: (value: string) => void; style?: ViewStyle;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  segments, value, onChange, style,
}) => {
  const activeIndex = segments.findIndex(s => s.value === value);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const containerWidth = useRef(0);

  useEffect(() => {
    const idx = Math.max(0, activeIndex);
    if (containerWidth.current > 0) {
      const segW = (containerWidth.current - spacing.xs * 2) / segments.length;
      const center = spacing.xs + segW * idx + segW / 2;
      const indW = segW * 0.85;
      Animated.spring(indicatorX, {
        toValue: center - indW / 2,
        tension: 80, friction: 10, useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, segments.length]);

  const onLayout = (e: LayoutChangeEvent) => { containerWidth.current = e.nativeEvent.layout.width; };

  return (
    <View style={[styles.wrapper, style]} onLayout={onLayout}>
      <View style={styles.container}>
        <Animated.View style={[styles.indicator, {
          transform: [{ translateX: indicatorX }],
          width: `${Math.max(85 / segments.length, 30)}%`,
        }]} />
        {segments.map(seg => {
          const isActive = seg.value === value;
          return (
            <TouchableOpacity key={seg.value} style={styles.segment}
              onPress={() => onChange(seg.value)} activeOpacity={0.7}>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {seg.label}
                {seg.count !== undefined && (
                  <Text style={[styles.count, isActive && styles.countActive]}> ({seg.count})</Text>
                )}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { padding: spacing.xs },
  container: {
    flexDirection: 'row', backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md, padding: spacing.xs, position: 'relative',
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm - 1, zIndex: 1 },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium as any, color: colors.textSecondary },
  labelActive: { color: colors.textInverse, fontWeight: fontWeight.semibold as any },
  count: { fontSize: fontSize.xs, color: colors.textTertiary },
  countActive: { color: 'rgba(255,255,255,0.7)' },
  indicator: {
    position: 'absolute', top: spacing.xs, bottom: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.sm, ...shadow.sm,
  },
});

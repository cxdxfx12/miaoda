// 滑动操作行 — 左滑/右滑展示操作按钮，带触觉反馈和弹性动画
import React, { useRef, useCallback } from 'react';
import {
  Animated, View, TouchableOpacity, Text,
  StyleSheet, PanResponder, ViewStyle, Vibration,
} from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface SwipeAction {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  bgColor: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  /** 右侧操作按钮 */
  actions?: SwipeAction[];
  /** 左侧操作按钮 */
  leftActions?: SwipeAction[];
  /** 触发阈值 */
  threshold?: number;
  /** 触发振动 */
  haptic?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  style?: ViewStyle;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children, actions = [], leftActions = [],
  threshold = 80, haptic = true, disabled = false, style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const openValue = useRef(0);

  const snapToPosition = useCallback((toValue: number) => {
    isOpen.current = toValue !== 0;
    openValue.current = toValue;
    Animated.spring(translateX, {
      toValue,
      tension: 65,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  const close = useCallback(() => snapToPosition(0), [snapToPosition]);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) => !disabled && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy),
    onPanResponderMove: (_, { dx }) => {
      const base = openValue.current;
      let newX = base + dx;
      // 限制滑动范围
      const maxLeft = leftActions.length * threshold;
      const maxRight = -(actions.length * threshold);
      if (leftActions.length === 0) newX = Math.min(0, newX);
      if (actions.length === 0) newX = Math.max(0, newX);
      newX = Math.max(maxRight, Math.min(maxLeft, newX));
      translateX.setValue(newX);
    },
    onPanResponderRelease: (_, { dx }) => {
      const base = openValue.current;
      const currentX = base + dx;
      // 判断吸附方向
      if (currentX > threshold * 0.5 && leftActions.length > 0) {
        snapToPosition(leftActions.length * threshold);
        if (haptic) Vibration.vibrate(10);
      } else if (currentX < -threshold * 0.5 && actions.length > 0) {
        snapToPosition(-(actions.length * threshold));
        if (haptic) Vibration.vibrate(10);
      } else {
        snapToPosition(0);
      }
    },
  })).current;

  const totalRightWidth = actions.length * 72; // 每个按钮72px
  const totalLeftWidth = leftActions.length * 72;

  return (
    <View style={[styles.wrapper, style]}>
      {/* 左侧操作按钮 (背景) */}
      {leftActions.length > 0 && (
        <View style={[styles.actionBg, styles.leftActions]}>
          {leftActions.map((a, i) => (
            <TouchableOpacity
              key={`l_${i}`}
              style={[styles.actionBtn, { backgroundColor: a.bgColor }]}
              onPress={() => { a.onPress(); close(); }}
              activeOpacity={0.8}>
              {a.icon && <Ionicons name={a.icon} size={20} color={a.color || '#FFF'} />}
              <Text style={[styles.actionLabel, { color: a.color || '#FFF' }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {/* 右侧操作按钮 (背景) */}
      {actions.length > 0 && (
        <View style={[styles.actionBg, styles.rightActions]}>
          {actions.map((a, i) => (
            <TouchableOpacity
              key={`r_${i}`}
              style={[styles.actionBtn, { backgroundColor: a.bgColor }]}
              onPress={() => { a.onPress(); close(); }}
              activeOpacity={0.8}>
              {a.icon && <Ionicons name={a.icon} size={20} color={a.color || '#FFF'} />}
              <Text style={[styles.actionLabel, { color: a.color || '#FFF' }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {/* 前景内容 */}
      <Animated.View
        style={[{ transform: [{ translateX }] }]}
        {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

// ——— 样式 ———
const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
  actionBg: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  leftActions: { justifyContent: 'flex-start' },
  rightActions: { justifyContent: 'flex-end' },
  actionBtn: {
    width: 72, alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: spacing.xs,
  },
  actionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium as any },
});

// BottomSheet 底部弹出面板 + ActionSheet 操作菜单 — 商业级交互
import React, { useEffect, useRef, useCallback } from 'react';
import {
  Modal, Animated, View, Text, TouchableOpacity,
  StyleSheet, Dimensions, PanResponder, ScrollView, ViewStyle,
} from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.75;

// ——— BottomSheet ———
interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** 面板高度,默认 40% 屏幕高 */
  height?: number | string;
  /** 是否显示把手 */
  showHandle?: boolean;
  /** 点击遮罩关闭 */
  closeOnBackdrop?: boolean;
  /** 内容区 */
  children: React.ReactNode;
  /** 底部固定按钮 */
  footer?: React.ReactNode;
  /** 右上角操作按钮 */
  action?: React.ReactNode;
  contentStyle?: ViewStyle;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible, onClose, title, height = SCREEN_HEIGHT * 0.4,
  showHandle = true, closeOnBackdrop = true, children, footer, action, contentStyle,
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 20,
    onPanResponderMove: (_, { dy }) => {
      if (dy > 0) translateY.setValue(dy);
    },
    onPanResponderRelease: (_, { dy }) => {
      if (dy > 100) {
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }).start(onClose);
      } else {
        Animated.spring(translateY, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }).start();
      }
    },
  })).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={closeOnBackdrop ? onClose : undefined}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableOpacity>
        <Animated.View
          style={[styles.sheet, { height, transform: [{ translateY }] }]}>
          {/* 拖拽把手 */}
          {showHandle && (
            <View style={styles.handleArea} {...panResponder.panHandlers}>
              <View style={styles.handle} />
            </View>
          )}
          {/* 标题栏 */}
          {(title || action) && (
            <View style={styles.header}>
              {title ? <Text style={styles.title}>{title}</Text> : <View />}
              {action && <View>{action}</View>}
              <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={8} activeOpacity={0.6}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* 内容区 */}
          <ScrollView
            style={[{ flex: 1 }, contentStyle]}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {/* 底部固定按钮 */}
          {footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </View>
    </Modal>
  );
};

// ——— ActionSheet 操作菜单 ———
interface ActionSheetAction {
  label: string;
  icon?: string;
  danger?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionSheetAction[];
  /** 取消按钮文案 */
  cancelLabel?: string;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  visible, onClose, title, actions, cancelLabel = '取消',
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity }]} />
        </TouchableOpacity>
        <Animated.View style={[styles.actionSheet, { transform: [{ translateY }] }]}>
          {title && (
            <View style={styles.asTitleWrap}>
              <Text style={styles.asTitle}>{title}</Text>
            </View>
          )}
          <View style={styles.asActions}>
            {actions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.asAction, i < actions.length - 1 && styles.asActionBorder]}
                onPress={() => { a.onPress(); onClose(); }}
                activeOpacity={0.65}>
                <Text style={[styles.asActionLabel, a.danger && { color: colors.error }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.asCancelWrap}>
            <TouchableOpacity
              style={styles.asAction}
              onPress={onClose}
              activeOpacity={0.65}>
              <Text style={[styles.asActionLabel, { fontWeight: fontWeight.semibold as any }]}>{cancelLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ——— 样式 ———
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  // BottomSheet
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    maxHeight: SHEET_MAX_HEIGHT,
  },
  handleArea: { alignItems: 'center', paddingVertical: spacing.sm },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.divider },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary },
  closeButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.backgroundAlt },
  closeText: { fontSize: 14, color: colors.textSecondary },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  // ActionSheet
  actionSheet: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  asTitleWrap: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center',
  },
  asTitle: { fontSize: fontSize.sm, color: colors.textTertiary },
  asActions: {
    backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden',
  },
  asAction: {
    paddingVertical: spacing.md, alignItems: 'center',
  },
  asActionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  asActionLabel: { fontSize: fontSize.md, color: colors.textPrimary },
  asCancelWrap: {
    backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden',
  },
});

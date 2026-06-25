// Toast 全局消息通知组件 — 商业级质感
import React, {
  createContext, useContext, useState, useCallback, useRef, useEffect,
} from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight, shadow } from '../theme';
import { Ionicons } from '@expo/vector-icons';

// ——— 类型 ———
type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastPosition = 'top' | 'bottom';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  position?: ToastPosition;
  action?: { label: string; onPress: () => void };
}

interface ToastContextValue {
  show: (msg: Omit<ToastMessage, 'id'>) => string;
  hide: (id: string) => void;
  success: (message: string, opts?: { duration?: number; action?: ToastMessage['action'] }) => string;
  error: (message: string, opts?: { duration?: number; action?: ToastMessage['action'] }) => string;
  warning: (message: string, opts?: { duration?: number; action?: ToastMessage['action'] }) => string;
  info: (message: string, opts?: { duration?: number; action?: ToastMessage['action'] }) => string;
}

// ——— 图标配置 ———
const ICON_MAP: Record<ToastType, { name: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  success: { name: 'checkmark-circle', color: colors.success, bg: colors.successBg },
  error: { name: 'close-circle', color: colors.error, bg: colors.errorBg },
  warning: { name: 'warning', color: colors.warning, bg: colors.warningBg },
  info: { name: 'information-circle', color: colors.primary, bg: colors.primaryBg },
};

// ——— Context ———
const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// ——— 单个 Toast 条目 ———
function ToastItem({
  id, type, message, duration = 3000, position = 'top', action, onRemove,
}: ToastMessage & { onRemove: (id: string) => void }) {
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    if (duration > 0) {
      // 进度条动画
      Animated.timing(progressAnim, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start();
    }

    const timer = duration > 0 ? setTimeout(() => dismiss(), duration) : null;
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onRemove(id));
  };

  const cfg = ICON_MAP[type];
  const isTop = position === 'top';

  return (
    <Animated.View
      style={[
        styles.item,
        isTop ? styles.itemTop : styles.itemBottom,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}>
      <View style={[styles.itemInner, { borderLeftColor: cfg.color }]}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.name} size={20} color={cfg.color} />
        </View>
        <Text style={styles.msg} numberOfLines={2}>{message}</Text>
        {action && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { action.onPress(); dismiss(); }}
            activeOpacity={0.7}>
            <Text style={[styles.actionLabel, { color: cfg.color }]}>{action.label}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.closeBtn} onPress={dismiss} activeOpacity={0.6}>
          <Ionicons name="close" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
      {duration > 0 && (
        <Animated.View style={[styles.progressBar, {
          width: progressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }),
          backgroundColor: cfg.color,
        }]} />
      )}
    </Animated.View>
  );
}

// ——— Provider ———
let _idCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const add = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${++_idCounter}_${Date.now()}`;
    setToasts(prev => [...prev, { ...msg, id }].slice(-3)); // 最多3条
    return id;
  }, []);

  const hide = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const topToasts = toasts.filter(t => (t.position || 'top') === 'top');
  const bottomToasts = toasts.filter(t => t.position === 'bottom');

  return (
    <ToastContext.Provider value={{
      show: add,
      hide,
      success: (message, opts) => add({ type: 'success', message, ...opts }),
      error: (message, opts) => add({ type: 'error', message, duration: 5000, ...opts }),
      warning: (message, opts) => add({ type: 'warning', message, duration: 4000, ...opts }),
      info: (message, opts) => add({ type: 'info', message, ...opts }),
    }}>
      {children}
      {/* 顶部 Toast */}
      <View style={styles.topContainer} pointerEvents="box-none">
        {topToasts.map(t => (
          <ToastItem key={t.id} {...t} onRemove={hide} />
        ))}
      </View>
      {/* 底部 Toast */}
      <View style={styles.bottomContainer} pointerEvents="box-none">
        {bottomToasts.map(t => (
          <ToastItem key={t.id} {...t} onRemove={hide} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

// ——— 样式 ———
const { width: WINDOW_WIDTH } = Dimensions.get('window');
const TOAST_WIDTH = Math.min(WINDOW_WIDTH - spacing.md * 4, 420);

const styles = StyleSheet.create({
  topContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  item: {
    width: TOAST_WIDTH,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadow.md,
  },
  itemTop: {},
  itemBottom: {},
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msg: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
  },
  closeBtn: {
    padding: 2,
  },
  progressBar: {
    height: 2,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
});

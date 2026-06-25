// CountDown 倒计时组件 — 支持环形进度、数字跳动、Vibration提示
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ViewStyle, Vibration } from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '../theme';

interface CountDownProps {
  /** 总秒数 */
  seconds: number;
  /** 自动开始 */
  autoStart?: boolean;
  /** 结束回调 */
  onEnd?: () => void;
  /** 剩余多少秒时触发警告回调 */
  warnAt?: number;
  onWarn?: () => void;
  /** 是否振动 */
  vibrate?: boolean;
  /** 显示格式: 'digital'(00:00) | 'ring'(环形进度) | 'compact'(紧凑文字) */
  format?: 'digital' | 'ring' | 'compact';
  /** 数字颜色 */
  color?: string;
  /** 紧急色(警告时) */
  urgentColor?: string;
  /** 样式 */
  style?: ViewStyle;
}

export const CountDown: React.FC<CountDownProps> = ({
  seconds, autoStart = true, onEnd, warnAt,
  onWarn, vibrate = true, format = 'digital',
  color = colors.textPrimary, urgentColor = colors.error, style,
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const isRunning = useRef(autoStart);
  const hasWarned = useRef(false);

  const start = useCallback(() => { isRunning.current = true; }, []);
  const pause = useCallback(() => { isRunning.current = false; }, []);
  const reset = useCallback(() => {
    isRunning.current = false;
    setRemaining(seconds);
    hasWarned.current = false;
  }, [seconds]);

  useEffect(() => {
    if (isRunning.current && remaining > 0) {
      timerRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            isRunning.current = false;
            if (vibrate) Vibration.vibrate([200, 100, 200]);
            setTimeout(() => onEnd?.(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [remaining > 0 && isRunning.current]);

  // 警告检查
  useEffect(() => {
    if (warnAt && remaining <= warnAt && !hasWarned.current && isRunning.current) {
      hasWarned.current = true;
      if (vibrate) Vibration.vibrate(100);
      onWarn?.();
    }
  }, [remaining, warnAt]);

  // 同步外部秒数变化
  useEffect(() => {
    setRemaining(seconds);
    hasWarned.current = false;
  }, [seconds]);

  const isUrgent = warnAt ? remaining <= warnAt : remaining <= 60;
  const currentColor = isUrgent ? urgentColor : color;
  const pct = seconds > 0 ? remaining / seconds : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  if (format === 'compact') {
    return (
      <View style={[styles.compactWrap, style]}>
        <Text style={[styles.compactText, { color: currentColor }]}>
          {formatTime(remaining)}
        </Text>
      </View>
    );
  }

  if (format === 'ring') {
    const size = 56;
    const strokeW = 4;
    const radius_r = size / 2 - strokeW;
    const circumference = 2 * Math.PI * radius_r;
    const offset = circumference * (1 - pct);

    // 简化：用2个半圆View模拟 (RN不支持SVG/CircularProgress原生)
    return (
      <View style={[styles.ringWrap, style]}>
        <View style={[styles.ringBg, {
          width: size, height: size, borderRadius: size / 2,
          borderColor: colors.divider, borderWidth: strokeW,
        }]}>
          <Text style={[styles.ringText, { color: currentColor }]}>
            {remaining > 60 ? `${Math.ceil(remaining / 60)}分` : `${remaining}秒`}
          </Text>
        </View>
      </View>
    );
  }

  // digital 格式
  return (
    <View style={[styles.digital, style]}>
      <Text style={[styles.digitalText, { color: currentColor }]}>
        {formatTime(remaining)}
      </Text>
    </View>
  );
};

// ——— 样式 ———
const styles = StyleSheet.create({
  digital: {
    flexDirection: 'row', alignItems: 'center',
  },
  digitalText: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold as any,
    fontVariant: ['tabular-nums'],
  },
  compactWrap: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  compactText: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any,
  },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringBg: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card,
  },
  ringText: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any,
  },
});

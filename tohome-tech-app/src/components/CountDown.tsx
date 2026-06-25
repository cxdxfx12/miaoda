// CountDown 倒计时组件 — 达人端
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ViewStyle, Vibration } from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '../theme';

export const CountDown: React.FC<{
  seconds: number; autoStart?: boolean; onEnd?: () => void;
  warnAt?: number; onWarn?: () => void; vibrate?: boolean;
  format?: 'digital' | 'ring' | 'compact';
  color?: string; urgentColor?: string; style?: ViewStyle;
}> = ({
  seconds, autoStart = true, onEnd, warnAt, onWarn, vibrate = true,
  format = 'digital', color = colors.textPrimary, urgentColor = colors.error, style,
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const isRunning = useRef(autoStart);
  const hasWarned = useRef(false);

  const start = useCallback(() => { isRunning.current = true; }, []);
  const pause = useCallback(() => { isRunning.current = false; }, []);
  const reset = useCallback(() => {
    isRunning.current = false; setRemaining(seconds); hasWarned.current = false;
  }, [seconds]);

  useEffect(() => {
    if (isRunning.current && remaining > 0) {
      timerRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); isRunning.current = false; if (vibrate) Vibration.vibrate([200, 100, 200]); setTimeout(() => onEnd?.(), 0); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [remaining > 0 && isRunning.current]);

  useEffect(() => {
    if (warnAt && remaining <= warnAt && !hasWarned.current && isRunning.current) {
      hasWarned.current = true; if (vibrate) Vibration.vibrate(100); onWarn?.();
    }
  }, [remaining, warnAt]);

  useEffect(() => { setRemaining(seconds); hasWarned.current = false; }, [seconds]);

  const isUrgent = warnAt ? remaining <= warnAt : remaining <= 60;
  const c = isUrgent ? urgentColor : color;
  const fm = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (format === 'compact') return <View style={[styles.compactWrap, style]}><Text style={[styles.compactText, { color: c }]}>{fm(remaining)}</Text></View>;
  if (format === 'ring') {
    return <View style={[styles.ringWrap, style]}>
      <View style={[styles.ringBg, { width: 56, height: 56, borderRadius: 28, borderColor: colors.divider, borderWidth: 4 }]}>
        <Text style={[styles.ringText, { color: c }]}>{remaining > 60 ? `${Math.ceil(remaining / 60)}分` : `${remaining}秒`}</Text>
      </View></View>;
  }
  return <View style={[styles.digital, style]}><Text style={[styles.digitalText, { color: c }]}>{fm(remaining)}</Text></View>;
};

const styles = StyleSheet.create({
  digital: { flexDirection: 'row', alignItems: 'center' },
  digitalText: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold as any, fontVariant: ['tabular-nums'] },
  compactWrap: { backgroundColor: colors.warningBg, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm },
  compactText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringBg: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  ringText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any },
});

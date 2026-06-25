// ProgressSteps 步骤进度条 — 带图标、渐变动画
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface Step {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number; // 0-based
  /** 是否显示为紧凑横条 (无文字) */
  compact?: boolean;
  style?: ViewStyle;
  activeColor?: string;
  inactiveColor?: string;
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  steps, currentStep, compact = false, style,
  activeColor = colors.primary, inactiveColor = colors.divider,
}) => {
  const progressAnim = useRef(new Animated.Value(currentStep)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  return (
    <View style={[styles.wrapper, style]}>
      {/* 连接线 */}
      <View style={styles.linesWrap}>
        {steps.map((_, i) => {
          if (i === steps.length - 1) return null;
          const progress = progressAnim.interpolate({
            inputRange: [i, i + 1],
            outputRange: ['0%', '100%'],
            extrapolate: 'clamp',
          });
          return (
            <View key={i} style={styles.lineTrack}>
              <Animated.View
                style={[
                  styles.lineFill,
                  {
                    width: progress,
                    backgroundColor: activeColor,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      {/* 步骤点 */}
      <View style={styles.dotsRow}>
        {steps.map((s, i) => {
          const isActive = i <= currentStep;
          const isCurrent = i === currentStep;
          return (
            <View key={i} style={[styles.stepCol, compact && styles.stepColCompact]}>
              <View style={[
                styles.dot,
                isActive && { backgroundColor: activeColor, borderColor: activeColor },
                !isActive && { borderColor: inactiveColor },
                isCurrent && styles.dotCurrent,
              ]}>
                {isActive && s.icon ? (
                  <Ionicons name={s.icon} size={14} color="#FFF" />
                ) : (
                  <Text style={[styles.dotNum, isActive && { color: '#FFF' }, !isActive && { color: colors.textTertiary }]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              {!compact && (
                <Text style={[styles.dotLabel, isCurrent && styles.dotLabelCurrent]}>
                  {s.label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ——— 水平进度条 (简化版) ———
interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  height?: number;
  animated?: boolean;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress, color = colors.primary, backgroundColor = colors.backgroundAlt,
  height = 6, animated = true, style,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const toValue = Math.min(Math.max(progress, 0), 1);
    if (animated) {
      Animated.timing(anim, { toValue, duration: 500, useNativeDriver: false }).start();
    } else {
      anim.setValue(toValue);
    }
  }, [progress, animated]);

  return (
    <View style={[styles.progressTrack, { height, backgroundColor, borderRadius: height / 2 }, style]}>
      <Animated.View style={[
        styles.progressFill,
        {
          height, backgroundColor: color, borderRadius: height / 2,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        },
      ]} />
    </View>
  );
};

// ——— 样式 ———
const DOT_SIZE = 28;
const LINE_HEIGHT = 3;

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  // 连接线
  linesWrap: {
    position: 'absolute', top: DOT_SIZE / 2 - LINE_HEIGHT / 2,
    left: DOT_SIZE / 2, right: DOT_SIZE / 2,
    flexDirection: 'row',
  },
  lineTrack: {
    flex: 1, height: LINE_HEIGHT, borderRadius: LINE_HEIGHT / 2,
    backgroundColor: colors.divider, overflow: 'hidden',
    marginHorizontal: 1,
  },
  lineFill: { height: '100%', borderRadius: LINE_HEIGHT / 2 },
  // 步骤点
  dotsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
  },
  stepCol: {
    alignItems: 'center', width: 56,
  },
  stepColCompact: { width: DOT_SIZE },
  dot: {
    width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card,
  },
  dotCurrent: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  dotNum: { fontSize: fontSize.xs, fontWeight: fontWeight.bold as any },
  dotLabel: {
    marginTop: spacing.xs, fontSize: fontSize.xs,
    color: colors.textSecondary, textAlign: 'center',
  },
  dotLabelCurrent: {
    color: colors.textPrimary, fontWeight: fontWeight.semibold as any,
  },
  // ProgressBar
  progressTrack: { overflow: 'hidden', width: '100%' },
  progressFill: { position: 'absolute', left: 0, top: 0 },
});

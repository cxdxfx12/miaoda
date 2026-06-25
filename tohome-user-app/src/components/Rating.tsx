// 评分组件
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from '@/components/Icons';
import { colors, spacing, fontSize, fontWeight } from '../theme';

interface RatingProps {
  value: number;
  max?: number;
  size?: number;
  showText?: boolean;
  reviewCount?: number;
}

export const Rating: React.FC<RatingProps> = ({
  value,
  max = 5,
  size = 14,
  showText = true,
  reviewCount,
}) => {
  return (
    <View style={styles.container}>
      {[...Array(max)].map((_, i) => (
        <Star
          key={i}
          size={size}
          color={i < Math.floor(value) ? colors.secondary : colors.textTertiary}
          weight={i < Math.floor(value) ? 'fill' : 'regular'}
        />
      ))}
      {showText && (
        <Text style={styles.text}>
          {value.toFixed(1)}
          {reviewCount !== undefined && ` (${reviewCount})`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
});

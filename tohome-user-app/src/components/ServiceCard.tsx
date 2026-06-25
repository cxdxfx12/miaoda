// 服务卡片
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Star, Clock } from './Icon';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import { Service } from '../api/service';
import { formatPrice } from '../utils';

interface ServiceCardProps {
  service: Service;
  onPress?: () => void;
  layout?: 'horizontal' | 'vertical';
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onPress,
  layout = 'horizontal',
}) => {
  if (layout === 'vertical') {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.verticalContainer}>
        <Image
          source={{ uri: service.cover_image }}
          style={styles.verticalImage}
          resizeMode="cover"
        />
        <View style={styles.verticalInfo}>
          <Text style={styles.verticalName} numberOfLines={2}>
            {service.name}
          </Text>
          <View style={styles.verticalMeta}>
            <Clock size={12} color={colors.textTertiary} />
            <Text style={styles.verticalDuration}>
              {service.specs?.[0]?.duration || 60}分钟
            </Text>
          </View>
          <View style={styles.verticalFooter}>
            <Text style={styles.verticalPrice}>
              {formatPrice(service.specs?.[0]?.price || service.base_price)}
              <Text style={styles.verticalPriceUnit}>起</Text>
            </Text>
            <Text style={styles.verticalSold}>已售 {service.order_count}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.container}>
      <Image
        source={{ uri: service.cover_image }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {service.name}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.ratingRow}>
            <Star size={12} color={colors.secondary} weight="fill" />
            <Text style={styles.rating}>{service.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.durationRow}>
            <Clock size={12} color={colors.textTertiary} />
            <Text style={styles.duration}>
              {service.specs?.[0]?.duration || 60}分钟
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatPrice(service.specs?.[0]?.price || service.base_price)}
            </Text>
            {service.original_price > service.base_price && (
              <Text style={styles.originalPrice}>
                {formatPrice(service.original_price)}
              </Text>
            )}
          </View>
          <Text style={styles.sold}>已售 {service.order_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rating: {
    marginLeft: 2,
    fontSize: fontSize.sm,
    color: colors.secondary,
    fontWeight: fontWeight.medium,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    marginLeft: 2,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  originalPrice: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
    marginLeft: spacing.xs,
  },
  sold: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  // 垂直布局样式
  verticalContainer: {
    width: 160,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginRight: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  verticalImage: {
    width: '100%',
    height: 120,
  },
  verticalInfo: {
    padding: spacing.sm,
  },
  verticalName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    minHeight: 40,
  },
  verticalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  verticalDuration: {
    marginLeft: 2,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  verticalFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  verticalPrice: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  verticalPriceUnit: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.normal,
  },
  verticalSold: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});

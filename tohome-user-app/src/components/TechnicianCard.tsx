// 达人卡片 — 高端商业视觉
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Star, MapPin, Heart, Crown } from './Icon';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import { Talent } from '../api/service';
import { formatPrice } from '../utils';

interface TalentCardProps {
  talent: Talent;
  onPress?: () => void;
  onFavorite?: () => void;
  showPrice?: boolean;
  price?: number;
}

export const TalentCard: React.FC<TalentCardProps> = ({
  talent,
  onPress,
  onFavorite,
  showPrice = false,
  price,
}) => {
  const avgRating = talent.rating || 5.0;
  const isTop = talent.service_count >= 100;

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={styles.container}>
      {/* 左侧头像区 */}
      <View style={styles.avatarWrap}>
        {talent.avatar ? (
          <Image source={{ uri: talent.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {talent.name?.charAt(0) || '?'}
            </Text>
          </View>
        )}
        {/* TOP标签 */}
        {isTop && (
          <View style={styles.topBadge}>
            <Crown size={10} color={colors.gold} weight="fill" />
            <Text style={styles.topBadgeText}>TOP</Text>
          </View>
        )}
        {/* 在线状态点 */}
        <View style={styles.onlineDot} />
      </View>

      {/* 中间信息区 */}
      <View style={styles.info}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{talent.name}</Text>
          <View style={styles.ratingRow}>
            <Star size={13} color={colors.gold} weight="fill" />
            <Text style={styles.ratingNum}>{avgRating.toFixed(1)}</Text>
          </View>
        </View>

        {talent.skills && talent.skills.length > 0 && (
          <View style={styles.skillsRow}>
            {talent.skills.slice(0, 3).map((skill, i) => (
              <View key={i} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <MapPin size={12} color={colors.textTertiary} />
            <Text style={styles.distance}>
              {talent.distance ? `${talent.distance.toFixed(1)}km` : '附近'}
            </Text>
            <View style={styles.dotSep} />
            <Text style={styles.count}>{talent.service_count}单</Text>
          </View>
          {showPrice && price !== undefined && (
            <Text style={styles.price}>
              <Text style={styles.priceSym}>¥</Text>{price}<Text style={styles.priceUnit}>起</Text>
            </Text>
          )}
        </View>
      </View>

      {/* 右侧收藏 */}
      {onFavorite && (
        <TouchableOpacity style={styles.favBtn} onPress={onFavorite} activeOpacity={0.7}>
          <Heart size={18} color={colors.textDisabled} />
        </TouchableOpacity>
      )}
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
    alignItems: 'center',
    ...shadow.sm,
    borderWidth: 1,
    borderColor: colors.border + '50',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    color: '#fff', fontSize: fontSize.xxl, fontWeight: fontWeight.bold,
  },
  topBadge: {
    position: 'absolute', top: -2, right: -6,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.goldLight,
    paddingHorizontal: spacing.xs + 1, paddingVertical: 1,
    borderRadius: radius.full, gap: 1,
    borderWidth: 1, borderColor: colors.gold + '40',
  },
  topBadgeText: {
    fontSize: 8, fontWeight: fontWeight.bold, color: colors.secondaryDark,
  },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.success, borderWidth: 2.5, borderColor: colors.card,
  },
  info: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    color: colors.textPrimary, flex: 1, marginRight: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.secondaryBg,
    paddingHorizontal: spacing.xs + 1, paddingVertical: 1,
    borderRadius: radius.full, gap: 2,
  },
  ratingNum: {
    fontSize: fontSize.sm, color: colors.secondaryDark,
    fontWeight: fontWeight.semibold,
  },
  skillsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm,
  },
  skillTag: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.xs,
  },
  skillTagText: {
    fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium,
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  distance: { fontSize: fontSize.sm, color: colors.textTertiary },
  dotSep: {
    width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textDisabled,
    marginHorizontal: spacing.xs,
  },
  count: { fontSize: fontSize.sm, color: colors.textTertiary },
  price: { fontSize: fontSize.lg, color: colors.primary, fontWeight: fontWeight.bold },
  priceSym: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  priceUnit: { fontSize: fontSize.sm, color: colors.textTertiary, fontWeight: fontWeight.normal },
  favBtn: {
    padding: spacing.sm, marginLeft: spacing.xs,
  },
});

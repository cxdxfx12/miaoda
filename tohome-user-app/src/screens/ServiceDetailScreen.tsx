// 服务详情屏幕 — 商业级视觉
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  ChevronLeft, Heart, ShareNetwork, Star, Clock,
  MapPin, CheckCircle, ChatCircleDots,
} from '../components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { serviceApi } from '../api/service';
import { Button } from '../components/Button';
import { Tag } from '../components/Tag';
import { ImageCarousel } from '../components/ImageCarousel';
import { Skeleton } from '../components/Skeleton';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';
import { formatPrice } from '../utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ServiceDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { id } = route.params;
  const [selectedSpec, setSelectedSpec] = useState<number>(0);

  const { data, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => serviceApi.getServiceDetail(id),
  });

  const service = data?.data;

  if (isLoading || !service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: spacing.md }}>
          <Skeleton.Rect width="100%" height={300} borderRadius={0} style={{ marginBottom: spacing.md }} />
          <Skeleton.Rect width="70%" height={28} borderRadius={radius.xs} style={{ marginBottom: spacing.sm }} />
          <Skeleton.Rect width="50%" height={18} borderRadius={radius.xs} style={{ marginBottom: spacing.md }} />
          <Skeleton.Text lines={4} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const handleBookNow = () => {
    const spec = service.specs?.[selectedSpec];
    if (!spec) return;
    navigation.navigate('BookService', {
      serviceId: service.id,
      specName: spec.name,
      specPrice: spec.price,
      specDuration: spec.duration,
    });
  };

  const currentPrice = service.specs?.[selectedSpec]?.price || service.base_price;
  const currentDuration = service.specs?.[selectedSpec]?.duration || 60;

  const guarantees = [
    { icon: '🛡️', label: '实名认证', desc: '全部达人' },
    { icon: '💰', label: '明码标价', desc: '无隐形消费' },
    { icon: '🔙', label: '无忧退款', desc: '不满意即退' },
    { icon: '⏱️', label: '准时上门', desc: '迟到免单' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 顶部图片轮播 */}
        <View style={styles.imageContainer}>
          <ImageCarousel
            images={(service.images && service.images.length > 0
              ? service.images
              : [{ uri: service.cover_image || 'https://picsum.photos/400/300' }]
            ).map((img: any) => ({ uri: typeof img === 'string' ? img : img.url || img.uri }))}
            height={320}
            showDots
            autoPlay={3000}
            borderRadius={0}
          />
          {/* 半透渐变遮罩 */}
          <View style={styles.imageOverlay} pointerEvents="none" />
          <View style={styles.headerOverlay}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerBtn}>
                <Heart size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn}>
                <ShareNetwork size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          {/* 价格浮标 */}
          <View style={styles.priceFloat}>
            <Text style={styles.priceFloatSym}>¥</Text>
            <Text style={styles.priceFloatNum}>{currentPrice}</Text>
            <Text style={styles.priceFloatUnit}>/{currentDuration}分钟</Text>
          </View>
        </View>

        {/* 基础信息 */}
        <View style={styles.basicInfo}>
          <View style={styles.basicTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <View style={styles.metaRow}>
                <View style={styles.ratingBadge}>
                  <Star size={14} color={colors.gold} weight="fill" />
                  <Text style={styles.ratingText}>{service.rating?.toFixed(1) || '5.0'}</Text>
                </View>
                <Text style={styles.soldText}>已售 {service.order_count || 0}</Text>
                <View style={styles.dotSep} />
                <Text style={styles.soldText}>{currentDuration}分钟</Text>
              </View>
            </View>
          </View>
          {service.original_price > service.base_price && (
            <Text style={styles.originalPrice}>原价 {formatPrice(service.original_price)}</Text>
          )}
        </View>

        {/* 服务规格 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>选择规格</Text>
          <View style={styles.specsList}>
            {service.specs?.map((spec, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.specItem,
                  selectedSpec === index && styles.specItemActive,
                ]}
                onPress={() => setSelectedSpec(index)}
                activeOpacity={0.8}>
                <Text style={[styles.specName, selectedSpec === index && styles.specNameActive]}>
                  {spec.name}
                </Text>
                <View style={styles.specInfo}>
                  <Text style={[styles.specDuration, selectedSpec === index && styles.specNameActive]}>
                    <Clock size={12} color={selectedSpec === index ? colors.primary : colors.textTertiary} /> {spec.duration || 60}分钟
                  </Text>
                  <Text style={[styles.specPrice, selectedSpec === index && styles.specPriceActive]}>
                    {formatPrice(spec.price)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 服务介绍 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>服务介绍</Text>
          <Text style={styles.description}>{service.description || '专业达人上门服务，让您在舒适的环境中享受专业按摩，放松身心，缓解疲劳。'}</Text>
        </View>

        {/* 服务保障 — 高级卡片风格 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>服务保障</Text>
          <View style={styles.guaranteeList}>
            {guarantees.map((g, i) => (
              <View key={i} style={styles.guaranteeCard}>
                <Text style={styles.guaranteeIcon}>{g.icon}</Text>
                <Text style={styles.guaranteeLabel}>{g.label}</Text>
                <Text style={styles.guaranteeDesc}>{g.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 用户评价 */}
        <View style={styles.section}>
          <View style={styles.reviewHeader}>
            <Text style={styles.sectionTitle}>用户评价</Text>
            <TouchableOpacity>
              <Text style={styles.moreText}>查看全部 ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.reviewSummary}>
            <Text style={styles.reviewScore}>{service.rating?.toFixed(1) || '5.0'}</Text>
            <View>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    size={16}
                    color={i <= Math.floor(service.rating || 5) ? colors.gold : colors.textDisabled}
                    weight="fill"
                  />
                ))}
              </View>
              <Text style={styles.reviewCount}>质量评分 · 口碑保障</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 底部操作栏 — 浮动样式 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerCsBtn}>
          <View style={styles.footerCsIcon}>
            <ChatCircleDots size={22} color={colors.primary} />
          </View>
          <Text style={styles.footerCsText}>客服</Text>
        </TouchableOpacity>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceSym}>¥</Text>
          <Text style={styles.footerPriceNum}>{currentPrice}</Text>
        </View>
        <TouchableOpacity style={styles.bookNowBtn} onPress={handleBookNow} activeOpacity={0.85}>
          <Text style={styles.bookNowText}>立即预约</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, height: 48,
    backgroundColor: colors.card,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  imageContainer: { position: 'relative' },
  imageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
    backgroundColor: 'rgba(0,0,0,0.0)',
  },
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.md,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 2,
  },
  headerRight: { flexDirection: 'row' },
  priceFloat: {
    position: 'absolute', bottom: spacing.md, left: spacing.md,
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: radius.lg, gap: 2,
  },
  priceFloatSym: { fontSize: fontSize.base, color: colors.secondaryLight, fontWeight: fontWeight.semibold },
  priceFloatNum: { fontSize: fontSize.xxl, color: '#fff', fontWeight: fontWeight.bold },
  priceFloatUnit: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)' },
  // Basic Info
  basicInfo: {
    backgroundColor: colors.card, padding: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  basicTop: { flexDirection: 'row', alignItems: 'flex-start' },
  serviceName: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.secondaryBg, paddingHorizontal: spacing.sm,
    paddingVertical: 2, borderRadius: radius.full, gap: 2,
  },
  ratingText: {
    fontSize: fontSize.sm, color: colors.secondaryDark, fontWeight: fontWeight.semibold,
  },
  soldText: { fontSize: fontSize.sm, color: colors.textTertiary },
  dotSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textDisabled },
  originalPrice: {
    fontSize: fontSize.sm, color: colors.textTertiary,
    textDecorationLine: 'line-through', marginTop: spacing.sm,
  },
  // Section
  section: { backgroundColor: colors.card, marginTop: spacing.sm, padding: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  // Specs
  specsList: { gap: spacing.sm },
  specItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderRadius: radius.lg, backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  specItemActive: {
    backgroundColor: colors.primaryBg, borderColor: colors.primary,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  specName: { fontSize: fontSize.md, color: colors.textPrimary, fontWeight: fontWeight.medium },
  specNameActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  specInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  specDuration: { fontSize: fontSize.sm, color: colors.textTertiary },
  specPrice: { fontSize: fontSize.lg, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  specPriceActive: { color: colors.primary, fontWeight: fontWeight.bold },
  // Description
  description: { fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 24 },
  // Guarantee Cards
  guaranteeList: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  guaranteeCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: radius.lg, backgroundColor: colors.success + '08',
    borderWidth: 1, borderColor: colors.success + '15',
  },
  guaranteeIcon: { fontSize: 24, marginBottom: spacing.xs },
  guaranteeLabel: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  guaranteeDesc: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  // Reviews
  reviewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  moreText: { fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.medium },
  reviewSummary: { flexDirection: 'row', alignItems: 'center' },
  reviewScore: {
    fontSize: 44, fontWeight: fontWeight.bold, color: colors.gold,
    marginRight: spacing.lg,
  },
  starRow: { flexDirection: 'row', gap: 2 },
  reviewCount: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 4 },
  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, paddingBottom: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.divider,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },
  footerCsBtn: { alignItems: 'center', marginRight: spacing.md },
  footerCsIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  footerCsText: { fontSize: fontSize.xs, color: colors.primary, marginTop: 2 },
  footerPrice: { flex: 1, flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: spacing.md },
  footerPriceSym: { fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.semibold },
  footerPriceNum: { fontSize: fontSize.xxl, color: colors.primary, fontWeight: fontWeight.bold },
  bookNowBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md, borderRadius: radius.lg,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  bookNowText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
});

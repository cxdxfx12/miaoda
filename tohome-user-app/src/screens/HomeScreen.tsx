// 首页 — 高端商业视觉（参考目搭H5风格）
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, FlatList, Animated, Dimensions,
} from 'react-native';
import {
  MapPin, MagnifyingGlass, HandPointing, Heart,
  FlowerLotus, FirstAidKit, Hand, Flower, HandWaving,
  Handshake, Gift, CaretRight, Crown, Star, Fire, Clock,
  ShieldCheck,
} from '../components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { serviceApi, ServiceCategory, Talent } from '../api/service';
import { useLocationStore } from '../store/locationStore';
import { useUserStore } from '../store/userStore';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';
import { Skeleton } from '../components/Skeleton';
import { TalentCard } from '../components/TechnicianCard';
import { formatPrice } from '../utils';

const { width: SW } = Dimensions.get('window');

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const location = useLocationStore();
  const userInfo = useUserStore(state => state.userInfo);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideBanner = useRef(new Animated.Value(30)).current;
  const fadeCards = useRef(new Animated.Value(0)).current;
  const bannerTimer = useRef<any>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideBanner, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeCards, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const { data: categoriesData, refetch: refetchCategories } = useQuery({
    queryKey: ['categories'], queryFn: () => serviceApi.listCategories(),
  });
  const { data: talentsData, refetch: refetchTalents, isLoading: talentsLoading } = useQuery({
    queryKey: ['nearbyTalents', location.latitude, location.longitude],
    queryFn: () => serviceApi.getNearbyTalents({ lat: location.latitude, lng: location.longitude, radius: 5 }),
  });

  const categories: ServiceCategory[] = (categoriesData as any)?.data || [];
  const talents: Talent[] = (talentsData as any)?.data || [];

  // 分类图标映射
  const categoryIcons: Record<string, any> = {
    '全身按摩': HandWaving, '足疗保健': FlowerLotus, '中医理疗': FirstAidKit,
    'SPA美容': Flower, '肩颈调理': HandPointing, '推拿艾灸': Handshake,
  };
  const categoryColors: Record<string, string> = {
    '全身按摩': colors.primary + '14', '足疗保健': colors.secondary + '14',
    '中医理疗': colors.success + '14', 'SPA美容': colors.lavender + '14',
    '肩颈调理': colors.rose + '14', '推拿艾灸': colors.sky + '14',
  };
  const categoryIconColors: Record<string, string> = {
    '全身按摩': colors.primary, '足疗保健': colors.secondary,
    '中医理疗': colors.success, 'SPA美容': colors.lavender,
    '肩颈调理': colors.rose, '推拿艾灸': colors.sky,
  };

  // Banner 幻灯片
  const bannerSlides = [
    {
      title: '新用户专享', subtitle: '首单立减50元', btn: '立即领取',
      accent: '#D4A853', bg: colors.primaryDark, bg2: colors.primary,
      icon: Gift,
    },
    {
      title: '会员日特惠', subtitle: '全场服务8折起', btn: '去看看',
      accent: '#F59E0B', bg: '#4C1D95', bg2: '#7C3AED',
      icon: Crown,
    },
    {
      title: '品质保障', subtitle: '实名认证·不满意退款', btn: '了解详情',
      accent: '#10B981', bg: '#064E3B', bg2: '#059669',
      icon: ShieldCheck,
    },
  ];
  const [bannerIdx, setBannerIdx] = React.useState(0);

  useEffect(() => {
    bannerTimer.current = setInterval(() => {
      setBannerIdx(i => (i + 1) % bannerSlides.length);
    }, 4000);
    return () => clearInterval(bannerTimer.current);
  }, []);

  const b = bannerSlides[bannerIdx];
  const BannerIcon = b.icon;

  // 热门服务（模拟数据）
  const hotServices = [
    { id: 1, name: '全身经络按摩', price: 198, duration: 60, tag: '热销', orders: 2356 },
    { id: 2, name: '足底精油护理', price: 168, duration: 45, tag: '推荐', orders: 1892 },
    { id: 3, name: '肩颈深层舒缓', price: 158, duration: 40, tag: '好评', orders: 3210 },
    { id: 4, name: '香薰SPA套餐', price: 298, duration: 90, tag: '尊享', orders: 876 },
    { id: 5, name: '中医艾灸调理', price: 228, duration: 60, tag: '专业', orders: 1543 },
  ];

  const onRefresh = () => { refetchCategories(); refetchTalents(); };

  const renderCategory = ({ item }: { item: ServiceCategory }) => {
    const Icon = categoryIcons[item.name] || HandPointing;
    const bg = categoryColors[item.name] || colors.primary + '14';
    const ic = categoryIconColors[item.name] || colors.primary;
    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => navigation.navigate('ServiceList', { categoryId: item.id, categoryName: item.name })}
        activeOpacity={0.7}>
        <View style={[styles.categoryIcon, { backgroundColor: bg }]}>
          <Icon size={28} color={ic} />
        </View>
        <Text style={styles.categoryName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderHotService = ({ item }: { item: typeof hotServices[0] }) => (
    <TouchableOpacity
      style={styles.hotCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('ServiceDetail', { id: item.id })}>
      <View style={[styles.hotCardTop, { backgroundColor: colors.primary + '08' }]}>
        <View style={[styles.hotCardIcon, { backgroundColor: colors.primary + '14' }]}>
          <FlowerLotus size={28} color={colors.primary} />
        </View>
        <View style={[styles.hotTag, { backgroundColor: colors.secondary + 'DD' }]}>
          <Text style={styles.hotTagText}>{item.tag}</Text>
        </View>
      </View>
      <View style={styles.hotCardBottom}>
        <Text style={styles.hotName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.hotMeta}>
          <Clock size={12} color={colors.textTertiary} />
          <Text style={styles.hotDuration}>{item.duration}分钟</Text>
        </View>
        <View style={styles.hotFooter}>
          <Text style={styles.hotPrice}>
            <Text style={styles.hotPriceSym}>¥</Text>{item.price}
            <Text style={styles.hotPriceUnit}> 起</Text>
          </Text>
          <Text style={styles.hotOrders}>已售{item.orders}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={talentsLoading} onRefresh={onRefresh} tintColor={colors.primary} />
        }>

        {/* === 顶部区域 === */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* 定位 + 问候 */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.locationBadge} activeOpacity={0.7}>
              <MapPin size={16} color={colors.primary} weight="fill" />
              <Text style={styles.locationText} numberOfLines={1}>
                {location.city} · {location.district}
              </Text>
              <CaretRight size={12} color={colors.textTertiary} />
            </TouchableOpacity>
            <Text style={styles.greeting}>
              {userInfo ? `Hi, ${userInfo.nickname}` : '欢迎光临'}
            </Text>
          </View>

          {/* 搜索栏 */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.8}>
            <MagnifyingGlass size={18} color={colors.textTertiary} />
            <Text style={styles.searchPlaceholder}>搜索服务项目、达人...</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* === Banner 轮播 === */}
        <Animated.View style={[
          styles.bannerWrap,
          { opacity: fadeAnim, transform: [{ translateY: slideBanner }] },
        ]}>
          <View style={[styles.banner, { backgroundColor: b.bg }]}>
            {/* 装饰 */}
            <View style={[
              StyleSheet.absoluteFill,
              { backgroundColor: b.bg2, opacity: 0.3, borderTopLeftRadius: 200, borderBottomLeftRadius: 200, left: '55%' },
            ]} />
            <View style={[styles.bannerShine, { backgroundColor: b.accent + '30' }]} />
            <View style={styles.bannerContent}>
              <View style={[styles.bannerBadge, { backgroundColor: b.accent + '40' }]}>
                <Fire size={12} color="#fff" />
                <Text style={styles.bannerBadgeText}>HOT</Text>
              </View>
              <Text style={styles.bannerTitle}>{b.title}</Text>
              <Text style={styles.bannerSubtitle}>{b.subtitle}</Text>
              <TouchableOpacity style={[styles.bannerBtn, { backgroundColor: b.accent }]} activeOpacity={0.8}>
                <Text style={styles.bannerBtnText}>{b.btn}</Text>
                <CaretRight size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.bannerIcon}>
              <BannerIcon size={72} color="rgba(255,255,255,0.15)" />
            </View>
          </View>
          {/* 分页点 */}
          <View style={styles.bannerDots}>
            {bannerSlides.map((_, i) => (
              <View key={i} style={[styles.bannerDot, i === bannerIdx && styles.bannerDotActive]} />
            ))}
          </View>
        </Animated.View>

        {/* === 服务分类 === */}
        <Animated.View style={[styles.section, { opacity: fadeCards }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>服务分类</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ServiceList', {})} activeOpacity={0.7}>
              <Text style={styles.sectionMore}>全部 ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.categoryGrid}>
            {categories.slice(0, 8).map((item) => (
              <View key={item.id} style={{ width: '25%' }}>
                {renderCategory({ item })}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* === 热门服务横滑 === */}
        <Animated.View style={[styles.section, { opacity: fadeCards }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥热门服务</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ServiceList', {})} activeOpacity={0.7}>
              <Text style={styles.sectionMore}>更多 ›</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={hotServices}
            keyExtractor={item => item.id.toString()}
            renderItem={renderHotService}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hotList}
            snapToInterval={160 + spacing.sm}
            decelerationRate="fast"
          />
        </Animated.View>

        {/* === 精选达人 === */}
        <Animated.View style={[styles.section, { opacity: fadeCards }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Star size={18} color={colors.gold} weight="fill" /> 精选达人
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('ServiceList', {})} activeOpacity={0.7}>
              <Text style={styles.sectionMore}>查看更多 ›</Text>
            </TouchableOpacity>
          </View>
          {talentsLoading ? (
            <View style={{ paddingHorizontal: spacing.md }}>
              <Skeleton.TechnicianCard style={{ marginBottom: spacing.sm }} />
              <Skeleton.TechnicianCard style={{ marginBottom: spacing.sm }} />
              <Skeleton.TechnicianCard style={{ marginBottom: spacing.sm }} />
            </View>
          ) : talents.length > 0 ? (
            talents.map((talent) => (
              <TalentCard
                key={talent.id}
                talent={talent}
                onPress={() => navigation.navigate('ServiceDetail', { id: talent.id })}
              />
            ))
          ) : (
            <View style={styles.empty}>
              <HandPointing size={40} color={colors.textDisabled} />
              <Text style={styles.emptyText}>附近暂无达人</Text>
              <Text style={styles.emptySub}>我们会尽快为您匹配附近的服务达人</Text>
            </View>
          )}
        </Animated.View>

        {/* 底部留白 */}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Top Bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primaryBg, paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2, borderRadius: radius.full, gap: spacing.xs,
  },
  locationText: {
    fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold, maxWidth: 120,
  },
  greeting: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.textSecondary },
  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, marginHorizontal: spacing.md,
    marginVertical: spacing.sm, paddingHorizontal: spacing.md,
    height: 44, borderRadius: radius.full, ...shadow.sm,
    borderWidth: 1, borderColor: colors.border + '80',
  },
  searchPlaceholder: { fontSize: fontSize.base, color: colors.textTertiary, marginLeft: spacing.sm },
  // Banner
  bannerWrap: { marginHorizontal: spacing.md, marginVertical: spacing.sm },
  banner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: radius.xl,
    padding: spacing.lg, overflow: 'hidden', minHeight: 140, position: 'relative',
  },
  bannerShine: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
  },
  bannerContent: { flex: 1, zIndex: 1 },
  bannerBadge: {
    flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center',
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.full, marginBottom: spacing.sm, gap: 4,
  },
  bannerBadgeText: { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  bannerTitle: { fontSize: fontSize.xxl, color: '#fff', fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  bannerSubtitle: { fontSize: fontSize.base, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  bannerBtn: {
    flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 4,
    borderRadius: radius.full, marginTop: spacing.md, gap: 2,
  },
  bannerBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  bannerIcon: { position: 'absolute', right: -12, bottom: -16, opacity: 0.9 },
  bannerDots: {
    flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: spacing.sm,
  },
  bannerDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textDisabled,
  },
  bannerDotActive: {
    backgroundColor: colors.primary, width: 20, borderRadius: 3,
  },
  // Section
  section: { marginTop: spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary,
  },
  sectionMore: { fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.medium },
  // Category Grid
  categoryGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
  },
  categoryItem: { alignItems: 'center', paddingVertical: spacing.sm },
  categoryIcon: {
    width: 60, height: 60, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  categoryName: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.medium },
  // Hot Services
  hotList: { paddingHorizontal: spacing.md, gap: spacing.sm },
  hotCard: {
    width: 160, backgroundColor: colors.card,
    borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm,
    borderWidth: 1, borderColor: colors.border + '60',
  },
  hotCardTop: {
    height: 100, position: 'relative',
    alignItems: 'center', justifyContent: 'center',
  },
  hotCardIcon: {
    width: 56, height: 56, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  hotTag: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.xs,
  },
  hotTagText: { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  hotCardBottom: { padding: spacing.sm },
  hotName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  hotMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 },
  hotDuration: { fontSize: fontSize.sm, color: colors.textTertiary },
  hotFooter: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  hotPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary },
  hotPriceSym: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  hotPriceUnit: { fontSize: fontSize.xs, color: colors.textTertiary, fontWeight: fontWeight.normal },
  hotOrders: { fontSize: fontSize.xs, color: colors.textTertiary },
  // Empty
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
  emptySub: { fontSize: fontSize.sm, color: colors.textTertiary },
});

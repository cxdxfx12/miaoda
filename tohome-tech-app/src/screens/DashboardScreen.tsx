// 达人工作台屏幕 — 商业级视觉强化
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Switch, Animated,
} from 'react-native';
import {
  Wallet, Clock, CheckCircle, Bell, MapPin,
  Star, Power, Briefcase, CaretRight, Phone, User,
} from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { techApi, orderApi } from '../api/client';
import { useTechStore } from '../store/techStore';
import { useToast } from '../components/Toast';
import { Skeleton } from '../components/Skeleton';
import { WORK_STATUS_TEXT, WORK_STATUS_COLORS } from '../config';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';
import { formatPrice } from '../utils';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const talentInfo = useTechStore(state => state.talentInfo);
  const updateWorkStatus = useTechStore(state => state.updateWorkStatus);
  const queryClient = useQueryClient();
  const toast = useToast();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(statsAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'], queryFn: () => techApi.getDashboard(),
  });

  const handleToggleWork = async (value: boolean) => {
    try {
      const newStatus = value ? 1 : 0;
      await updateWorkStatus(newStatus);
      toast.success(value ? '已上线接单' : '已下线休息');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e: any) {
      toast.error(e.message || '切换失败');
    }
  };

  const dashboard = data?.data;
  const todayStats = dashboard?.today_stats;
  const isLoadingState = isLoading || !talentInfo;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}>
        {/* 顶部用户卡片 */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{talentInfo?.real_name?.charAt(0) || '达'}</Text>
            </View>
            <View style={styles.userText}>
              <Text style={styles.name}>{talentInfo?.real_name || '达人'}</Text>
              <View style={styles.ratingRow}>
                <Star size={14} color="#FFD700" weight="fill" />
                <Text style={styles.rating}>{talentInfo?.rating?.toFixed(1) || '5.0'}</Text>
                <Text style={styles.serviceCount}>已服务 {talentInfo?.service_count || 0}单</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
              <Bell size={22} color="#fff" />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>

          {/* 工作状态切换 */}
          <View style={styles.statusCard}>
            <View style={styles.statusInfo}>
              <View style={[styles.statusDot, { backgroundColor: WORK_STATUS_COLORS[talentInfo?.work_status || 0] }]} />
              <Text style={styles.statusText}>{WORK_STATUS_TEXT[talentInfo?.work_status || 0]}</Text>
            </View>
            <Switch
              value={talentInfo?.work_status === 1}
              onValueChange={handleToggleWork}
              trackColor={{ false: '#d1d5db', true: colors.secondary + '80' }}
              thumbColor={talentInfo?.work_status === 1 ? '#fff' : '#f9fafb'}
            />
          </View>
        </Animated.View>

        {/* 今日数据 — 骨架或真实数据 */}
        {isLoadingState ? (
          <View style={styles.statsSkeleton}>
            <Skeleton.Rect width={80} height={32} borderRadius={radius.sm} />
            <Skeleton.Rect width={40} height={14} borderRadius={radius.xs} />
            <View style={styles.statDivider} />
            <Skeleton.Rect width={48} height={32} borderRadius={radius.sm} />
            <Skeleton.Rect width={40} height={14} borderRadius={radius.xs} />
            <View style={styles.statDivider} />
            <Skeleton.Rect width={56} height={32} borderRadius={radius.sm} />
            <Skeleton.Rect width={40} height={14} borderRadius={radius.xs} />
          </View>
        ) : (
          <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: statsAnim }] }]}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>¥{todayStats?.total_income?.toFixed(0) || '0'}</Text>
              <Text style={styles.statLabel}>今日收入</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayStats?.order_count || 0}</Text>
              <Text style={styles.statLabel}>完成订单</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayStats?.service_hours?.toFixed(1) || '0'}h</Text>
              <Text style={styles.statLabel}>服务时长</Text>
            </View>
          </Animated.View>
        )}

        {/* 快捷入口 */}
        <Animated.View style={[styles.quickGrid, { opacity: fadeAnim }]}>
          {[
            { icon: Briefcase, label: '待接订单', route: 'PendingOrders', color: colors.primary },
            { icon: Clock, label: '当前订单', route: 'CurrentOrder', color: colors.warning },
            { icon: Wallet, label: '收入明细', route: 'IncomeRecords', color: colors.success },
            { icon: User, label: '个人资料', route: 'Profile', color: colors.info },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity key={idx} style={styles.quickItem}
                onPress={() => navigation.navigate(item.route)} activeOpacity={0.7}>
                <View style={[styles.quickIcon, { backgroundColor: item.color + '18' }]}>
                  <Icon size={22} color={item.color} weight="duotone" />
                </View>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* 功能列表 */}
        <Animated.View style={[styles.menuGroup, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('IncomeRecords')} activeOpacity={0.6}>
            <Wallet size={20} color={colors.textSecondary} />
            <Text style={styles.menuLabel}>收入明细</Text>
            <Text style={styles.menuValue}>¥{talentInfo?.balance?.toFixed(2) || '0.00'}</Text>
            <CaretRight size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Withdraw')} activeOpacity={0.6}>
            <Wallet size={20} color={colors.textSecondary} />
            <Text style={styles.menuLabel}>提现申请</Text>
            <CaretRight size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Profile')} activeOpacity={0.6}>
            <User size={20} color={colors.textSecondary} />
            <Text style={styles.menuLabel}>个人资料</Text>
            <CaretRight size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')} activeOpacity={0.6}>
            <Power size={20} color={colors.textSecondary} />
            <Text style={styles.menuLabel}>设置</Text>
            <CaretRight size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary, padding: spacing.lg,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    paddingBottom: spacing.xl + spacing.md,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { fontSize: 24, color: colors.primary, fontWeight: fontWeight.bold },
  userText: { flex: 1 },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#fff' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rating: { color: '#FFD700', marginLeft: 4, fontWeight: fontWeight.semibold },
  serviceCount: { color: 'rgba(255, 255, 255, 0.8)', marginLeft: spacing.sm, fontSize: fontSize.sm },
  notifBtn: { position: 'relative' },
  notifDot: {
    position: 'absolute', top: -2, right: -2, width: 8, height: 8,
    borderRadius: 4, backgroundColor: colors.error, borderWidth: 1.5, borderColor: colors.primary,
  },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    marginTop: spacing.lg,
  },
  statusInfo: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  statusText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.medium },
  statsSkeleton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: colors.card, marginHorizontal: spacing.md,
    marginTop: -spacing.md, borderRadius: radius.lg, padding: spacing.md,
    ...shadow.sm,
  },
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.card,
    marginHorizontal: spacing.md, marginTop: -spacing.md,
    borderRadius: radius.lg, padding: spacing.md, ...shadow.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: colors.divider, marginHorizontal: spacing.sm, height: 40, alignSelf: 'center' },
  statValue: { fontSize: fontSize.xxl, color: colors.textPrimary, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 4 },
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.card,
    marginHorizontal: spacing.md, marginTop: spacing.md,
    borderRadius: radius.lg, padding: spacing.sm, ...shadow.sm,
  },
  quickItem: { width: '25%', alignItems: 'center', paddingVertical: spacing.md },
  quickIcon: {
    width: 48, height: 48, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  quickLabel: { fontSize: fontSize.xs, color: colors.textPrimary, fontWeight: fontWeight.medium },
  menuGroup: {
    backgroundColor: colors.card, marginHorizontal: spacing.md,
    marginTop: spacing.md, marginBottom: spacing.xl,
    borderRadius: radius.lg, paddingVertical: spacing.xs, ...shadow.sm,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  menuLabel: { flex: 1, fontSize: fontSize.base, color: colors.textPrimary, marginLeft: spacing.md },
  menuValue: { fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.semibold, marginRight: spacing.sm },
});

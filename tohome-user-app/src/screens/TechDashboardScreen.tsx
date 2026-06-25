// 达人工作台 — 并入用户端"我的"页面
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, RefreshControl,
} from 'react-native';
import {
  Star, Wallet, TrendingUp, Clock, CheckCircle, Bell, MapPin,
  CaretRight, Fire, Power,
} from '../components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { techApi, talentOrderApi } from '../api/tech';
import { useUserStore } from '../store/userStore';
import { useToast } from '../components/Toast';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';

export const TechDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const userInfo = useUserStore(state => state.userInfo);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [workStatus, setWorkStatus] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ['talentProfile'],
    queryFn: () => techApi.getProfile(),
    enabled: true,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['talentDashboard'],
    queryFn: () => techApi.getDashboard(),
    enabled: true,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['talentPendingOrders'],
    queryFn: () => talentOrderApi.getPending(),
    enabled: true,
  });

  const talentInfo = profileData?.data;
  const dashboard = dashboardData?.data;
  const pendingOrders = pendingData?.data?.list || [];

  useEffect(() => {
    if (talentInfo) {
      setWorkStatus(talentInfo.work_status);
    }
  }, [talentInfo]);

  const handleToggleWork = async (value: boolean) => {
    const newStatus = value ? 1 : 0;
    try {
      await techApi.updateWorkStatus(newStatus);
      setWorkStatus(newStatus);
      queryClient.invalidateQueries({ queryKey: ['talentProfile'] });
      toast.success(value ? '已上线接单' : '已下线休息');
    } catch (e: any) {
      toast.error(e.message || '切换失败');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['talentProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['talentDashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['talentPendingOrders'] }),
    ]);
    setRefreshing(false);
  };

  const workStatusText: Record<number, { label: string; color: string }> = {
    0: { label: '离线休息', color: colors.textTertiary },
    1: { label: '接单中', color: colors.success },
    2: { label: '暂停接单', color: colors.warning },
  };
  const ws = workStatusText[workStatus] || workStatusText[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {/* 顶部达人卡片 */}
        <View style={styles.headerCard}>
          <View style={styles.userInfoRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{talentInfo?.real_name?.charAt(0) || userInfo?.nickname?.charAt(0) || '达'}</Text>
            </View>
            <View style={styles.userTextWrap}>
              <Text style={styles.name}>{talentInfo?.real_name || userInfo?.nickname || '达人'}</Text>
              <View style={styles.ratingRow}>
                <Star size={14} color={colors.gold} />
                <Text style={styles.rating}>{talentInfo?.rating?.toFixed(1) || '5.0'}</Text>
                <Text style={styles.serviceCount}>已服务 {talentInfo?.service_count || 0} 单</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notifBtn} onPress={() => toast.info('消息中心开发中')}>
              <Bell size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* 工作状态 */}
          <View style={styles.statusCard}>
            <View style={styles.statusInfo}>
              <View style={[styles.statusDot, { backgroundColor: ws.color }]} />
              <Text style={[styles.statusText, { color: ws.color }]}>{ws.label}</Text>
            </View>
            <Switch
              value={workStatus === 1}
              onValueChange={handleToggleWork}
              trackColor={{ false: '#d1d5db', true: colors.success + '80' }}
              thumbColor={workStatus === 1 ? '#fff' : '#f9fafb'}
            />
          </View>
        </View>

        {/* 今日数据 */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>¥{dashboard?.today_stats?.total_income?.toFixed(0) || '0'}</Text>
            <Text style={styles.statLabel}>今日收入</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{dashboard?.today_stats?.order_count || '0'}</Text>
            <Text style={styles.statLabel}>完成订单</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{dashboard?.today_stats?.service_hours?.toFixed(1) || '0'}h</Text>
            <Text style={styles.statLabel}>服务时长</Text>
          </View>
        </View>

        {/* 快捷入口 */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>达人服务</Text>
          <View style={styles.quickGrid}>
            {[
              { icon: Fire, label: '抢单池', color: colors.error, onPress: () => toast.info('抢单池开发中') },
              { icon: Clock, label: '待接订单', color: colors.primary, badge: pendingOrders.length, onPress: () => toast.info('订单列表开发中') },
              { icon: CheckCircle, label: '服务中', color: colors.success, onPress: () => toast.info('当前订单开发中') },
              { icon: MapPin, label: '位置上报', color: colors.info, onPress: () => toast.info('位置上报开发中') },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity key={index} style={styles.quickItem} onPress={item.onPress} activeOpacity={0.7}>
                  <View style={[styles.quickIcon, { backgroundColor: item.color + '12' }]}>
                    <Icon size={24} color={item.color} />
                    {item.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.quickLabel}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 财务菜单 */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>财务管理</Text>
          {[
            {
              icon: Wallet,
              label: '我的收入',
              value: `¥${(talentInfo?.total_income || 0).toFixed(2)}`,
              onPress: () => toast.info('收入明细开发中'),
            },
            {
              icon: TrendingUp,
              label: '可提现余额',
              value: `¥${(talentInfo?.balance || 0).toFixed(2)}`,
              onPress: () => toast.info('提现功能开发中'),
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
                <View style={styles.menuIcon}>
                  <Icon size={20} color={colors.textSecondary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuValue}>{item.value}</Text>
                <CaretRight size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 设置 */}
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => toast.info('达人资料开发中')} activeOpacity={0.7}>
            <View style={styles.menuIcon}>
              <Power size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.menuLabel}>达人资料</Text>
            <CaretRight size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // 头部卡片
  headerCard: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  userInfoRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#ffffff30',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#fff',
  },
  userTextWrap: { flex: 1, marginLeft: spacing.md },
  name: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#fff',
  },
  ratingRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: 4,
  },
  rating: {
    fontSize: fontSize.sm, color: '#ffffffcc', fontWeight: fontWeight.medium,
  },
  serviceCount: {
    fontSize: fontSize.sm, color: '#ffffff99', marginLeft: spacing.sm,
  },
  notifBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: '#ffffff20', alignItems: 'center', justifyContent: 'center',
  },

  // 工作状态
  statusCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff15', borderRadius: radius.lg,
    padding: spacing.md, marginTop: spacing.lg,
  },
  statusInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  statusDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  statusText: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
  },

  // 统计卡片
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: spacing.md, marginTop: spacing.md,
    borderRadius: radius.lg, ...shadow.md,
    paddingVertical: spacing.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 2,
  },
  statDivider: {
    width: 1, height: 40, backgroundColor: colors.divider,
  },

  // 菜单组
  menuGroup: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md, marginTop: spacing.md,
    borderRadius: radius.lg, ...shadow.sm,
    borderWidth: 1, borderColor: colors.border + '50',
    overflow: 'hidden',
  },
  menuGroupTitle: {
    fontSize: fontSize.base, fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },

  // 快捷入口
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.sm, paddingBottom: spacing.md,
  },
  quickItem: {
    width: '25%', alignItems: 'center', paddingVertical: spacing.sm,
  },
  quickIcon: {
    width: 52, height: 52, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  quickLabel: {
    fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium,
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: {
    fontSize: fontSize.xs, color: '#fff', fontWeight: fontWeight.bold,
    paddingHorizontal: 4,
  },

  // 菜单项
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuLabel: { flex: 1, fontSize: fontSize.base, color: colors.textPrimary },
  menuValue: {
    fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.semibold,
    marginRight: spacing.sm,
  },
});

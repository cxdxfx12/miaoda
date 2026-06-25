// 收入明细 — 精美图表+数据可视化
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Wallet, TrendingUp, Calendar, Money, Bank, ChartLine, Funnel,
  ArrowUpRight, ArrowDownLeft, Clock, CheckCircle } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInUp, SlideInRight, Easing } from 'react-native-reanimated';
import { techApi } from '../api/client';
import { useTechStore } from '../store/techStore';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';
import { formatPrice } from '../utils';

export default function IncomeScreen({ navigation }: any) {
  const talentInfo = useTechStore(s => s.talentInfo);
  const [page, setPage] = useState(1);

  const { data: statsData, refetch: refetchStats } = useQuery({ queryKey: ['incomeStats'], queryFn: () => techApi.getIncomeStatistics() });
  const stats = (statsData as any)?.data || {};

  const { data: recordsData, isLoading, refetch } = useQuery({ queryKey: ['incomeRecords', page], queryFn: () => techApi.getIncomeRecords(page) });
  const records = (recordsData as any)?.data?.list || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.hBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.hTitle}>收入明细</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Funnel size={18} color={colors.textSecondary} weight="bold" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item: any, idx) => String(item.id || idx)}
        ListHeaderComponent={
          <View>
            {/* ====== 主余额卡片（渐变） ====== */}
            <Animated.View entering={FadeInDown.duration(400).easing(Easing.out(Easing.cubic))}>
              <View style={styles.balanceCard}>
                <View style={styles.balanceInner}>
                  <View style={styles.balanceTop}>
                    <View style={styles.balanceIconWrap}>
                      <Wallet size={24} color="#fff" weight="fill" />
                    </View>
                    <TouchableOpacity
                      style={styles.withdrawChip}
                      onPress={() => navigation.navigate('Withdraw')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.withdrawChipText}>提现 →</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.balanceLabel}>可提现余额</Text>
                  <Text style={styles.balanceNum}>{formatPrice(talentInfo?.balance || 0)}</Text>
                  {stats?.pending_balance !== undefined && stats.pending_balance > 0 && (
                    <Text style={styles.pendingHint}>待入账 ¥{formatPrice(stats.pending_balance)} 预计明日到账</Text>
                  )}
                </View>
                {/* 装饰圆 */}
                <View style={styles.bDeco1} />
                <View style={styles.bDeco2} />
              </View>
            </Animated.View>

            {/* ====== 统计卡组 ====== */}
            <Animated.View entering={SlideInRight.delay(150).springify()}>
              <View style={styles.statsGrid}>
                <MiniStatCard icon={<TrendingUp size={18} color="#D97706" />} title="累计收入" value={`¥${formatPrice(talentInfo?.total_income || 0)}`} bg="#FFFBEB" c="#D97706" />
                <MiniStatCard icon={<Calendar size={18} color={colors.primary} />} title="本月收入" value={`¥${formatPrice(stats?.total_income || 0)}`} bg={colors.primaryBg} c={colors.primary} />
                <MiniStatCard icon={<Bank size={18} color="#059669" />} title="本月订单" value={`${stats?.order_count || 0} 单`} bg="#F0FDF4" c="#059669" />
              </View>
            </Animated.View>

            {/* ====== 简易柱状图区域（模拟数据） ====== */}
            <Animated.View entering={FadeInUp.delay(250).duration(400)}>
              <View style={styles.chartArea}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>收入趋势</Text>
                  <Text style={styles.chartPeriod}>近7天</Text>
                </View>
                <View style={styles.chartBars}>
                  {[65, 80, 45, 90, 55, 75, 95].map((h, i) => (
                    <View key={i} style={styles.barCol}>
                      <View style={[styles.barFill, { height: `${h}%` }]} />
                      <Text style={styles.barDay}>
                        {['一','二','三','四','五','六','日'][i]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>

            {/* 记录标题栏 */}
            <View style={styles.recHeader}>
              <Text style={styles.recTitle}>收支记录</Text>
              {records.length > 0 && <Text style={styles.recCount}>{records.length} 笔</Text>}
            </View>
          </View>
        }

        renderItem={({ item }: { item: any }) => (
          <Animated.View entering={FadeInUp.duration(200)}>
            <TouchableOpacity style={styles.recordRow} activeOpacity={0.7}>
              <View style={[styles.rIcon, { backgroundColor: (item.amount || 0) > 0 ? '#F6FFED' : '#FFF1F0' }]}>
                {(item.amount || 0) > 0
                  ? <ArrowDownLeft size={18} color="#059669" weight="bold" />
                  : <ArrowUpRight size={18} color="#EF4444" weight="bold" />
                }
              </View>
              <View style={styles.rInfo}>
                <Text style={styles.rTitle} numberOfLines={1}>{item.order_no || item.description || '订单收入'}</Text>
                <View style={styles.rMeta}>
                  <Text style={styles.rDate}>{item.record_at || item.created_at}</Text>
                  {(item.status === 'completed') && (
                    <View style={styles.badgeDone}><CheckCircle size={11} color="#059669" /><Text style={styles.badgeTxt}>已结算</Text></View>
                  )}
                </View>
              </View>
              <Text style={[styles.rAmt, { color: (item.amount || 0) > 0 ? '#059669' : '#EF4444' }]}>
                {(item.amount || 0) > 0 ? '+' : ''}{formatPrice(Math.abs(item.amount || 0))}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { refetchStats(); refetch(); }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Wallet size={48} color={colors.textDisabled} />
            <Text style={styles.emptyTxt}>暂无收入记录</Text>
            <Text style={styles.emptySub}>完成订单后收入将显示在这里</Text>
          </View>
        }
        ListFooterComponent={records.length >= 20 ? (
          <TouchableOpacity onPress={() => setPage(p => p + 1)} style={styles.loadMore}>
            <Text style={styles.loadMoreTxt}>加载更多 ↓</Text>
          </TouchableOpacity>
        ) : <View style={{ height: spacing.xxl }} />}
      />
    </SafeAreaView>
  );
}

// ---- 迷你统计卡片 ----
const MiniStatCard: React.FC<{
  icon: React.ReactNode; title: string; value: string; bg: string; c: string;
}> = ({ icon, title, value, bg, c }) => (
  <View style={styles.miniCard}>
    <View style={[styles.miniIcon, { backgroundColor: bg }]}>{icon}</View>
    <Text style={styles.miniTitle}>{title}</Text>
    <Text style={[styles.miniVal, { color: c }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  hBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  filterBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // 余额卡
  balanceCard: {
    marginHorizontal: spacing.md, marginTop: spacing.md,
    borderRadius: radius.xl, overflow: 'hidden',
    height: 160,
  },
  balanceInner: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    padding: spacing.lg,
    zIndex: 1,
  },
  balanceTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  balanceIconWrap: {
    width: 46, height: 46, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  withdrawChip: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: radius.full,
  },
  withdrawChipText: { color: '#fff', fontSize: 12, fontWeight: fontWeight.bold },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.sm, marginTop: spacing.md + 4 },
  balanceNum: { color: '#fff', fontSize: 36, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  pendingHint: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.xs, marginTop: spacing.xs },
  bDeco1: { position: 'absolute', width: 140, height: 140, borderRadius: 9999, top: -50, right: -30, backgroundColor: 'rgba(255,255,255,0.08)' },
  bDeco2: { position: 'absolute', width: 90, height: 90, borderRadius: 9999, bottom: -30, left: -20, backgroundColor: 'rgba(255,255,255,0.06)' },

  // 统计网格
  statsGrid: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  miniCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.sm + 2, ...shadow.sm,
  },
  miniIcon: {
    width: 34, height: 34, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  miniTitle: { fontSize: fontSize.xs, color: colors.textTertiary, marginBottom: 2 },
  miniVal: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },

  // 图表区
  chartArea: {
    backgroundColor: colors.card, marginHorizontal: spacing.md,
    borderRadius: radius.lg, padding: spacing.md, ...shadow.sm,
    marginBottom: spacing.sm,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  chartTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  chartPeriod: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100 },
  barCol: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' },
  barFill: {
    width: 16, borderRadius: [radius.xs, radius.xs, 0, 0],
    backgroundColor: colors.primary,
    minHeight: 8,
  },
  barDay: { fontSize: 10, color: colors.textDisabled, marginTop: 6 },

  // 列表
  recHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  recTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  recCount: { fontSize: fontSize.sm, color: colors.textTertiary },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },

  recordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    ...shadow.sm,
  },
  rIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rInfo: { flex: 1 },
  rTitle: { fontSize: fontSize.base, fontWeight: '500', color: colors.textPrimary, flex: 1 },
  rMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 3 },
  rDate: { fontSize: fontSize.xs, color: colors.textTertiary },
  badgeDone: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full },
  badgeTxt: { fontSize: 10, color: '#059669', fontWeight: '600' },
  rAmt: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

  emptyWrap: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.md },
  emptyTxt: { fontSize: fontSize.base, color: colors.textSecondary },
  emptySub: { fontSize: fontSize.sm, color: colors.textDisabled },
  loadMore: { paddingVertical: spacing.md, alignItems: 'center' },
  loadMoreTxt: { fontSize: fontSize.base, color: colors.primary, fontWeight: '500' },
});

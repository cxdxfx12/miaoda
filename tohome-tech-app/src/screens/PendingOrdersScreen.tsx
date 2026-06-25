// 待接订单 — 精美升级版
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { MapPin, Clock, Phone, Check, X, EnvelopeSimpleOpen, Timer, User, CurrencyDollar, ArrowRight, WarningCircle } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInUp, SlideInLeft, Easing } from 'react-native-reanimated';
import { orderApi } from '../api/client';
import Button from '../components/Button';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';
import { formatPrice, maskPhone } from '../utils';

export const PendingOrdersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pendingOrders'], queryFn: () => orderApi.getPending(), refetchInterval: 10000,
  });
  const orders = data?.data?.list || [];

  const handleAccept = async (id: number) => {
    try {
      await orderApi.accept(id);
      Alert.alert('接单成功', '请尽快前往服务地点');
      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.navigate('CurrentOrder');
    } catch (e: any) { Alert.alert('接单失败', e.message); }
  };

  const handleReject = async (id: number) => {
    Alert.alert('提示', '确定拒绝此订单？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', onPress: async () => { await orderApi.reject(id, '距离太远'); queryClient.invalidateQueries({ queryKey: ['pendingOrders'] }); }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>待接订单</Text>
          <Text style={styles.subtitle}>
            {orders.length > 0 ? `附近 ${orders.length} 个订单待处理` : '暂无新订单'}
          </Text>
        </View>
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeNum}>{orders.length}</Text>
        </View>
      </View>

      {/* 列表 */}
      <FlatList
        data={orders}
        keyExtractor={(item, idx) => String(item.id || idx)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 60).duration(350).easing(Easing.out(Easing.cubic))}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate('CurrentOrder')}
              style={styles.card}
            >
              {/* 卡片顶部：标签 + 金额 */}
              <View style={styles.cardTop}>
                <View style={styles.tagRow}>
                  <View style={styles.svcTag}>
                    <Timer size={12} color={colors.primary} weight="fill" />
                    <Text style={styles.svcTxt}>{item.service_name}</Text>
                  </View>
                  <Text style={styles.distTag}>{item.distance_km ? `${item.distance_km}km` : '附近'}</Text>
                </View>
                <Text style={styles.amt}>{formatPrice(item.final_amount)}</Text>
              </View>

              {/* 地址 + 时间信息 */}
              <View style={styles.infoBlock}>
                <View style={styles.iRow}>
                  <MapPin size={15} color="#6366F1" weight="fill" />
                  <Text style={styles.iTxt} numberOfLines={2}>{item.service_address?.detail || '服务地址'}</Text>
                </View>
                <View style={[styles.iRow, styles.iRow2]}>
                  <Clock size={14} color={colors.textTertiary} />
                  <Text style={[styles.iTxt2, { flex: 1 }]}>
                    {(item.appointment_time || '').replace('T', ' ').substring(0, 16)}
                  </Text>
                  {item.user_phone && (
                    <View style={styles.userChip}>
                      <User size={11} color={colors.textSecondary} />
                      <Text style={styles.userTxt}>{item.user_name || ''} {maskPhone(item.user_phone)}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 底部操作栏 */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(item.id)}
                  activeOpacity={0.7}
                >
                  <X size={14} color={colors.textSecondary} weight="bold" />
                  <Text style={styles.rejectTxt}>拒绝</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAccept(item.id)}
                  activeOpacity={0.75}
                >
                  <Check size={15} color="#fff" weight="bold" />
                  <Text style={styles.acceptTxt}>接受订单</Text>
                  <ArrowRight size={13} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        ListEmptyComponent={
          !isLoading && (
            <Animated.View entering={FadeInUp.duration(400)}>
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconW}><EnvelopeSimpleOpen size={42} color={colors.textDisabled} /></View>
                <Text style={styles.emptyTitle}>暂无待接订单</Text>
                <Text style={styles.emptySub}>有新订单时会自动提醒你</Text>
                <Button title="去抢单" type="primary" onPress={() => navigation.navigate('GrabPool')} style={{ marginTop: spacing.md }} />
              </View>
            </Animated.View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg - 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 3 },
  badgeWrap: {
    position: 'absolute', right: spacing.lg, top: spacing.md - 4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  badgeNum: { fontSize: 13, fontWeight: fontWeight.bold, color: '#fff' },

  listContent: { padding: spacing.md, flexGrow: 1, gap: spacing.sm },

  card: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: spacing.md, marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: colors.border + '50',
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  tagRow: { flexDirection: 'row', gap: spacing.sm, flex: 1 },
  svcTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
  },
  svcTxt: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  distTag: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.full, fontSize: fontSize.xs, color: colors.textTertiary,
    alignSelf: 'flex-start',
  },
  amt: { fontSize: fontSize.xxl, color: colors.primary, fontWeight: fontWeight.bold },

  infoBlock: { paddingVertical: spacing.sm + 2 },
  iRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs + 2 },
  iRow2: { marginBottom: 0 },
  iTxt: { flex: 1, fontSize: fontSize.base, color: colors.textPrimary, marginLeft: spacing.sm, lineHeight: 20 },
  iTxt2: { fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: spacing.sm },
  userChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.full,
  },
  userTxt: { fontSize: 11, color: colors.textTertiary },

  actions: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm,
    paddingTop: spacing.sm - 2,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider,
  },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: '#fff',
  },
  rejectTxt: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
    borderRadius: radius.full, backgroundColor: colors.primary,
    ...shadow.sm,
  },
  acceptTxt: { fontSize: fontSize.sm, fontWeight: 'bold', color: '#fff' },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyIconW: {
    width: 88, height: 88, borderRadius: 9999,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  emptySub: { fontSize: fontSize.sm, color: colors.textTertiary },
});

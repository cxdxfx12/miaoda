// 当前服务订单 — 商业级精美 UI
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Animated, Platform } from 'react-native';
import {
  ClipboardText, MapPin, Phone, ChatCircle, NavigationArrow,
  CheckCircle, Clock, X, Timer, User, Calendar, CurrencyDollar,
  ShieldCheck, Warning, ArrowRight,
} from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AnimatedRN, { FadeInDown, FadeInUp, SlideInRight, Easing as AEasing, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { orderApi } from '../api/client';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';
import { formatPrice, maskPhone } from '../utils';

const STEP_CFG = [
  { label: '已接单', icon: 'checkmark-circle' as const, c: '#94A3B8' },
  { label: '出发中', icon: 'navigate' as const, c: '#6366F1' },
  { label: '已到达', icon: 'location' as const, c: '#0891B2' },
  { label: '服务中', icon: 'time' as const, c: '#D97706' },
  { label: '已完成', icon: 'checkmark-circle' as const, c: '#059669' },
];

export const CurrentOrderScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);

  const { data, isError, refetch } = useQuery({
    queryKey: ['currentOrder'], queryFn: () => orderApi.getCurrent(), refetchInterval: 30000,
  });
  const order = data?.data;

  useEffect(() => {
    if (order?.status === 3 && order?.start_time) {
      const start = new Date(order.start_time).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
      const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
      return () => clearInterval(timer);
    }
  }, [order?.status, order?.start_time]);

  const handleCall = () => order?.user_phone && Linking.openURL(`tel:${order.user_phone}`);
  const handleNav = () => {
    if (order?.service_address) Linking.openURL(
      `geo:${order.service_address.lat},${order.service_address.lng}?q=${order.service_address.lat},${order.service_address.lng}(服务地点)`
    );
  };

  const updateStatus = async (st: string) => {
    const m: Record<string, string> = { departed: '出发', arrived: '到达打卡', started: '开始服务', completed: '完成服务' };
    try {
      await orderApi.updateStatus(order.id, st);
      toast.success(`${m[st]}成功`); refetch(); queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e: any) { toast.error(e.message || '操作失败'); }
  };

  // ---- 空状态 ----
  if (!order) return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyWrap}>
        <ClipboardText size={48} color={colors.textDisabled} />
        <Text style={styles.emptyTxt}>暂无进行中的订单</Text>
        <Button title="查看待接订单" type="primary" onPress={() => navigation.navigate('PendingOrders')} style={styles.eBtn} />
      </Animated.View>
    </SafeAreaView>
  );

  const curIdx = order.status >= 4 ? 4 : order.status >= 3 ? 3 : order.status >= 2 ? 2 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollC} showsVerticalScrollIndicator={false}>
        {/* ====== 头部标题栏 ====== */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <Text style={styles.hTitle}>当前订单</Text>
          <View style={[styles.stBadge, {
            backgroundColor: (STEP_CFG[curIdx]?.c || '#94A3B8') + '16',
          }]}>
            <Text style={[styles.stLbl, { color: STEP_CFG[curIdx]?.c || '#94A3B8' }]}>
              {STEP_CFG[curIdx]?.label || '未知'}
            </Text>
          </View>
        </Animated.View>

        {/* ====== 用户卡片（精致版） ====== */}
        <Animated.View entering={SlideInRight.delay(80).springify()}>
          <View style={styles.userCard}>
            <View style={styles.uLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarT}>{order.user_name?.charAt(0) || 'U'}</Text>
              </View>
              <View style={styles.uInfo}>
                <Text style={styles.uName}>{order.user_name}</Text>
                <Text style={styles.uPhone}>{maskPhone(order.user_phone || '')}</Text>
                <View style={styles.uMeta}>
                  <Calendar size={11} color={colors.textTertiary} />
                  <Text style={styles.uMetaTxt}>
                    {(order.appointment_time || '').replace('T', ' ').substring(0, 16)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.contactRow}>
              <TouchableOpacity style={styles.cBtn} onPress={handleCall} activeOpacity={0.7}>
                <Phone size={18} color={colors.primary} weight="fill" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cBtn, { backgroundColor: colors.successBg }]} activeOpacity={0.7}>
                <ChatCircle size={18} color="#059669" weight="fill" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ====== 进度步骤（视觉升级） ====== */}
        <Animated.View entering={FadeInUp.delay(150).duration(300)}>
          <View style={styles.section}>
            <Text style={styles.secTitle}>服务进度</Text>
            <View style={stepsStyleAny.steps}>
              {STEP_CFG.map((step, i) => (
                <React.Fragment key={i}>
                  <View style={[stepsStyle.stepItem]}>
                    <View style={[
                      stepsStyle.stepDot,
                      i <= curIdx && [stepsStyle.stepDotActive, { backgroundColor: step.c }],
                    ]}>
                      {i <= curIdx && i < 4 ? (
                        <CheckCircle size={10} color="#fff" weight="fill" />
                      ) : null}
                    </View>
                    <Text style={[
                      stepsStyle.stepLabel,
                      i === curIdx && { color: step.c, fontWeight: '600' },
                      i < curIdx && { color: step.c },
                    ]}>{step.label}</Text>
                  </View>
                  {i < STEP_CFG.length - 1 && (
                    <View style={[stepsStyle.line, i < curIdx && { backgroundColor: step.c }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ====== 服务详情 ====== */}
        <Animated.View entering={SlideInRight.delay(200).springify()}>
          <View style={styles.section}>
            <Text style={styles.secTitle}>服务详情</Text>
            {[
              { l: '服务项目', v: order.service_name, highlight: false },
              { l: '服务规格', v: order.service_spec, highlight: false },
              { l: '预约时间', v: (order.appointment_time || '').replace('T', ' ').substring(0, 16), highlight: false },
              { l: '服务费用', v: formatPrice(order.final_amount), highlight: true },
            ].map((r, i) => (
              <View key={i} style={[styles.dRow, !highlight && i < 3 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}>
                <Text style={styles.dLbl}>{r.l}</Text>
                <Text style={[styles.dVal, r.highlight && styles.dValHi]}>{r.v}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ====== 服务地址 ====== */}
        <Animated.View entering={FadeInUp.delay(260).springify()}>
          <View style={[styles.section, styles.addrSection]}>
            <Text style={styles.secTitle}>服务地址</Text>
            <View style={styles.addrMain}>
              <MapPin size={20} color={colors.primary} weight="fill" />
              <View style={styles.addrBody}>
                <Text style={styles.addrLine}>
                  {[order.service_address?.province, order.service_address?.city, order.service_address?.district].filter(Boolean).join(' ')}
                </Text>
                <Text style={styles.addrDetail}>{order.service_address?.detail}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.navBtn} onPress={handleNav} activeOpacity={0.75}>
              <NavigationArrow size={16} color={colors.primary} weight="bold" />
              <Text style={styles.navTxt}>导航前往</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ====== 服务计时器 ====== */}
        {order.status === 3 && (
          <Animated.View entering={FadeInDown.delay(320).springify()}>
            <View style={styles.timerCard}>
              <View style={styles.timerIconW}>
                <Clock size={22} color={colors.primary} weight="duotone" />
              </View>
              <View style={styles.timerBody}>
                <Text style={styles.timerLbl}>⏱ 服务进行中</Text>
                <Text style={styles.timerVal}>
                  {Math.floor(elapsed / 3600).toString().padStart(2, '0')}:
                  {(Math.floor(elapsed / 60) % 60).toString().padStart(2, '0')}:
                  {(elapsed % 60).toString().padStart(2, '0')}
                </Text>
                <Text style={styles.timerSub}>已服务 {Math.floor(elapsed / 60)} 分 {elapsed % 60} 秒</Text>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ====== 底部操作栏 ====== */}
      <View style={styles.footer}>
        {order.status === 1 && (
          <>
            <TouchableOpacity style={styles.secAction} onPress={handleCall} activeOpacity={0.7}>
              <Phone size={16} color={colors.textSecondary} />
              <Text style={styles.secActTxt}>联系用户</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.priAction} onPress={() => updateStatus('departed')} activeOpacity={0.8}>
              <NavigationArrow size={16} color="#fff" weight="bold" />
              <Text style={styles.priActTxt}>出发前往</Text>
            </TouchableOpacity>
          </>
        )}
        {order.status === 2 && (
          <>
            <TouchableOpacity style={styles.secAction} onPress={handleCall} activeOpacity={0.7}>
              <Phone size={16} color={colors.textSecondary} />
              <Text style={styles.secActTxt}>联系用户</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.priAction, { backgroundColor: '#0891B2' }]} onPress={() => updateStatus('arrived')} activeOpacity={0.8}>
              <CheckCircle size={16} color="#fff" weight="fill" />
              <Text style={styles.priActTxt}>到达打卡</Text>
            </TouchableOpacity>
          </>
        )}
        {(order.status as number) >= 3 && (order.status as number) < 4 && (
          <TouchableOpacity style={[styles.priFull, { backgroundColor: '#D97706' }]} onPress={() => updateStatus('started')} activeOpacity={0.8}>
            <Clock size={18} color="#fff" weight="bold" />
            <Text style={styles.priFullTxt}>开始服务</Text>
          </TouchableOpacity>
        )}
        {order.status === 3 && (
          <TouchableOpacity style={[styles.priFull, { backgroundColor: '#059669' }]} onPress={() => updateStatus('completed')} activeOpacity={0.8}>
            <CheckCircle size={18} color="#fff" weight="fill" />
            <Text style={styles.priFullTxt}>完成服务，结算收入</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

// 步骤条样式（内联避免冲突）
const stepsStyle = (() => {
  const s = StyleSheet.create({});
  return s;
})();

const stepsStyleAny = StyleSheet.create({
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stepDotActive: {},
  stepLabel: { fontSize: 10.5, color: colors.textTertiary, textAlign: 'center' },
  line: { width: 16, height: 2.5, backgroundColor: '#E5E7EB', marginHorizontal: -4, marginTop: -12 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollC: { paddingBottom: 90 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 4,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  hTitle: { fontSize: fontSize.xl + 1, fontWeight: fontWeight.bold, color: colors.textPrimary },
  stBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  stLbl: { fontSize: fontSize.sm, fontWeight: '700' },

  userCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, marginHorizontal: spacing.lg, marginTop: spacing.md,
    padding: spacing.md, borderRadius: radius.xl, ...shadow.md,
  },
  uLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarT: { fontSize: 21, color: colors.primary, fontWeight: fontWeight.bold },
  uInfo: { flex: 1 },
  uName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  uPhone: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 2 },
  uMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  uMetaTxt: { fontSize: fontSize.xs, color: colors.textTertiary },
  contactRow: { flexDirection: 'row', gap: spacing.sm },
  cBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },

  section: {
    backgroundColor: colors.card, marginHorizontal: spacing.lg,
    marginTop: spacing.md, padding: spacing.md, borderRadius: radius.xl, ...shadow.sm,
  },
  secTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.md },
  dRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs + 2 },
  dLbl: { fontSize: fontSize.base, color: colors.textSecondary },
  dVal: { fontSize: fontSize.base, color: colors.textPrimary },
  dValHi: { color: colors.primary, fontWeight: '700', fontSize: fontSize.md },

  addrSection: {},
  addrMain: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  addrBody: { flex: 1, marginLeft: spacing.sm },
  addrLine: { fontSize: fontSize.base, color: colors.textPrimary, fontWeight: '500' },
  addrDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primaryBg, paddingVertical: spacing.sm, borderRadius: radius.full,
  },
  navTxt: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },

  timerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFBEB', marginHorizontal: spacing.lg,
    marginTop: spacing.md, padding: spacing.md, borderRadius: radius.xl,
    borderLeftWidth: 4, borderLeftColor: '#D97706',
  },
  timerIconW: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  timerBody: { flex: 1 },
  timerLbl: { fontSize: fontSize.sm, color: colors.textSecondary },
  timerVal: {
    fontSize: fontSize.xl + 2, fontWeight: fontWeight.bold,
    color: '#D97706', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timerSub: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },

  footer: {
    flexDirection: 'row', backgroundColor: colors.card,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 4,
    borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm,
  },
  secAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: '#fff',
  },
  secActTxt: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  priAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: colors.primary,
    ...shadow.sm,
  },
  priActTxt: { fontSize: fontSize.sm, fontWeight: 'bold', color: '#fff' },
  priFull: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: spacing.md + 2, borderRadius: radius.full,
    ...shadow.md,
  },
  priFullTxt: { fontSize: fontSize.md, fontWeight: 'bold', color: '#fff' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyTxt: { fontSize: fontSize.lg, color: colors.textSecondary, marginTop: spacing.md },
  eBtn: { marginTop: spacing.xl },
});

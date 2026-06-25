// 达人「我的」页面 — 精品 UI
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { User, Star, MapPin, Phone, Wallet, GearSix, ShieldCheck, Question, SignOut,
  CaretRight, Clock, Trophy, IdentificationCard, Bell, PencilSimple,
  ChevronRight, Heart, Banknote, ChartLineUp, ArrowRight, TrendingUp, Timer } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight, Easing } from 'react-native-reanimated';
import { useTechStore } from '../store/techStore';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';
import { formatPrice, getAvatarColor } from '../utils';
import { WORK_STATUS_TEXT, WORK_STATUS_COLORS } from '../config';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const talentInfo = useTechStore(s => s.talentInfo);
  const logout = useTechStore(s => s.logout);

  const menuSections = [
    {
      items: [
        { icon: PencilSimple, label: '编辑资料', route: 'EditProfile', color: colors.primary },
        { icon: IdentificationCard, label: '资质认证', route: 'TalentRegister', color: '#7C3AED' },
        { icon: Wallet, label: '收入明细', route: 'IncomeRecords', color: '#059669' },
        { icon: Banknote, label: '提现管理', route: 'Withdraw', color: '#D97706' },
      ],
    },
    {
      title: '服务数据',
      items: [
        { icon: ChartLineUp, label: '服务统计', route: 'ServiceStats', color: '#0891B2' },
        { icon: Trophy, label: '我的评价', route: 'MyReviews', color: '#DB2777' },
        { icon: Clock, label: '服务记录', route: 'ServiceHistory', color: '#6366F1' },
      ],
    },
    {
      title: '更多',
      items: [
        { icon: Bell, label: '消息通知', route: 'Notifications', color: '#EF4444' },
        { icon: Question, label: '帮助与反馈', route: 'Help', color: colors.textSecondary },
        { icon: GearSix, label: '设置', route: 'Settings', color: colors.textTertiary },
      ],
    },
  ];

  const avatarBg = getAvatarColor(talentInfo?.real_name || '达');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 渐变头部 */}
        <View style={styles.headerArea}>
          <View style={[styles.headerGradient]} />
          <View style={[styles.decoCircle, styles.deco1]} />
          <View style={[styles.decoCircle, styles.deco2]} />

          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('EditProfile')}>
            <Animated.View entering={FadeInUp.duration(500).easing(Easing.out(Easing.cubic))}>
              <View style={styles.glassCard}>
                <View style={{ position: 'relative', marginRight: spacing.md }}>
                  <View style={[styles.avatarRing, { borderColor: avatarBg + '40' }]}>
                    <View style={[styles.avatarBox, { backgroundColor: avatarBg + '14' }]}>
                      <Text style={[styles.avatarLetter, { color: avatarBg }]}>
                        {talentInfo?.real_name?.charAt(0) || '达'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.onlineDot, { backgroundColor: (talentInfo?.work_status === 1) ? '#22C55E' : '#9CA3AF' }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{talentInfo?.real_name || '未登录达人'}</Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.statusPill, { backgroundColor: (WORK_STATUS_COLORS as any)[talentInfo?.work_status || 0] + '18' }]}>
                      <View style={[styles.dot, { backgroundColor: (WORK_STATUS_COLORS as any)[talentInfo?.work_status || 0] }]} />
                      <Text style={[styles.statusTxt, { color: (WORK_STATUS_COLORS as any)[talentInfo?.work_status || 0] }]}>
                        {(WORK_STATUS_TEXT as any)[talentInfo?.work_status || 0] || '离线'}
                      </Text>
                    </View>
                    <View style={styles.starPill}>
                      <Star size={12} color="#F59E0B" weight="fill" />
                      <Text style={styles.starTxt}>{talentInfo?.rating?.toFixed(1) || '5.0'}</Text>
                    </View>
                  </View>
                </View>
                <ArrowRight size={18} color={colors.textDisabled} />
              </View>
            </Animated.View>

            {/* 统计卡 */}
            <Animated.View entering={FadeInDown.delay(150).duration(400)}>
              <View style={styles.statsRow}>
                <SItem num={String(talentInfo?.service_count || 0)} label="服务单数" c="#0891B2" />
                <View style={styles.divider} />
                <SItem num={formatPrice(talentInfo?.total_income || 0)} label="累计收入" c="#D97706" />
                <View style={styles.divider} />
                <SItem num={formatPrice(talentInfo?.balance || 0)} label="可提现" c="#059669" highlight />
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* 快捷操作 */}
        <Animated.View entering={SlideInRight.delay(250).springify()}>
          <View style={styles.quickBar}>
            {[
              { icon: Phone, label: '联系客服', c: '#10B981' }, { icon: Heart, label: '我的收藏', c: '#EC4899' },
              { icon: ShieldCheck, label: '账号安全', c: '#6366F1' }, { icon: MapPin, label: '服务区域', c: '#F59E0B' },
            ].map((item, i) => {
              const Ic = item.icon;
              return (
                <TouchableOpacity key={i} style={styles.qi} activeOpacity={0.7}>
                  <View style={[styles.qIcon, { backgroundColor: item.c + '16' }]}>
                    <Ic size={20} color={item.c} weight="duotone" />
                  </View>
                  <Text style={styles.qLabel}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* 菜单 */}
        {menuSections.map((sec, si) => (
          <Animated.View key={si} entering={FadeInUp.delay(300 + si * 80).duration(350)}>
            <View style={styles.sec}>
              {sec.title && <Text style={styles.secTitle}>{sec.title}</Text>}
              <View style={styles.mCard}>
                {sec.items.map((it, ii) => {
                  const Ic = it.icon;
                  return (
                    <TouchableOpacity key={ii}
                      style={[styles.mRow, ii !== sec.items.length - 1 && styles.mBor]}
                      onPress={() => it.route && navigation.navigate(it.route)}
                      activeOpacity={0.6}>
                      <View style={[styles.mIcon, { backgroundColor: it.color + '10' }]}>
                        <Ic size={17} color={it.color} weight="duotone" />
                      </View>
                      <Text style={styles.mLbl}>{it.label}</Text>
                      <CaretRight size={15} color={colors.textDisabled} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        ))}

        {/* 退出 */}
        <Animated.View entering={FadeInUp.delay(550).duration(300)}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
            <SignOut size={18} color={colors.error} weight="bold" />
            <Text style={styles.logoutTxt}>退出登录</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: spacing.xxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const SItem: React.FC<{ num: string; label: string; c: string; highlight?: boolean }> = ({ num, label, highlight }) => (
  <View style={styles.sItem}>
    <Text style={[styles.sNum, highlight && styles.sNumHi]}>{num}</Text>
    <Text style={styles.sLbl}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerArea: { paddingTop: spacing.xl },
  headerGradient: { position: 'absolute', top: -60, left: -20, right: -20, height: 260, borderRadius: radius.xxl * 2, backgroundColor: colors.primary },
  decoCircle: { position: 'absolute', borderRadius: 9999, opacity: 0.07 },
  deco1: { width: 180, height: 180, top: -60, right: -30, backgroundColor: '#fff' },
  deco2: { width: 120, height: 120, bottom: 20, left: -20, backgroundColor: '#fff' },

  glassCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,0.95)', ...shadow.lg, zIndex: 1 },
  avatarRing: { padding: 3, borderRadius: 9999, borderWidth: 2 },
  avatarBox: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 24, fontWeight: fontWeight.bold },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: fontSize.xl + 1, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 4 },
  statusTxt: { fontSize: 11, fontWeight: fontWeight.semibold },
  starPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  starTxt: { fontSize: 11, fontWeight: fontWeight.bold, marginLeft: 3, color: '#D97706' },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginTop: -spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.92)', ...shadow.md, zIndex: 0 },
  divider: { width: 1, backgroundColor: colors.divider },
  sItem: { flex: 1, alignItems: 'center' },
  sNum: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.textPrimary },
  sNumHi: { color: colors.primary },
  sLbl: { fontSize: 10.5, color: colors.textTertiary, marginTop: 2 },

  quickBar: { flexDirection: 'row', backgroundColor: colors.card, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.lg, paddingVertical: spacing.md + 2, ...shadow.sm },
  qi: { flex: 1, alignItems: 'center' },
  qIcon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs + 2 },
  qLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: fontWeight.medium },

  sec: { marginTop: spacing.md },
  secTitle: { fontSize: 13, color: colors.textTertiary, fontWeight: fontWeight.semibold, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, letterSpacing: 0.5 },
  mCard: { backgroundColor: colors.card, marginHorizontal: spacing.lg, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
  mRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md + 3 },
  mBor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  mIcon: { width: 34, height: 34, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  mLbl: { flex: 1, fontSize: fontSize.base, color: colors.textPrimary },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, marginHorizontal: spacing.lg, paddingVertical: spacing.md + 2, gap: spacing.sm, borderWidth: 1, borderColor: colors.error + '50', borderRadius: radius.lg, backgroundColor: colors.error + '06' },
  logoutTxt: { fontSize: fontSize.base, color: colors.error, fontWeight: fontWeight.semibold },
});

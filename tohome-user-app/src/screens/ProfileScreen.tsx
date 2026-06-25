// 个人中心 — 高端商业视觉
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert,
} from 'react-native';
import {
  User, Gear, Bell, Heart, MapPin, Receipt,
  Ticket, Wallet, Headphones, SignOut, CaretRight,
  Crown, Star, UserCircle, Briefcase,
} from '../components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../store/userStore';
import { useToast } from '../components/Toast';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';
import { generateAvatar } from '../utils';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const userInfo = useUserStore(state => state.userInfo);
  const isLoggedIn = useUserStore(state => state.isLoggedIn);
  const userType = useUserStore(state => state.userType);
  const logout = useUserStore(state => state.logout);
  const toast = useToast();

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出当前账号吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出', style: 'destructive',
        onPress: async () => {
          await logout();
          toast.success('已退出登录');
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notLogin}>
          <View style={styles.notLoginAvatar}>
            <UserCircle size={56} color={colors.primaryLight} />
          </View>
          <Text style={styles.notLoginTitle}>登录喵搭</Text>
          <Text style={styles.notLoginSub}>登录后享受专业上门按摩服务</Text>
          <TouchableOpacity
            style={styles.notLoginBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}>
            <Text style={styles.notLoginBtnText}>立即登录 / 注册</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const memberLevelText: Record<number, { label: string; color: string }> = {
    0: { label: '普通会员', color: '#94A3B8' },
    1: { label: '白银会员', color: '#A8B8D8' },
    2: { label: '黄金会员', color: colors.gold },
    3: { label: '钻石会员', color: colors.lavender },
  };
  const ml = memberLevelText[userInfo?.member_level || 0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 用户信息卡片 — 渐变氛围 */}
        <View style={styles.userCard}>
          <View style={styles.userBg1} />
          <View style={styles.userBg2} />
          <View style={styles.userInfoRow}>
            <Image
              source={{ uri: userInfo?.avatar || generateAvatar(userInfo?.phone || 'user') }}
              style={styles.avatar}
            />
            <View style={styles.userTextWrap}>
              <Text style={styles.nickname}>{userInfo?.nickname || '用户'}</Text>
              <View style={styles.memberBadge}>
                <Crown size={12} color={ml.color} weight="fill" />
                <Text style={[styles.memberText, { color: ml.color }]}>{ml.label}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.7}>
              <Text style={styles.editBtnText}>编辑资料</Text>
            </TouchableOpacity>
          </View>

          {/* 积分卡 */}
          <View style={styles.pointsCard}>
            <View style={styles.pointsLeft}>
              <Star size={18} color={colors.gold} weight="fill" />
              <Text style={styles.pointsNum}>{userInfo?.member_points || 0}</Text>
              <Text style={styles.pointsLabel}>积分</Text>
            </View>
            <View style={styles.pointsDivider} />
            <View style={styles.pointsRight}>
              <Text style={styles.pointsHint}>更多积分好礼等你兑换</Text>
              <CaretRight size={14} color={colors.primary} />
            </View>
          </View>

          {/* 订单统计 */}
          <View style={styles.statsRow}>
            {[
              { value: '0', label: '待支付', tab: 0 },
              { value: '0', label: '待接单', tab: 1 },
              { value: '1', label: '服务中', tab: 3 },
              { value: '12', label: '已完成', tab: 4 },
            ].map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.statItem}
                onPress={() => navigation.navigate('OrderList', { tab: s.tab })}
                activeOpacity={0.7}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 订单入口 */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>我的订单</Text>
          <View style={styles.quickOrders}>
            {[
              { icon: Receipt, label: '全部订单', color: colors.primary },
              { icon: Wallet, label: '待支付', color: colors.warning },
              { icon: Star, label: '待评价', color: colors.gold },
              { icon: Ticket, label: '退款/售后', color: colors.success },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity key={index} style={styles.quickItem} activeOpacity={0.7}>
                  <View style={[styles.quickIcon, { backgroundColor: item.color + '12' }]}>
                    <Icon size={22} color={item.color} />
                  </View>
                  <Text style={styles.quickLabel}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 达人工作台入口 */}
        {userType === 2 && (
          <TouchableOpacity
            style={styles.techCard}
            onPress={() => navigation.navigate('TechDashboard')}
            activeOpacity={0.8}>
            <View style={styles.techCardLeft}>
              <View style={styles.techCardIcon}>
                <Briefcase size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.techCardTitle}>达人工作台</Text>
                <Text style={styles.techCardSub}>接单管理 · 收入统计 · 工作状态</Text>
              </View>
            </View>
            <CaretRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* 功能菜单 */}
        <View style={styles.menuGroup}>
          {[
            { icon: MapPin, label: '地址管理', route: 'AddressList' },
            { icon: Ticket, label: '优惠券', route: 'Coupons' },
            { icon: Heart, label: '我的收藏', route: 'Favorites' },
            { icon: Wallet, label: '我的钱包', route: 'Wallet' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => item.route && navigation.navigate(item.route)}
                activeOpacity={0.7}>
                <View style={styles.menuIcon}>
                  <Icon size={20} color={colors.textSecondary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <CaretRight size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.menuGroup}>
          {[
            { icon: Crown, label: '会员中心', route: 'MemberCenter' },
            { icon: Bell, label: '消息通知', route: 'Notifications' },
            { icon: Headphones, label: '联系客服', route: 'CustomerService' },
            { icon: Gear, label: '设置', route: 'Settings' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => item.route && navigation.navigate(item.route)}
                activeOpacity={0.7}>
                <View style={styles.menuIcon}>
                  <Icon size={20} color={colors.textSecondary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <CaretRight size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 退出 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <SignOut size={18} color={colors.error} />
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Not Login
  notLogin: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, paddingBottom: 80,
  },
  notLoginAvatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  notLoginTitle: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary,
  },
  notLoginSub: {
    fontSize: fontSize.base, color: colors.textSecondary,
    marginTop: spacing.sm, marginBottom: spacing.xl,
  },
  notLoginBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md, borderRadius: radius.lg,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 5,
  },
  notLoginBtnText: {
    color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold,
  },
  // User Card
  userCard: {
    backgroundColor: colors.primary, overflow: 'hidden',
    padding: spacing.lg, borderBottomLeftRadius: radius.xxl, borderBottomRightRadius: radius.xxl,
  },
  userBg1: {
    position: 'absolute', top: -60, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: colors.primaryLight + '30',
  },
  userBg2: {
    position: 'absolute', bottom: -30, left: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#ffffff10',
  },
  userInfoRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2.5, borderColor: '#ffffff40',
    marginRight: spacing.md,
  },
  userTextWrap: { flex: 1 },
  nickname: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#fff',
  },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.xs, gap: 3,
  },
  memberText: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
  },
  editBtn: {
    backgroundColor: '#ffffff25', paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2, borderRadius: radius.full,
  },
  editBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  // Points
  pointsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff15', borderRadius: radius.lg,
    padding: spacing.md, marginTop: spacing.lg,
  },
  pointsLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pointsNum: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#fff',
  },
  pointsLabel: { fontSize: fontSize.sm, color: '#ffffffcc' },
  pointsDivider: {
    width: 1, height: 20, backgroundColor: '#ffffff20', marginHorizontal: spacing.md,
  },
  pointsRight: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pointsHint: { fontSize: fontSize.sm, color: '#ffffffcc' },
  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: '#ffffff12',
    borderRadius: radius.lg, marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: fontSize.xxl, color: '#fff', fontWeight: fontWeight.bold,
  },
  statLabel: {
    fontSize: fontSize.sm, color: '#ffffffb0', marginTop: 2,
  },
  // Menu
  menuGroup: {
    backgroundColor: colors.card, marginTop: spacing.md,
    marginHorizontal: spacing.md, borderRadius: radius.lg,
    ...shadow.sm, borderWidth: 1, borderColor: colors.border + '50',
    overflow: 'hidden',
  },
  menuGroupTitle: {
    fontSize: fontSize.base, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, paddingHorizontal: spacing.md,
    paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  quickOrders: {
    flexDirection: 'row', paddingHorizontal: spacing.sm, paddingBottom: spacing.md,
  },
  quickItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  quickIcon: {
    width: 48, height: 48, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  quickLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
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
  // Tech Card
  techCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card,
    marginHorizontal: spacing.md, marginTop: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.lg,
    borderRadius: radius.lg, ...shadow.md,
    borderWidth: 1, borderColor: colors.primary + '20',
  },
  techCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  techCardIcon: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  techCardTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary,
  },
  techCardSub: {
    fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 2,
  },
  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, marginHorizontal: spacing.md,
    marginTop: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.lg, ...shadow.sm,
    borderWidth: 1, borderColor: colors.error + '15',
  },
  logoutText: {
    fontSize: fontSize.base, color: colors.error, fontWeight: fontWeight.medium,
    marginLeft: spacing.sm,
  },
});

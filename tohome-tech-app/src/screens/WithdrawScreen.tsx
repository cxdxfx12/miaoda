// 提现页面 — 精美金融风格
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Wallet, Bank, CreditCard, ShieldCheck, CheckCircle, WarningCircle } from 'phosphor-react-native';
import Animated, { FadeInDown, FadeInUp, SlideInRight, Easing, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { techApi } from '../api/client';
import { useTechStore } from '../store/techStore';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';
import { formatPrice } from '../utils';

export default function WithdrawScreen({ navigation }: any) {
  const talentInfo = useTechStore(s => s.talentInfo);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);

  const canWithdraw = parseFloat(amount) > 0 && bankName && bankAccount && accountName
    && parseFloat(amount) <= (talentInfo?.balance || 0);

  async function handleWithdraw() {
    if (!canWithdraw) return;
    setLoading(true);
    try {
      await techApi.requestWithdraw({
        amount: parseFloat(amount), bank_name: bankName,
        bank_account: bankAccount, account_name: accountName,
      });
      Alert.alert('提现申请已提交', '预计1-3个工作日到账', [{ text: '确定', onPress: () => navigation.goBack() }]);
    } catch (e: any) { Alert.alert('提现失败', e?.message || '请稍后重试'); }
    finally { setLoading(false); }
  }

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  // 计算进度条
  const progress = Math.min(1, parseFloat(amount || '0') / (talentInfo?.balance || 1));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.hBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.hTitle}>申请提现</Text>
        <View style={styles.hBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* ====== 可用余额卡片 ====== */}
          <Animated.View entering={FadeInDown.duration(350)}>
            <View style={styles.balanceCard}>
              <View style={styles.bTop}>
                <Wallet size={22} color={colors.primary} weight="fill" />
                <Text style={styles.bLabel}>可提现余额</Text>
              </View>
              <Text style={styles.bNum}>{formatPrice(talentInfo?.balance || 0)}</Text>

              {/* 进度指示 */}
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` },
                  ]}
                />
              </View>
            </View>
          </Animated.View>

          {/* ====== 提现金额输入 ====== */}
          <Animated.View entering={SlideInRight.delay(120).springify()}>
            <View style={[styles.card, styles.amountCard]}>
              <Text style={styles.sectionLbl}>提现金额</Text>
              <View style={styles.inputRow}>
                <Text style={styles.currency}>¥</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* 快捷金额 */}
              <View style={styles.quickRow}>
                {quickAmounts.map(a => {
                  const active = String(a) === amount;
                  return (
                    <TouchableOpacity key={a}
                      style={[styles.quickChip, active && styles.quickChipActive]}
                      onPress={() => setAmount(String(a))}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickTxt, active && styles.quickTxtActive]}>
                        ¥{a}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.quickChip, String(talentInfo?.balance || 0) === amount && styles.quickChipActive]}
                  onPress={() => setAmount(String(talentInfo?.balance || 0))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickTxt, String(talentInfo?.balance || 0) === amount && styles.quickTxtActive]}>全部</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ====== 银行信息 ====== */}
          <Animated.View entering={FadeInUp.delay(220).duration(300)}>
            <View style={[styles.card, styles.bankCard]}>
              <View style={styles.bankHeader}>
                <Bank size={18} color={colors.primary} weight="fill" />
                <Text style={styles.sectionLbl}>收款银行信息</Text>
              </View>

              {[
                { v: bankName, s: setBankName, p: '银行名称（如：中国工商银行）' },
                { v: accountName, s: setAccountName, p: '持卡人姓名' },
                { v: bankAccount, s: setBankAccount, p: '银行卡号', k: 'number-pad' },
              ].map((f, i) => (
                <TextInput key={i}
                  style={styles.fieldInput}
                  value={f.v}
                  onChangeText={f.s}
                  keyboardType={(f.k as any)}
                  placeholder={f.p}
                  placeholderTextColor={colors.textTertiary}
                />
              ))}
            </View>
          </Animated.View>

          {/* 安全提示 */}
          <Animated.View entering={FadeInUp.delay(300).duration(250)}>
            <View style={styles.tipRow}>
              <ShieldCheck size={15} color="#059669" weight="fill" />
              <Text style={styles.tipTxt}>资金由平台担保，安全到账 · 预计1-3工作日</Text>
            </View>
          </Animated.View>

          {/* 提交按钮 */}
          <Animated.View entering={FadeInUp.delay(380).springify()}>
            <TouchableOpacity
              style={[styles.submitBtn, canWithdraw ? styles.submitBtnActive : styles.submitBtnDis]}
              onPress={handleWithdraw}
              disabled={!canWithdraw || loading}
              activeOpacity={0.8}
            >
              <CreditCard size={18} color="#fff" weight="bold" />
              <Text style={styles.submitTxt}>
                {loading ? '提交中...' : amount ? `确认提现 ¥${formatPrice(parseFloat(amount) || 0)}` : '确认提现'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  hBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  scroll: { padding: spacing.md },

  // 余额卡
  balanceCard: {
    backgroundColor: colors.primaryBg, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.primary + '20',
  },
  bTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  bLabel: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  bNum: { fontSize: 34, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: colors.primary },

  // 卡片通用
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    ...shadow.sm, marginBottom: spacing.md,
  },

  // 金额卡片
  amountCard: { padding: spacing.lg },
  sectionLbl: { fontSize: fontSize.base, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  currency: { fontSize: 32, fontWeight: fontWeight.bold, color: colors.textPrimary, marginRight: spacing.xs, marginTop: -4 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: fontWeight.bold, color: colors.textPrimary, padding: 0 },

  quickRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  quickChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: radius.full, backgroundColor: colors.backgroundAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  quickChipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  quickTxt: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  quickTxtActive: { color: colors.primary },

  // 银行信息
  bankCard: { padding: spacing.lg },
  bankHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  fieldInput: {
    height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, fontSize: fontSize.base, color: colors.textPrimary,
    marginBottom: spacing.sm, backgroundColor: colors.background,
  },

  // 提示
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs, marginBottom: spacing.md },
  tipTxt: { flex: 1, fontSize: fontSize.sm, color: colors.textTertiary, lineHeight: 18 },

  // 按钮
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md + 2, gap: spacing.sm,
    borderRadius: radius.lg,
  },
  submitBtnActive: { backgroundColor: colors.primary, ...shadow.md },
  submitBtnDis: { backgroundColor: colors.divider },
  submitTxt: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#fff' },
});

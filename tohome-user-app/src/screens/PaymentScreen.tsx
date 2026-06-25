// 收银台 - 支付确认页面
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CaretLeft,
  CheckCircle,
  Clock,
  Money,
  CurrencyCircleDollar,
  CreditCard,
  Wallet,
} from '../components/Icon';
import { useNavigation, useRoute } from '@react-navigation/native';
import { orderApi } from '../api/order';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import { Button } from '../components/Button';
import { formatPrice, formatDate } from '../utils';

const PAY_METHODS = [
  {
    type: 1,
    channel: 'wechat',
    label: '微信支付',
    icon: <CreditCard size={28} color="#07C160" />,
    desc: '推荐使用微信支付',
  },
  {
    type: 2,
    channel: 'alipay',
    label: '支付宝',
    icon: <CurrencyCircleDollar size={28} color="#1677FF" />,
    desc: '安全快捷',
  },
  {
    type: 3,
    channel: 'balance',
    label: '余额支付',
    icon: <Wallet size={28} color={colors.secondary} />,
    desc: '当前余额 ¥0.00',
  },
];

export default function PaymentScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const order = route.params?.order;

  const [selectedPayChannel, setSelectedPayChannel] = useState(PAY_METHODS[0]);

  const payMutation = useMutation({
    mutationFn: async () => {
      return orderApi.payOrder(
        order.id,
        selectedPayChannel.type,
        selectedPayChannel.channel,
      );
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      const payData = data?.data;
      if (payData?.pay_params) {
        // 在真实环境中这里跳转微信/支付宝SDK
        Alert.alert(
          '支付模拟',
          `将跳转到${selectedPayChannel.label}支付 ¥${order?.final_amount || order?.service_spec?.price || '0.00'}`,
          [
            { text: '取消' },
            {
              text: '确认支付',
              onPress: () => {
                Alert.alert('支付结果', '支付成功！（模拟）', [
                  { text: '查看订单', onPress: () => nav.navigate('Main', { screen: 'Order' }) },
                ]);
              },
            },
          ],
        );
      }
    },
    onError: () => {
      Alert.alert('支付失败', '请稍后重试或选择其他支付方式');
    },
  });

  const handlePay = () => {
    if (payMutation.isPending) return;
    payMutation.mutate();
  };

  const amount = order?.final_amount || order?.service_spec?.price || 0;
  const duration = order?.service_spec?.duration || order?.service_duration || 60;
  const serviceName = order?.service_name || order?.service_spec?.name || '按摩服务';
  const talentName = order?.talent_name || '待分配达人';
  const appointmentTime = order?.appointment_time || new Date().toISOString();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <CaretLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>确认支付</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 订单信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>订单信息</Text>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>服务项目</Text>
            <Text style={styles.orderValue}>{serviceName}</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>服务时长</Text>
            <Text style={styles.orderValue}>{duration}分钟</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>服务达人</Text>
            <Text style={styles.orderValue}>{talentName}</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>预约时间</Text>
            <Text style={styles.orderValue}>{formatDate(appointmentTime)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>订单编号</Text>
            <Text style={[styles.orderValue, { fontSize: fontSize.sm }]}>{order?.order_no || '-'}</Text>
          </View>
        </View>

        {/* 金额明细 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>金额明细</Text>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>服务费用</Text>
            <Text style={styles.orderValue}>{formatPrice(order?.original_amount || amount)}</Text>
          </View>
          {order?.discount_amount > 0 && (
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>优惠减免</Text>
              <Text style={[styles.orderValue, { color: colors.success }]}>
                -{formatPrice(order.discount_amount)}
              </Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.orderRow}>
            <Text style={styles.totalLabel}>应付金额</Text>
            <Text style={styles.totalValue}>{formatPrice(amount)}</Text>
          </View>
        </View>

        {/* 倒计时提醒 */}
        <View style={styles.timerCard}>
          <Clock size={18} color={colors.warning} />
          <Text style={styles.timerText}>订单将在 15分钟 后自动取消，请尽快完成支付</Text>
        </View>

        {/* 支付方式 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>选择支付方式</Text>
          {PAY_METHODS.map(method => {
            const isSelected = selectedPayChannel.type === method.type;
            return (
              <TouchableOpacity
                key={method.type}
                style={[styles.payMethodItem, isSelected && styles.payMethodItemActive]}
                onPress={() => setSelectedPayChannel(method)}
                activeOpacity={0.7}>
                <View style={styles.payMethodLeft}>
                  {method.icon}
                  <View style={{ marginLeft: spacing.md }}>
                    <Text style={styles.payMethodLabel}>{method.label}</Text>
                    <Text style={styles.payMethodDesc}>{method.desc}</Text>
                  </View>
                </View>
                <View style={[styles.radio, isSelected && styles.radioActive]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 底部固定栏 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomAmount}>
          <Text style={styles.bottomAmountLabel}>应付</Text>
          <Text style={styles.bottomAmountValue}>{formatPrice(amount)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Button
            title={payMutation.isPending ? '支付中...' : `立即支付 ${formatPrice(amount)}`}
            onPress={handlePay}
            loading={payMutation.isPending}
            fullWidth
            size="large"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: { padding: spacing.xs },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    color: colors.textPrimary,
  },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 100 },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  orderLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  orderValue: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as any,
    color: colors.error,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  timerText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  payMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.sm,
  },
  payMethodItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  payMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payMethodLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  payMethodDesc: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    ...shadow.lg,
  },
  bottomAmount: {
    alignItems: 'flex-start',
  },
  bottomAmountLabel: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  bottomAmountValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold as any,
    color: colors.error,
  },
});

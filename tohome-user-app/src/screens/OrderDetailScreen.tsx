// 订单详情屏幕
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import {
  ChevronLeft,
  Phone,
  ChatCircle,
  MapPin,
  Clock,
  CheckCircle,
  Circle,
  User,
  CreditCard,
} from '../components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { orderApi, Order, ORDER_STATUS_TEXT } from '../api/order';
import { Button } from '../components/Button';
import { Tag } from '../components/Tag';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';
import { formatPrice, formatDate, maskPhone } from '../utils';

export const OrderDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { id } = route.params;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.getOrderDetail(id),
    refetchInterval: 30000, // 30秒自动刷新
  });

  if (isLoading || !data?.data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const order: Order = data.data;

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handlePay = () => {
    navigation.navigate('Payment', {
      orderId: order.id,
      amount: order.final_amount,
    });
  };

  const handleCancel = () => {
    Alert.alert('提示', '确定取消订单？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          await orderApi.cancelOrder(order.id, '用户取消');
          refetch();
        },
      },
    ]);
  };

  const handleReview = () => {
    navigation.navigate('ReviewOrder', { orderId: order.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>订单详情</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 状态卡片 */}
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>{ORDER_STATUS_TEXT[order.status]}</Text>
          <Text style={styles.statusHint}>{getStatusHint(order.status)}</Text>
        </View>

        {/* 达人信息 */}
        {order.talent_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>服务达人</Text>
            <View style={styles.techRow}>
              <View style={styles.techAvatar}>
                <User size={32} color={colors.primary} weight="duotone" />
              </View>
              <View style={styles.techInfo}>
                <Text style={styles.techName}>{order.talent_name}</Text>
                <Text style={styles.techPhone}>
                  {maskPhone(order.talent_phone || '')}
                </Text>
              </View>
              {order.status >= 2 && order.status <= 3 && (
                <View style={styles.contactActions}>
                  {order.talent_phone && (
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => handleCall(order.talent_phone!)}>
                      <Phone size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.contactBtn}>
                    <ChatCircle size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 服务信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>服务信息</Text>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{order.service_name}</Text>
            <Text style={styles.serviceSpec}>{order.service_spec} · {order.service_duration}分钟</Text>
          </View>
        </View>

        {/* 预约信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>预约信息</Text>
          <View style={styles.infoRow}>
            <Clock size={18} color={colors.textTertiary} />
            <Text style={styles.infoLabel}>预约时间</Text>
            <Text style={styles.infoValue}>
              {formatDate(order.appointment_time, 'YYYY-MM-DD HH:mm')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={18} color={colors.textTertiary} />
            <Text style={styles.infoLabel}>服务地址</Text>
            <Text style={styles.infoValue}>
              {order.service_address?.province} {order.service_address?.city} {order.service_address?.district}
            </Text>
          </View>
          <Text style={styles.addressDetail}>
            {order.service_address?.detail}
          </Text>
          <View style={styles.infoRow}>
            <User size={18} color={colors.textTertiary} />
            <Text style={styles.infoLabel}>联系人</Text>
            <Text style={styles.infoValue}>
              {order.user_name} {maskPhone(order.user_phone)}
            </Text>
          </View>
          {order.remark && (
            <View style={styles.remarkRow}>
              <Text style={styles.remarkLabel}>备注：</Text>
              <Text style={styles.remarkValue}>{order.remark}</Text>
            </View>
          )}
        </View>

        {/* 费用明细 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>费用明细</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>服务费用</Text>
            <Text style={styles.feeValue}>{formatPrice(order.original_amount)}</Text>
          </View>
          {order.discount_amount > 0 && (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>优惠金额</Text>
              <Text style={[styles.feeValue, styles.discountValue]}>
                -{formatPrice(order.discount_amount)}
              </Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.feeRow}>
            <Text style={styles.totalLabel}>实付金额</Text>
            <Text style={styles.totalValue}>{formatPrice(order.final_amount)}</Text>
          </View>
        </View>

        {/* 订单信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>订单信息</Text>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>订单号</Text>
            <Text style={styles.orderInfoValue}>{order.order_no}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>下单时间</Text>
            <Text style={styles.orderInfoValue}>
              {formatDate(order.created_at, 'YYYY-MM-DD HH:mm:ss')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={styles.footer}>
        {order.status === 0 && (
          <>
            <Button title="取消订单" type="text" onPress={handleCancel} />
            <Button title="立即支付" type="primary" onPress={handlePay} />
          </>
        )}
        {order.status === 4 && (
          <Button title="立即评价" type="primary" onPress={handleReview} fullWidth />
        )}
        {(order.status === 2 || order.status === 3) && (
          <Button
            title="查看达人位置"
            type="primary"
            onPress={() => navigation.navigate('OrderTrack', { orderId: order.id })}
            fullWidth
          />
        )}
      </View>
    </SafeAreaView>
  );
};

function getStatusHint(status: number): string {
  const hints: Record<number, string> = {
    0: '请在30分钟内完成支付',
    1: '正在为您匹配达人，请稍候...',
    2: '达人已接单，正在前往您的地址',
    3: '服务进行中，请耐心等待',
    4: '服务已完成，期待您的评价',
    5: '订单已取消',
    6: '订单已退款',
  };
  return hints[status] || '';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 48,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  statusCard: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
  statusText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  statusHint: {
    fontSize: fontSize.base,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: spacing.xs,
  },
  section: {
    backgroundColor: colors.card,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  techAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  techInfo: {
    flex: 1,
  },
  techName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  techPhone: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
  },
  contactBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  serviceInfo: {
    flexDirection: 'column',
  },
  serviceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  serviceSpec: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    width: 70,
  },
  infoValue: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    flex: 1,
  },
  addressDetail: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    marginLeft: 26,
    marginBottom: spacing.sm,
  },
  remarkRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  remarkLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  remarkValue: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    flex: 1,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  feeLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  feeValue: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  discountValue: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  orderInfoLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  orderInfoValue: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});

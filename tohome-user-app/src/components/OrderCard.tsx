// 订单卡片
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Phone, ChatCircle, MapPin, Clock, Star, NavigationArrow, FlowerLotus } from './Icon';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import { Order, ORDER_STATUS_TEXT } from '../api/order';
import { formatPrice } from '../utils';
import { Button } from './Button';
import { Tag } from './Tag';

interface OrderCardProps {
  order: Order;
  onPress?: () => void;
  onCancel?: () => void;
  onPay?: () => void;
  onReview?: () => void;
  onContact?: () => void;
  onTrack?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  onCancel,
  onPay,
  onReview,
  onContact,
  onTrack,
}) => {
  const statusInfo = getStatusInfo(order.status);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.container}>
      {/* 状态栏 */}
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {ORDER_STATUS_TEXT[order.status]}
          </Text>
        </View>
        <Text style={styles.orderNo}>订单号: {order.order_no}</Text>
      </View>

      {/* 服务信息 */}
      <View style={styles.serviceRow}>
        <View style={styles.serviceIcon}>
          <FlowerLotus size={22} color={colors.primary} />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{order.service_name}</Text>
          <Text style={styles.serviceSpec}>{order.service_spec}</Text>
          <View style={styles.timeRow}>
            <Clock size={12} color={colors.textTertiary} />
            <Text style={styles.timeText}>
              {formatAppointmentTime(order.appointment_time)}
            </Text>
          </View>
          {order.service_address && (
            <View style={styles.addressRow}>
              <MapPin size={12} color={colors.textTertiary} />
              <Text style={styles.addressText} numberOfLines={1}>
                {order.service_address.detail}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 达人信息 */}
      {order.talent_name && (
        <View style={styles.techRow}>
          <View style={styles.techInfo}>
            <Text style={styles.techLabel}>服务达人</Text>
            <Text style={styles.techName}>{order.talent_name}</Text>
          </View>
          {order.status >= 2 && order.status <= 3 && (
            <View style={styles.techActions}>
              {onContact && (
                <TouchableOpacity onPress={onContact} style={styles.actionBtn}>
                  <ChatCircle size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
              {onTrack && (
                <TouchableOpacity onPress={onTrack} style={styles.actionBtn}>
                  <NavigationArrow size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
              {order.talent_phone && (
                <TouchableOpacity style={styles.actionBtn}>
                  <Phone size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* 金额 */}
      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>订单金额</Text>
        <Text style={styles.amountValue}>{formatPrice(order.final_amount)}</Text>
      </View>

      {/* 操作按钮 */}
      <View style={styles.actions}>
        {order.status === 0 && onPay && (
          <Button title="立即支付" type="primary" size="small" onPress={onPay} />
        )}
        {order.status === 0 && onCancel && (
          <Button title="取消订单" type="text" size="small" onPress={onCancel} />
        )}
        {order.status === 4 && onReview && (
          <Button title="立即评价" type="primary" size="small" onPress={onReview} />
        )}
        {(order.status === 2 || order.status === 3) && onTrack && (
          <Button title="查看轨迹" type="secondary" size="small" onPress={onTrack} />
        )}
      </View>
    </TouchableOpacity>
  );
};

function getStatusInfo(status: number) {
  const map: Record<number, { color: string }> = {
    0: { color: colors.error },
    1: { color: colors.warning },
    2: { color: colors.info },
    3: { color: colors.primary },
    4: { color: colors.success },
    5: { color: colors.textTertiary },
    6: { color: colors.textTertiary },
  };
  return map[status] || { color: colors.textTertiary };
}

function formatAppointmentTime(time: string): string {
  const d = new Date(time);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  orderNo: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  serviceRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  serviceIconText: {
    fontSize: 28,
  },
  serviceInfo: {
    flex: 1,
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginLeft: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginLeft: 4,
    flex: 1,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  techInfo: {
    flex: 1,
  },
  techLabel: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  techName: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  techActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  amountLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  amountValue: {
    fontSize: fontSize.xl,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

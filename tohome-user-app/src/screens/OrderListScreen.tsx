// 订单列表屏幕
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt, X } from '../components/Icon';
import { orderApi, Order, ORDER_STATUS_TEXT } from '../api/order';
import { OrderCard } from '../components/OrderCard';
import { colors, spacing, fontSize, fontWeight } from '../theme';

const STATUS_TABS = [
  { value: -1, label: '全部' },
  { value: 0, label: '待支付' },
  { value: 1, label: '待接单' },
  { value: 3, label: '服务中' },
  { value: 4, label: '已完成' },
];

export const OrderListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState(-1);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', activeTab],
    queryFn: () =>
      orderApi.listOrders({
        status: activeTab === -1 ? undefined : [activeTab],
        page: 1,
        page_size: 50,
      }),
  });

  const orders: Order[] = data?.data?.list || [];

  const handleCancel = (order: Order) => {
    Alert.alert('提示', '确定要取消订单吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          try {
            await orderApi.cancelOrder(order.id, '用户取消');
            refetch();
          } catch (e: any) {
            Alert.alert('取消失败', e.message);
          }
        },
      },
    ]);
  };

  const handlePay = (order: Order) => {
    navigation.navigate('Payment', { orderId: order.id, amount: order.final_amount });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>我的订单</Text>
      </View>

      {/* 状态Tab */}
      <View style={styles.tabs}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tab, activeTab === tab.value && styles.tabActive]}
            onPress={() => setActiveTab(tab.value)}>
            <Text
              style={[
                styles.tabText,
                activeTab === tab.value && styles.tabTextActive,
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 订单列表 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>加载中...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Receipt size={64} color={colors.textTertiary} />
          <Text style={styles.emptyText}>暂无订单</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
              onCancel={() => handleCancel(item)}
              onPay={() => handlePay(item)}
              onReview={() => navigation.navigate('ReviewOrder', { orderId: item.id })}
              onTrack={() => navigation.navigate('OrderTrack', { orderId: item.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
});

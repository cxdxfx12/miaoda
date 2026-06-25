import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, CheckCircle, TrashSimple } from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { userApi } from '../api/user';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import Loading from '../components/Loading';
import EmptyView from '../components/EmptyView';
import Tag from '../components/Tag';

export default function AddressListScreen() {
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({ queryKey: ['addresses'], queryFn: () => userApi.listAddresses() });
  const addresses = (data as any)?.data?.list || [];

  const delMutation = useMutation({
    mutationFn: (id: number) => userApi.deleteAddress(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addresses'] }); },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => userApi.setDefaultAddress(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addresses'] }); },
  });

  const handleDelete = (id: number) => {
    Alert.alert('确认删除', '确定要删除这个地址吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => delMutation.mutate(id) },
    ]);
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => nav.navigate('AddressEdit', { id: item.id })} onLongPress={() => setDefaultMutation.mutate(item.id)}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Text style={styles.name}>{item.contact_name}</Text>
          <Text style={styles.phone}>{item.contact_phone}</Text>
          {item.is_default === 1 && <Tag color="success" size="small">默认</Tag>}
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)}><TrashSimple size={16} color={colors.error} /></TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
        <MapPin size={14} color={colors.textTertiary} />
        <Text style={styles.addressText}>
          {[item.province, item.city, item.district, item.detail].filter(Boolean).join(' ')}
        </Text>
      </View>
      {item.tag && <Tag color="primary" size="small" style={{ marginTop: 8, alignSelf: 'flex-start' }}>{item.tag}</Tag>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={isLoading ? <Loading /> : <EmptyView message="暂无地址" />}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      />
      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('AddressEdit')}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.semibold as any, color: colors.textPrimary },
  phone: { fontSize: fontSize.base, color: colors.textSecondary },
  addressText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.md,
  },
});

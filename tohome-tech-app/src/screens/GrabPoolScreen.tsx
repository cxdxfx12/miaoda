// 抢单池 — 精美升级版 UI
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated, Easing, Vibration, Platform, Dimensions, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lightning, MapPin, Clock, CurrencyCircle, User, Fire, ArrowsClockwise, SpeakerHigh, SpeakerX, Faders, CaretRight, CheckCircle, XCircle, HandGrabbing, Timer, Star, NavigationArrow, Warning } from 'phosphor-react-native';
import { useTechStore } from '../store/techStore';
import { apiClient } from '../api/client';
import { theme, colors, spacing, radius, fontSize, fontWeight } from '../theme';
import AnimatedRN, { FadeInDown, SlideInLeft, Easing as AEasing } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GrabOrder {
  order_id: number; order_no: string; service_name: string; duration: number;
  total_amount: number; talent_income: number;
  address: string; city: string; district: string; lat: number; lng: number;
  appointment_time: string; distance_km: number; urgency_level: number;
  customer_nickname: string; entered_at: number; expire_at: number;
  remaining_sec: number; pool_position: number;
}

interface GrabStats {
  pool_total: number; nearby_count: number; today_grab: number;
  today_success: number; success_rate: number; total_income: number;
  max_grab_count: number; remaining_grab: number;
}
type FilterType = 'latest' | 'nearest' | 'highest' | 'urgent';

const fmtCD = (sec: number): string => {
  if (sec <= 0) return '00:00';
  return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
};

const urgCfg: Record<number, { l: string; c: string; bg: string }> = {
  0: { l: '普通', c: '#94A3B8', bg: '#F1F5F9' }, 1: { l: '较急', c: '#F59E0B', bg: '#FEF3C7' },
  2: { l: '紧急', c: '#EF4444', bg: '#FEE2E2' },
};

// ---- 精美统计头 ----
const StatsBar: React.FC<{ stats: GrabStats | null }> = ({ stats }) => {
  if (!stats) return null;
  return (
    <View style={styles.sbar}>
      {[
        { n: stats.pool_total, t: '池中订单', bg: '#EEF2FF', c: colors.primary, i: Lightning },
        { n: stats.today_grab, t: '今日已抢', bg: '#FEF3C7', c: '#D97706', i: Fire },
        { n: stats.success_rate > 0 ? `${stats.success_rate}%` : '-', t: '成功率', bg: '#D1FAE5', c: '#059669', i: Star },
      ].map((x, i) => {
        const Ic = x.i;
        return (
          <View key={i} style={[styles.scard, { backgroundColor: x.bg }]}>
            <Ic size={14} color={x.c} weight="fill" />
            <Text style={[styles.sval, { color: x.c }]}>{x.n}</Text>
            <Text style={styles.slbl}>{x.t}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ---- 精美筛选栏 ----
const FilterBar: React.FC<{
  active: FilterType; soundEnabled: boolean;
  onFilterChange: (f: FilterType) => void; onSoundToggle: () => void;
}> = ({ active, soundEnabled, onFilterChange, onSoundToggle }) => {
  const filters: { key: FilterType; label: string; icon: typeof Clock }[] = [
    { key: 'latest', label: '最新', icon: Clock }, { key: 'nearest', label: '最近', icon: MapPin },
    { key: 'highest', label: '高价', icon: CurrencyCircle }, { key: 'urgent', label: '急单', icon: Fire },
  ];
  return (
    <View style={styles.fbar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fscroll}>
        {filters.map(f => {
          const Icon = f.icon;
          const isActive = active === f.key;
          return (
            <TouchableOpacity key={f.key}
              style={[styles.ftab, isActive && styles.ftabOn]}
              onPress={() => onFilterChange(f.key)} activeOpacity={0.7}
            >
              <Icon size={13} color={isActive ? '#fff' : colors.textSecondary} weight={isActive ? 'fill' : 'regular'} />
              <Text style={[styles.ftxt, isActive && styles.ftxtOn]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity onPress={onSoundToggle} style={styles.sndBtn} activeOpacity={0.7}>
        {soundEnabled
          ? <SpeakerHigh size={19} color={colors.primary} weight="fill" />
          : <SpeakerX size={19} color={colors.textTertiary} />}
      </TouchableOpacity>
    </View>
  );
};

// ---- 精美订单卡片 ----
const OrderCard: React.FC<{ item: GrabOrder; index: number; onGrab: (id: number) => void }> = ({ item, index, onGrab }) => {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opAnim = useRef(new Animated.Value(0)).current;
  const [cd, setCD] = useState(item.remaining_sec);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 70, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }),
      Animated.timing(opAnim, { toValue: 1, duration: 400, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (cd <= 0) return;
    const timer = setInterval(() => setCD(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const uc = urgCfg[item.urgency_level] || urgCfg[0];
  const isHot = cd < 60;

  return (
    <Animated.View style={[styles.ocard, { transform: [{ translateY: slideAnim }], opacity: opAnim }]}>
      {/* 顶部标签行 */}
      <View style={styles.ochdr}>
        <View style={styles.otags}>
          <View style={[styles.utag, { backgroundColor: uc.bg }]}>
            <Fire size={10} color={uc.c} weight="fill" />
            <Text style={[styles.utxt, { color: uc.c }]}>{uc.l}</Text>
          </View>
          {item.distance_km > 0 && (
            <View style={styles.itag}><MapPin size={10} color={colors.textSecondary} /><Text style={styles.itxt}>{item.distance_km}km</Text></View>
          )}
          <View style={styles.itag}><Timer size={10} color={colors.textSecondary} /><Text style={styles.itxt}>{item.duration}min</Text></View>
        </View>
        <View style={[styles.cdbadge, { borderColor: isHot ? '#EF4444' : colors.primary, ...(isHot ? { backgroundColor: '#FEF2F2' } : {}) }]}>
          {isHot && <Warning size={11} color="#EF4444" weight="bold" style={{ marginRight: 3 }} />}
          <Text style={[styles.cdtext, { color: isHot ? '#EF4444' : colors.primary }]}>{fmtCD(cd)}</Text>
        </View>
      </View>

      {/* 主体内容 */}
      <View style={styles.obody}>
        <View style={styles.omain}>
          <Text style={styles.sname} numberOfLines={1}>{item.service_name}</Text>
          <View style={styles.arow}><MapPin size={13} color={colors.textTertiary} /><Text style={styles.atxt} numberOfLines={1}>{item.city} {item.district} {item.address}</Text></View>
          <View style={styles.botinfo}>
            <View style={styles.urow}><User size={12} color={colors.textTertiary} /><Text style={styles.utxt2}>{item.customer_nickname}</Text></View>
            <Text style={styles.ttxt}>{new Date(item.appointment_time).toLocaleDateString()} {new Date(item.appointment_time).toTimeString().substring(0,5)}</Text>
          </View>
        </View>

        {/* 右侧金额+按钮 */}
        <View style={styles.oright}>
          <View style={styles.ablock}>
            <Text style={styles.amain}>¥{item.total_amount}</Text>
            <Text style={styles.asub}>到手 ¥{item.talent_income}</Text>
          </View>
          <TouchableOpacity style={styles.gbtn} onPress={() => onGrab(item.order_id)} activeOpacity={0.75}>
            <HandGrabbing size={16} color="#fff" weight="fill" />
            <Text style={styles.gbtnt}>抢单</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 进度条 */}
      <View style={styles.pbar}>
        <Animated.View style={[styles.pfill, {
          width: `${Math.min(100, (cd / 1800) * 100)}%`,
          backgroundColor: cd < 60 ? '#EF4444' : cd < 300 ? '#F59E0B' : colors.primary,
        }]} />
      </View>
    </Animated.View>
  );
};

// ---- 抢单结果弹窗 ----
const GrabResultModal: React.FC<{
  visible: boolean; success: boolean; message: string; orderNo?: string; onClose: () => void;
}> = ({ visible, success, message, orderNo, onClose }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (visible) Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
    else { fade.setValue(0); scale.setValue(0.6); }
  }, [visible]);

  if (!visible) return null;
  return (
    <View style={styles.modalOv}>
      <Animated.View style={[styles.mocard, { opacity: fade, transform: [{ scale }] }]}>
        <View style={[styles.moicon, { backgroundColor: success ? '#D1FAE5' : '#FEE2E2' }]}>
          {success
            ? <CheckCircle size={48} color="#059669" weight="fill" />
            : <XCircle size={48} color="#EF4444" weight="fill" />}
        </View>
        <Text style={[styles.motitle, { color: success ? '#059669' : '#EF4444' }]}>
          {success ? '抢单成功！' : '抢单失败'}
        </Text>
        {success && orderNo && <Text style={styles.moorder}>#{orderNo}</Text>}
        <Text style={styles.momsg}>{message}</Text>
        <TouchableOpacity style={[styles.mobtn, { backgroundColor: success ? '#059669' : colors.primary }]} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.mobtntxt}>{success ? '查看订单' : '知道了'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ---- 空状态 ----
const EmptyPool: React.FC = () => (
  <View style={styles.emptyWrap}>
    <View style={styles.eiconW}>
      <Lightning size={44} color={colors.textTertiary} />
    </View>
    <Text style={styles.etitle}>暂无待抢订单</Text>
    <Text style={styles.edesc}>当前池为空{'\n'}打开声音提醒，新订单不错过</Text>
  </View>
);

// ==================== 主页面 ====================
export const GrabPoolScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [orders, setOrders] = useState<GrabOrder[]>([]);
  const [stats, setStats] = useState<GrabStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('latest');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [grabbingId, setGrabbingId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalResult, setModalResult] = useState({ success: false, message: '', orderNo: '' });

  const talentInfo = useTechStore(s => s.talentInfo);
  const flatListRef = useRef<FlatList>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (reset = false) => {
    try {
      const p = reset ? 1 : page;
      if (reset) setLoading(true);
      const res: any = await apiClient.get('/talent/grab-pool/list', {
        params: { filter, page: p, page_size: 20, lat: talentInfo?.current_lat || 0, lng: talentInfo?.current_lng || 0 },
      });
      if (res?.data) {
        const newOrders = res.data.list || [];
        reset ? setOrders(newOrders) : setOrders(prev => [...prev, ...newOrders]);
        setHasMore(newOrders.length >= 20);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) { console.warn('grab pool err:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter, page, talentInfo]);

  useEffect(() => { fetchData(true); }, [filter]);

  useEffect(() => {
    if (!soundEnabled) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res: any = await apiClient.get('/talent/grab-pool/stats');
        if (res?.data?.pool_total && stats && res.data.pool_total > stats.pool_total) {
          Vibration.vibrate([0, 200, 100, 200]);
          fetchData(true);
        }
      } catch { /* silent */ }
    }, 8000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [stats?.pool_total, soundEnabled]);

  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener('change', next => {
      if (/inactive|background/.test(prev) && next === 'active') fetchData(true);
      prev = next;
    });
    return () => sub.remove();
  }, [fetchData]);

  const handleRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);
  const handleLoadMore = useCallback(() => { if (!hasMore || loading) return; setPage(p => p + 1); fetchData(); }, [hasMore, loading, fetchData]);

  const handleGrab = useCallback(async (orderId: number) => {
    if (grabbingId) return;
    setGrabbingId(orderId); Vibration.vibrate(50);
    try {
      const res: any = await apiClient.post(`/talent/grab-pool/${orderId}/grab`);
      if (res?.data?.success) {
        setModalResult({ success: true, message: res.data.message || '成功！', orderNo: res.data.order_no || '' });
        setOrders(prev => prev.filter(o => o.order_id !== orderId));
        if (stats) setStats(prev => prev ? { ...prev, pool_total: prev.pool_total - 1, today_grab: prev.today_grab + 1 } : prev!);
      } else setModalResult({ success: false, message: res?.data?.reason || res?.message || '失败，请重试', orderNo: '' });
    } catch (err: any) { setModalResult({ success: false, message: err?.response?.data?.message || err?.message || '网络错误', orderNo: '' }); }
    finally { setModalVisible(true); setGrabbingId(null); }
  }, [grabbingId, stats]);

  const renderItem = useCallback(({ item, index }: { item: GrabOrder; index: number }) =>
    <OrderCard item={item} index={index} onGrab={handleGrab} />, [handleGrab]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶栏 */}
      <View style={styles.topBar}>
        <View><Text style={styles.topT}>抢单池</Text>
        <Text style={styles.topS}>{stats ? `附近 ${stats.nearby_count} 单可抢` : '加载中...'}</Text></View>
        <TouchableOpacity style={styles.refrBtn} onPress={() => fetchData(true)} activeOpacity={0.7}>
          <ArrowsClockwise size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <StatsBar stats={stats} />
      <FilterBar active={filter} soundEnabled={soundEnabled} onFilterChange={setFilter} onSoundToggle={() => setSoundEnabled(!soundEnabled)} />

      <FlatList ref={flatListRef} data={orders} renderItem={renderItem}
        keyExtractor={(o: GrabOrder) => String(o.order_id)}
        contentContainerStyle={styles.listC}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        onEndReached={handleLoadMore} onEndReachedThreshold={0.3}
        ListEmptyComponent={loading ? null : <EmptyPool />} />

      <GrabResultModal visible={modalVisible} success={modalResult.success} message={modalResult.message}
        orderNo={modalResult.orderNo} onClose={() => { setModalVisible(false); if (modalResult.success) navigation.navigate('PendingOrders'); }} />
    </SafeAreaView>
  );
};

// ==================== 样式 ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  topT: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  topS: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  refrBtn: { width: 42, height: 42, borderRadius: radius.full, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },

  sbar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 10 },
  scard: { flex: 1, borderRadius: radius.md, padding: spacing.sm + 2, alignItems: 'center' },
  sval: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 2 },
  slbl: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },

  fbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 8 },
  fscroll: { flex: 1, gap: 4 },
  ftab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.md + 4, backgroundColor: '#F1F5F9' },
  ftabOn: { backgroundColor: colors.primary },
  ftxt: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textSecondary },
  ftxtOn: { color: '#fff' },
  sndBtn: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  listC: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: 12 },

  ocard: { backgroundColor: '#fff', borderRadius: radius.lg + 2, padding: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  ochdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  otags: { flexDirection: 'row', gap: 6, flex: 1 },
  utag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs },
  utxt: { fontSize: 10, fontWeight: fontWeight.semibold },
  itag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  itxt: { fontSize: 11, color: colors.textSecondary },
  cdbadge: { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' },
  cdtext: { fontSize: 13, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },

  obody: { flexDirection: 'row', marginBottom: spacing.sm },
  omain: { flex: 1, marginRight: spacing.md },
  sname: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: 4 },
  arow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  atxt: { fontSize: fontSize.xs, color: colors.textSecondary, flex: 1 },
  botinfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  urow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  utxt2: { fontSize: fontSize.xs, color: colors.textTertiary },
  ttxt: { fontSize: fontSize.xs, color: colors.textTertiary, fontWeight: '500' },

  oright: { alignItems: 'flex-end', justifyContent: 'space-between' },
  ablock: { alignItems: 'flex-end' },
  amain: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#EF4444' },
  asub: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  gbtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.md, marginTop: 6, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
  gbtnt: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#fff' },

  pbar: { height: 3, backgroundColor: '#F1F5F9', borderRadius: 1.5, overflow: 'hidden' },
  pfill: { height: '100%', borderRadius: 1.5 },

  modalOv: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  mocard: { width: SCREEN_WIDTH - 72, backgroundColor: '#fff', borderRadius: radius.xl + 2, padding: spacing.xl, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12 },
  moicon: { width: 72, height: 72, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  motitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: 4 },
  moorder: { fontSize: fontSize.xs, color: colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.xs, marginBottom: spacing.sm },
  momsg: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 21 },
  mobtn: { width: '100%', paddingVertical: 13, borderRadius: radius.md, alignItems: 'center' },
  mobtntxt: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: '#fff' },

  emptyWrap: { alignItems: 'center', paddingTop: spacing.xxl * 2, paddingHorizontal: spacing.xxl },
  eiconW: { width: 80, height: 80, borderRadius: 9999, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  etitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  edesc: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
});

export default GrabPoolScreen;

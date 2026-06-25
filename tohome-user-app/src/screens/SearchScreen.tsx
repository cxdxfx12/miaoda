// 搜索页面 - 搜索服务和达人
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CaretLeft,
  MagnifyingGlass,
  XCircle,
  Star,
  Clock,
  Fire,
  TrendUp,
} from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { serviceApi, Service, Talent } from '../api/service';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import { formatPrice } from '../utils';
import EmptyView from '../components/EmptyView';
import Loading from '../components/Loading';

// 热门搜索
const HOT_SEARCHES = ['肩颈按摩', '足疗', '精油SPA', '全身推拿', '刮痧拔罐', '艾灸'];

export default function SearchScreen() {
  const nav = useNavigation<any>();
  const [keyword, setKeyword] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'talents'>('services');
  const inputRef = React.useRef<TextInput>(null);

  // 搜索服务
  const {
    data: servicesData,
    isLoading: servicesLoading,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ['search-services', searchText],
    queryFn: () => serviceApi.listServices({ keyword: searchText, page_size: 50 }),
    enabled: !!searchText && activeTab === 'services',
  });

  // 搜索达人
  const {
    data: talentsData,
    isLoading: talentsLoading,
    refetch: refetchTalents,
  } = useQuery({
    queryKey: ['search-talents', searchText],
    queryFn: () => serviceApi.getNearbyTalents({
      lat: 39.9,
      lng: 116.4,
      service_id: 0,
      radius: 50000,
    }),
    enabled: !!searchText && activeTab === 'talents',
  });

  const services = (servicesData as any)?.data?.list || [];
  const talents: Talent[] = (talentsData as any)?.data || [];
  const isLoading = activeTab === 'services' ? servicesLoading : talentsLoading;

  // 自动聚焦
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(keyword);
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  const handleHotPress = (text: string) => {
    setKeyword(text);
    setSearchText(text);
  };

  const clearSearch = () => {
    setKeyword('');
    setSearchText('');
  };

  const handleServicePress = (service: Service) => {
    nav.navigate('ServiceDetail', { id: service.id });
  };

  const handleTalentPress = (talent: Talent) => {
    // 在真实环境中导航到达人详情
    nav.navigate('ServiceDetail', { talentId: talent.id });
  };

  // 筛选匹配名称的达人
  const filteredTalents = searchText
    ? talents.filter(t =>
      t.name.toLowerCase().includes(searchText.toLowerCase()) ||
      t.skills?.some(s => s.toLowerCase().includes(searchText.toLowerCase()))
    )
    : talents;

  const renderServiceItem = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => handleServicePress(item)}
      activeOpacity={0.7}>
      <View style={styles.resultImageWrap}>
        <Image
          source={{ uri: item.cover_image || 'https://via.placeholder.com/120x120/F0F3FF/6B7FD7?text=Spa' }}
          style={styles.resultImage}
        />
        {item.base_price < item.original_price && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {Math.round((1 - item.base_price / item.original_price) * 100)}%off
            </Text>
          </View>
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.resultDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.resultMeta}>
          <View style={styles.metaItem}>
            <Star size={12} color={colors.secondary} weight="fill" />
            <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={12} color={colors.textTertiary} />
            <Text style={styles.metaText}>{item.order_count}单</Text>
          </View>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{formatPrice(item.base_price)}</Text>
          {item.base_price < item.original_price && (
            <Text style={styles.originalPrice}>{formatPrice(item.original_price)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTalentItem = ({ item }: { item: Talent }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => handleTalentPress(item)}
      activeOpacity={0.7}>
      <Image
        source={{ uri: item.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}` }}
        style={styles.talentAvatar}
      />
      <View style={styles.resultInfo}>
        <View style={styles.talentHeader}>
          <Text style={styles.resultName}>{item.name}</Text>
          <View style={styles.metaItem}>
            <Star size={12} color={colors.secondary} weight="fill" />
            <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.skillRow}>
          {item.skills?.slice(0, 3).map(skill => (
            <View key={skill} style={styles.skillTag}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
        </View>
        <View style={styles.resultMeta}>
          <Text style={styles.metaText}>{item.service_count}单服务</Text>
          {item.distance !== undefined && (
            <Text style={styles.metaText}>{(item.distance / 1000).toFixed(1)}km</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const hasResults = activeTab === 'services'
    ? services.length > 0
    : filteredTalents.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <CaretLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchInputWrap}>
          <MagnifyingGlass size={18} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="搜索服务、达人..."
            placeholderTextColor={colors.textTertiary}
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(keyword)}
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <XCircle size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {!searchText ? (
        /* 搜索前 - 热门搜索 */
        <View style={styles.emptyState}>
          <View style={styles.hotSection}>
            <View style={styles.hotHeader}>
              <Fire size={18} color={colors.error} weight="fill" />
              <Text style={styles.hotTitle}>热门搜索</Text>
            </View>
            <View style={styles.hotGrid}>
              {HOT_SEARCHES.map((item, index) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.hotItem, index < 3 && styles.hotItemTop]}
                  onPress={() => handleHotPress(item)}>
                  <Text style={[styles.hotText, index < 3 && styles.hotTextTop]}>
                    {item}
                  </Text>
                  {index < 3 && <TrendUp size={12} color={colors.error} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : isLoading ? (
        <Loading />
      ) : !hasResults ? (
        <EmptyView
          message={`未找到与「${searchText}」相关的结果`}
          icon={<MagnifyingGlass size={48} color={colors.textDisabled} />}
        />
      ) : (
        /* 搜索结果 */
        <View style={{ flex: 1 }}>
          {/* Tab切换 */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'services' && styles.tabActive]}
              onPress={() => setActiveTab('services')}>
              <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>
                服务 ({services.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'talents' && styles.tabActive]}
              onPress={() => setActiveTab('talents')}>
              <Text style={[styles.tabText, activeTab === 'talents' && styles.tabTextActive]}>
                达人 ({filteredTalents.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* 结果列表 */}
          <FlatList
            data={activeTab === 'services' ? services : filteredTalents}
            keyExtractor={item => String(item.id)}
            renderItem={activeTab === 'services' ? renderServiceItem : renderTalentItem}
            contentContainerStyle={styles.resultList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundAlt,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    padding: 0,
  },
  emptyState: {
    flex: 1,
    padding: spacing.md,
  },
  hotSection: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.sm,
  },
  hotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  hotTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    color: colors.textPrimary,
  },
  hotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundAlt,
  },
  hotItemTop: {
    backgroundColor: '#FFF1F0',
  },
  hotText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  hotTextTop: {
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold as any,
  },
  resultList: {
    padding: spacing.md,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  resultImageWrap: {
    position: 'relative',
  },
  resultImage: {
    width: 100,
    height: 100,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundAlt,
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  discountText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: fontWeight.bold as any,
  },
  talentAvatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primaryBg,
  },
  resultInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  resultName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    color: colors.textPrimary,
  },
  resultDesc: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
    lineHeight: 18,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  talentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  skillTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
    backgroundColor: colors.primaryBg,
  },
  skillText: {
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  priceText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as any,
    color: colors.error,
  },
  originalPrice: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    textDecorationLine: 'line-through',
  },
});

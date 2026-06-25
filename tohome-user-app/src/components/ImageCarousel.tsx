// 图片轮播组件 — 支持自动播放、分页点、占位图
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Image, FlatList, TouchableOpacity,
  StyleSheet, Dimensions, ViewStyle, Text,
} from 'react-native';
import { colors, radius, spacing, fontSize } from '../theme';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CarouselImage {
  uri: string;
  label?: string;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  /** 宽度,默认屏幕宽-32 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 自动播放间隔(ms),0 不自动 */
  autoPlay?: number;
  /** 点击图片回调 */
  onPress?: (index: number) => void;
  /** 是否显示分页点 */
  showDots?: boolean;
  /** 圆角 */
  borderRadius?: number;
  /** 额外样式 */
  style?: ViewStyle;
  /** 占位图标 */
  placeholderIcon?: keyof typeof Ionicons.glyphMap;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images, width = SCREEN_WIDTH - spacing.md * 2, height = 200,
  autoPlay = 0, onPress, showDots = true, borderRadius: br = radius.lg, style,
  placeholderIcon = 'image',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval>>();

  // 自动播放
  useEffect(() => {
    if (autoPlay > 0 && images.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const next = (prev + 1) % images.length;
          flatListRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
      }, autoPlay);
      return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
    }
  }, [autoPlay, images.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = useCallback(({ item, index }: { item: CarouselImage; index: number }) => {
    const [error, setError] = useState(false);
    return (
      <TouchableOpacity
        activeOpacity={onPress ? 0.8 : 1}
        onPress={() => onPress?.(index)}
        style={[styles.item, { width, height, borderRadius: br }]}>
        {error ? (
          <View style={[styles.placeholder, { borderRadius: br }]}>
            <Ionicons name={placeholderIcon} size={40} color={colors.textDisabled} />
            {item.label && <Text style={styles.placeholderLabel}>{item.label}</Text>}
          </View>
        ) : (
          <Image
            source={{ uri: item.uri }}
            style={[styles.image, { borderRadius: br }]}
            onError={() => setError(true)}
            resizeMode="cover"
          />
        )}
        {item.label && (
          <View style={styles.labelBar}>
            <Text style={styles.labelText}>{item.label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [width, height, br]);

  if (images.length === 0) {
    return (
      <View style={[styles.empty, { width, height, borderRadius: br }, style]}>
        <Ionicons name={placeholderIcon} size={48} color={colors.textDisabled} />
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { width }, style]}>
      <FlatList
        ref={flatListRef}
        data={images}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        snapToInterval={width}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        keyExtractor={(_, i) => `carousel_${i}`}
      />
      {showDots && images.length > 1 && (
        <View style={styles.dots}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ——— 样式 ———
const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
  item: { overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  placeholderLabel: { marginTop: spacing.sm, fontSize: fontSize.sm, color: colors.textTertiary },
  empty: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  labelBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  labelText: { color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '500' },
  dots: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: spacing.sm, gap: 6,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.textDisabled,
  },
  dotActive: {
    width: 18, borderRadius: 3,
    backgroundColor: colors.primary,
  },
});

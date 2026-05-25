import React, { useEffect, useMemo, useRef, memo } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { borderRadius, fontFamily, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import DishImage from './DishImage';
import GlassCard from './ui/GlassCard';

const GAP = 12;
const FEATURED_SIZE = 5;

function hashString(value) {
  let h = 0;
  const s = String(value || '');
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function daySeed() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const PagingDot = memo(function PagingDot({ index, scrollX, snap, activeColor }) {
  const style = useMemo(() => {
    const inputRange = [(index - 1) * snap, index * snap, (index + 1) * snap];
    return {
      width: scrollX.interpolate({
        inputRange,
        outputRange: [6, 22, 6],
        extrapolate: 'clamp',
      }),
      opacity: scrollX.interpolate({
        inputRange,
        outputRange: [0.35, 1, 0.35],
        extrapolate: 'clamp',
      }),
      backgroundColor: activeColor,
    };
  }, [index, snap, scrollX, activeColor]);
  return <Animated.View style={[styles.dot, style]} />;
});

export default function FeaturedDishesCarousel({ dishes = [], colors, onOpenDish, shadows }) {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  /** Компактная квадратная карточка: фото целиком (contain) + подпись внизу внутри квадрата. */
  const cardSize = Math.min(188, Math.max(156, width * 0.44));
  const snap = cardSize + GAP;
  const sidePad = spacing.lg;

  const featured = useMemo(() => {
    const list = Array.isArray(dishes) ? dishes.filter(Boolean) : [];
    if (!list.length) return [];

    const prices = list
      .map((dish) => Number(dish?.price || 0))
      .filter((price) => Number.isFinite(price) && price > 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const hasRatingData = list.some((dish) => Number(dish?.rating || 0) > 0);

    const scored = list
      .map((dish) => {
        const rating = Number(dish?.rating || 0);
        const price = Number(dish?.price || 0);
        const priceNormalized =
          maxPrice > minPrice && Number.isFinite(price)
            ? (price - minPrice) / (maxPrice - minPrice)
            : 0.5;
        const affordability = 1 - priceNormalized;
        const qualityScore = hasRatingData
          ? rating * 0.72 + affordability * 5 * 0.28
          : affordability * 5;
        const randomBoost = (hashString(`${daySeed()}-${dish?.id}`) % 1000) / 1000;
        const totalScore = qualityScore + randomBoost * 0.45;
        return { dish, totalScore };
      })
      .sort((a, b) => b.totalScore - a.totalScore);

    return scored.slice(0, FEATURED_SIZE).map((row) => row.dish);
  }, [dishes]);

  const featuredKey = useMemo(() => featured.map((f) => f.id).join(','), [featured]);

  useEffect(() => {
    scrollX.setValue(0);
  }, [featuredKey, snap, scrollX]);

  if (featured.length < 1) {
    return null;
  }

  const primary = colors.primary;

  return (
    <View style={styles.wrap}>
      <Animated.FlatList
        data={featured}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snap}
        snapToAlignment="start"
        disableIntervalMomentum
        nestedScrollEnabled
        contentContainerStyle={{ paddingLeft: sidePad, paddingRight: sidePad + snap * 0.12 }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => onOpenDish(item)}
            style={{ width: cardSize, height: cardSize }}
          >
            <GlassCard
              mode="blur"
              shadows={shadows}
              radius={borderRadius['2xl']}
              padding={0}
              style={[styles.cardShell, { width: cardSize, height: cardSize }]}
              innerStyle={styles.cardInner}
            >
              <View style={[styles.imageWrap, { backgroundColor: colors.cardElevated }]}>
                <DishImage
                  uri={item.imageUrl}
                  title={item.title}
                  style={styles.imgFill}
                  borderRadius={borderRadius.lg}
                  contentFit="contain"
                />
              </View>
              <View style={styles.caption}>
                <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.name, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.price, { color: isDarkMode ? colors.primary : colors.primaryDark }]}>
                  {item.price} ₽
                </Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        )}
      />
      <View style={styles.dots}>
        {featured.map((_, i) => (
          <PagingDot key={String(i)} index={i} scrollX={scrollX} snap={snap} activeColor={primary} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  cardShell: {
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
  },
  imageWrap: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  imgFill: {
    width: '100%',
    height: '100%',
  },
  caption: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    gap: 2,
  },
  name: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: fontFamily.sansSemibold,
    letterSpacing: -0.1,
  },
  price: {
    ...typography.numeric,
    fontSize: 15,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});

import React, { useEffect, useMemo, useRef, memo } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND_LILAC, BRAND_LIME, borderRadius, fontFamily, spacing, typography } from '../constants/theme';
import DishImage from './DishImage';

const GAP = 14;
const PAD = 1.5;
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
        outputRange: [6, 20, 6],
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

export default function FeaturedDishesCarousel({ dishes = [], colors, onOpenDish }) {
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const cardW = Math.min(292, Math.max(240, width * 0.74));
  const snap = cardW + GAP;
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
        const affordability = 1 - priceNormalized; // cheaper = higher score
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
      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Сегодня рекомендуем</Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
          {featured.length > 1 ? 'свайп вбок' : 'подборка дня'}
        </Text>
      </View>
      <Animated.FlatList
        data={featured}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snap}
        snapToAlignment="start"
        disableIntervalMomentum
        nestedScrollEnabled
        contentContainerStyle={{ paddingLeft: sidePad, paddingRight: sidePad + snap * 0.15 }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={1}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.93}
            onPress={() => onOpenDish(item)}
            style={{ width: cardW }}
          >
            <LinearGradient
              colors={[BRAND_LILAC, BRAND_LIME]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.gradOuter, { borderRadius: borderRadius.xl + PAD }]}
            >
              <View style={[styles.card, { borderRadius: borderRadius.xl, backgroundColor: colors.card }]}>
                <DishImage
                  uri={item.imageUrl}
                  title={item.title}
                  style={styles.img}
                  borderRadius={borderRadius.lg}
                />
                <View style={styles.caption}>
                  <Text numberOfLines={2} style={[styles.name, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.price, { color: colors.primaryDark }]}>{item.price} ₽</Text>
                </View>
              </View>
            </LinearGradient>
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
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fontFamily.sans,
    letterSpacing: -0.08,
  },
  sectionHint: {
    ...typography.caption,
    letterSpacing: 0.6,
  },
  gradOuter: {
    padding: PAD,
  },
  card: {
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: 132,
  },
  caption: {
    padding: spacing.md,
    gap: 4,
  },
  name: {
    ...typography.body,
    fontFamily: fontFamily.sans,
  },
  price: {
    ...typography.numeric,
    fontSize: 17,
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

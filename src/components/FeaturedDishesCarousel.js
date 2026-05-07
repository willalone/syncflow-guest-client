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
    const withImg = dishes.filter((d) => String(d.imageUrl || '').trim());
    const scored = [...withImg].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return scored.slice(0, 10);
  }, [dishes]);

  const featuredKey = useMemo(() => featured.map((f) => f.id).join(','), [featured]);

  useEffect(() => {
    scrollX.setValue(0);
  }, [featuredKey, snap, scrollX]);

  if (featured.length < 2) {
    return null;
  }

  const primary = colors.primary;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Сегодня рекомендуем</Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>свайп вбок</Text>
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

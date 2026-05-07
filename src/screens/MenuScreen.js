import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_LILAC, BRAND_LIME, borderRadius, fontFamily, getColors, getShadows, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import BrandHeaderAccent from '../components/BrandHeaderAccent';
import FeaturedDishesCarousel from '../components/FeaturedDishesCarousel';
import MenuDishCard from '../components/MenuDishCard';
import ScreenBackdrop from '../components/ScreenBackdrop';
import StaggeredEnter from '../components/StaggeredEnter';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { CLIENT_BRAND_KICKER } from '../constants/venue';

export default function MenuScreen({
  onOpenDish,
  dishes = [],
  categories = ['Все'],
  favorites = [],
  onToggleFavorite,
  onOpenWaiterCall,
}) {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const colors = getColors(isDarkMode);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 180);
  const [activeCategory, setActiveCategory] = useState('Все');
  const numColumns = width >= 900 ? 3 : width >= 640 ? 2 : 1;
  const isTablet = numColumns > 1;
  const isCompact = width < 380;

  const displayedCategories = useMemo(() => {
    const base = Array.isArray(categories) && categories.length ? categories : ['Все'];
    const unique = [...new Set(base)];
    const withoutFavorites = unique.filter((item) => item !== 'Избранное');
    const allFirst = withoutFavorites.includes('Все')
      ? withoutFavorites
      : ['Все', ...withoutFavorites];
    const favoriteCategory = favorites.length ? ['Избранное'] : [];
    return ['Все', ...favoriteCategory, ...allFirst.filter((item) => item !== 'Все')];
  }, [categories, favorites.length]);

  useEffect(() => {
    if (!displayedCategories.includes(activeCategory)) {
      setActiveCategory('Все');
    }
  }, [displayedCategories, activeCategory]);

  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      const categoryOk =
        activeCategory === 'Все'
          ? true
          : activeCategory === 'Избранное'
            ? favorites.includes(dish.id)
            : dish.category === activeCategory;
      const queryOk = dish.title.toLowerCase().includes(debouncedQuery.trim().toLowerCase());
      return categoryOk && queryOk;
    });
  }, [dishes, activeCategory, debouncedQuery, favorites]);

  useEffect(() => {
    dishes.slice(0, 8).forEach((dish) => {
      if (dish.imageUrl && !String(dish.imageUrl).startsWith('data:')) {
        ExpoImage.prefetch(dish.imageUrl, 'memory-disk').catch(() => null);
      }
    });
  }, [dishes]);

  const renderDish = useCallback(
    ({ item }) => (
      <StaggeredEnter>
        <MenuDishCard
          dish={item}
          colors={colors}
          shadowsThemed={shadowsThemed}
          isCompact={isCompact}
          isTablet={isTablet}
          onPress={onOpenDish}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          showFavorite
        />
      </StaggeredEnter>
    ),
    [onOpenDish, isTablet, isCompact, colors, shadowsThemed, onToggleFavorite, favorites]
  );

  const renderMenuListHeader = useCallback(() => {
    if (activeCategory !== 'Все') {
      return null;
    }
    return <FeaturedDishesCarousel dishes={dishes} colors={colors} onOpenDish={onOpenDish} />;
  }, [activeCategory, dishes, colors, onOpenDish]);

  return (
    <ScreenBackdrop isDarkMode={isDarkMode}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.header}>
        <BrandHeaderAccent kicker={CLIENT_BRAND_KICKER} />
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.text }]}>Меню</Text>
            <LinearGradient
              colors={[BRAND_LILAC, BRAND_LIME]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.titleAccent}
            />
          </View>
          {onOpenWaiterCall ? (
            <TouchableOpacity
              onPress={() => onOpenWaiterCall()}
              style={[styles.waiterIconWrap, { backgroundColor: colors.card, borderColor: colors.hairline }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Вызов официанта"
            >
              <Ionicons name="hand-left-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TextInput
          style={[
            styles.search,
            { backgroundColor: colors.card, borderColor: colors.hairline, color: colors.text },
          ]}
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск блюда"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.categoriesRail}>
        <FlatList
          horizontal
          data={displayedCategories}
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesList}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categories}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = activeCategory === item;
            return (
              <TouchableOpacity onPress={() => setActiveCategory(item)} activeOpacity={0.88} style={styles.categoryHit}>
                <View
                  style={[
                    active ? styles.categoryActive : styles.categoryInactive,
                    active
                      ? { backgroundColor: colors.primary, borderColor: colors.primaryDark }
                      : { borderColor: colors.hairline, backgroundColor: colors.card },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.categoryText, { color: active ? colors.black : colors.text }]}
                  >
                    {item}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        style={styles.menuScroll}
        data={filteredDishes}
        key={numColumns}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderMenuListHeader}
        contentContainerStyle={[styles.list, { paddingBottom: spacing['2xl'] }]}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrap : undefined}
        initialNumToRender={8}
        windowSize={7}
        maxToRenderPerBatch={8}
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        renderItem={renderDish}
      />
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  menuScroll: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  titleBlock: { flex: 1, minWidth: 0 },
  title: {
    ...typography.h2,
    fontFamily: fontFamily.sans,
  },
  titleAccent: { width: 44, height: 3, borderRadius: 2, marginTop: spacing.sm },
  waiterIconWrap: {
    padding: spacing.sm,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.round,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'center',
  },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  categoriesRail: {
    height: 52,
    justifyContent: 'center',
    marginBottom: 2,
  },
  categoriesList: {
    flexGrow: 0,
  },
  categories: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
    gap: spacing.sm,
    alignItems: 'center',
  },
  categoryHit: { alignSelf: 'center' },
  categoryActive: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    height: 40,
    maxHeight: 40,
    justifyContent: 'center',
  },
  categoryInactive: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    height: 40,
    maxHeight: 40,
    justifyContent: 'center',
  },
  categoryText: { ...typography.caption, fontFamily: fontFamily.sans },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 0,
  },
  columnWrap: {
    gap: spacing.sm,
    marginBottom: 0,
  },
});

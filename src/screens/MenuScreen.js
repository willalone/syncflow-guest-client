import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, fontFamily, getColors, getGlassTokens, getShadows, layout, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useClientData } from '../contexts/ClientDataContext';
import MenuDishCard from '../components/MenuDishCard';
import GlassCard from '../components/ui/GlassCard';
import RubberFlatList from '../components/ui/RubberFlatList';
import SectionHeader from '../components/ui/SectionHeader';
import ScreenBackdrop from '../components/ScreenBackdrop';
import StaggeredEnter from '../components/StaggeredEnter';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { isDishAvailableForVisit } from '../utils/menuAvailability';

export default function MenuScreen({
  onOpenDish,
  onAddToCart,
  dishes = [],
  categories = ['Все'],
  favorites = [],
  onToggleFavorite,
  preorderContext = null,
  canUseFavorites = true,
}) {
  const { isDarkMode } = useTheme();
  const { refreshClientData, isRefreshing } = useClientData();
  const { width } = useWindowDimensions();
  const colors = getColors(isDarkMode);
  const glass = useMemo(() => getGlassTokens(isDarkMode), [isDarkMode]);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 180);
  const [activeCategory, setActiveCategory] = useState('Все');
  const [nowTick, setNowTick] = useState(() => Date.now());
  const numColumns = width >= 900 ? 3 : width >= 640 ? 2 : 1;
  const isTablet = numColumns > 1;
  const isCompact = width < 380;

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentMenuContext = useMemo(() => {
    const d = new Date(nowTick);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
  }, [nowTick]);

  const availabilityContext = preorderContext || currentMenuContext;

  const displayedCategories = useMemo(() => {
    const base = Array.isArray(categories) && categories.length ? categories : ['Все'];
    const unique = [...new Set(base)];
    const withoutFavorites = unique.filter((item) => item !== 'Избранное');
    const allFirst = withoutFavorites.includes('Все')
      ? withoutFavorites
      : ['Все', ...withoutFavorites];
    const favoriteCategory = canUseFavorites && favorites.length ? ['Избранное'] : [];
    return ['Все', ...favoriteCategory, ...allFirst.filter((item) => item !== 'Все')];
  }, [categories, favorites.length, canUseFavorites]);

  useEffect(() => {
    if (!displayedCategories.includes(activeCategory)) {
      setActiveCategory('Все');
    }
  }, [displayedCategories, activeCategory]);

  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      if (!isDishAvailableForVisit(dish, availabilityContext)) return false;
      const categoryOk =
        activeCategory === 'Все'
          ? true
          : activeCategory === 'Избранное'
            ? favorites.includes(dish.id)
            : dish.category === activeCategory;
      const queryOk = dish.title.toLowerCase().includes(debouncedQuery.trim().toLowerCase());
      return categoryOk && queryOk;
    });
  }, [dishes, activeCategory, debouncedQuery, favorites, availabilityContext]);

  useEffect(() => {
    dishes.slice(0, 8).forEach((dish) => {
      if (dish.imageUrl && !String(dish.imageUrl).startsWith('data:')) {
        ExpoImage.prefetch(dish.imageUrl, 'memory-disk').catch(() => null);
      }
    });
  }, [dishes]);

  const renderDish = useCallback(
    ({ item }) => (
      <StaggeredEnter style={styles.listItem}>
        <MenuDishCard
          dish={item}
          colors={colors}
          shadowsThemed={shadowsThemed}
          isCompact={isCompact}
          isTablet={isTablet}
          onPress={onOpenDish}
          onAddToCart={onAddToCart}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          showFavorite={canUseFavorites}
        />
      </StaggeredEnter>
    ),
    [onOpenDish, onAddToCart, isTablet, isCompact, colors, shadowsThemed, onToggleFavorite, favorites, canUseFavorites]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>Добро пожаловать</Text>
          <Text style={[styles.title, { color: colors.text }]}>Меню</Text>

          <GlassCard mode="blur" shadows={shadowsThemed} radius={borderRadius.pill} padding={0} style={styles.searchGlass}>
            <View style={styles.searchInner}>
              <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={[styles.search, { color: colors.text }]}
                value={query}
                onChangeText={setQuery}
                placeholder="Поиск блюда"
                placeholderTextColor={colors.textMuted}
              />
              {query.length > 0 ? (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </GlassCard>

          {preorderContext ? (
            <Text style={[styles.preorderContextHint, { color: colors.textMuted }]}>
              Предзаказ на {preorderContext.date} к {preorderContext.time}
            </Text>
          ) : null}
        </View>

        <SectionHeader title="Категории" colors={colors} style={styles.sectionHeaderFlush} />

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
                      styles.categoryChip,
                      active
                        ? [
                            { backgroundColor: colors.primary, borderColor: colors.primaryDark },
                            shadowsThemed.accentGlow,
                          ]
                        : { borderColor: glass.border, backgroundColor: glass.fill },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.categoryText,
                        {
                          color: active ? colors.black : colors.text,
                          fontFamily: active ? fontFamily.sansBold : fontFamily.sansMedium,
                        },
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <SectionHeader title={activeCategory} colors={colors} style={styles.sectionHeaderFlush} />
      </View>
    ),
    [
      activeCategory,
      colors,
      displayedCategories,
      glass.border,
      glass.fill,
      preorderContext,
      query,
      shadowsThemed,
    ]
  );

  return (
    <ScreenBackdrop isDarkMode={isDarkMode}>
      <SafeAreaView style={styles.container}>
        <RubberFlatList
          style={styles.menuScroll}
          data={filteredDishes}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing['2xl'] }]}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrap : undefined}
          initialNumToRender={8}
          windowSize={7}
          maxToRenderPerBatch={8}
          removeClippedSubviews={false}
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          renderItem={renderDish}
          onRefresh={refreshClientData}
          refreshing={isRefreshing}
        />
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  menuScroll: { flex: 1 },
  listContent: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.xs,
    alignItems: 'stretch',
  },
  listHeader: {
    width: '100%',
    alignSelf: 'stretch',
  },
  header: {
    paddingTop: spacing.sm,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    alignSelf: 'stretch',
  },
  greeting: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    ...typography.h1,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  searchGlass: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: layout.searchHeight,
  },
  sectionHeaderFlush: {
    paddingHorizontal: 0,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: layout.searchHeight,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  search: {
    flex: 1,
    ...typography.body,
    paddingVertical: 0,
  },
  preorderContextHint: {
    ...typography.caption,
  },
  categoriesRail: {
    height: layout.chipHeight + 8,
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  categoriesList: {
    flexGrow: 0,
  },
  categories: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  categoryHit: {
    alignSelf: 'flex-start',
  },
  categoryChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
    height: layout.chipHeight,
    justifyContent: 'center',
  },
  categoryText: {
    ...typography.body,
    fontSize: 14,
  },
  listItem: {
    width: '100%',
  },
  columnWrap: {
    gap: spacing.sm,
  },
});

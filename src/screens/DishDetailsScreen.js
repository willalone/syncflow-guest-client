import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRubberOverscroll } from '../hooks/useRubberOverscroll';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, fontFamily, getColors, getShadows, layout, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import DishImage from '../components/DishImage';
import GuestOrderHintCard from '../components/GuestOrderHintCard';
import { runtimeConfig } from '../config/runtimeConfig';
import * as clientApi from '../services/api/clientApi';

const HERO_RADIUS = borderRadius['2xl'];
const SHEET_OVERLAP = 28;
const PULL_REVEAL_MAX = 100;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function DishDetailsScreen({
  dish,
  dishes = [],
  onBack,
  onAddToCart,
  canOrder = true,
  onOpenAuth,
  favorites = [],
  onToggleFavorite,
  canUseFavorites = false,
}) {
  const { isDarkMode } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colors = getColors(isDarkMode);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
  const heroHeight = Math.round(Math.min(width * 0.92, height * 0.38, 340));

  const [qty, setQty] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [ingredientsApi, setIngredientsApi] = useState(null);
  const [modifiersApi, setModifiersApi] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasFailed, setExtrasFailed] = useState(false);

  const dishIdKey = String(dish?.id ?? '');
  const isFavorite = favorites.some((id) => String(id) === dishIdKey);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (runtimeConfig.integratedBackend !== 'syncflow' || !dish?.id) {
        setIngredientsApi(null);
        setModifiersApi(null);
        setExtrasFailed(false);
        return;
      }
      setExtrasLoading(true);
      setExtrasFailed(false);
      try {
        const [ing, mod] = await Promise.all([
          clientApi.fetchDishIngredients(dish.id),
          clientApi.fetchDishModifiers(dish.id),
        ]);
        if (!cancelled) {
          setIngredientsApi(Array.isArray(ing) ? ing : []);
          setModifiersApi(Array.isArray(mod) ? mod : []);
          setExtrasFailed(false);
        }
      } catch {
        if (!cancelled) {
          setExtrasFailed(true);
          setIngredientsApi([]);
          setModifiersApi([]);
        }
      } finally {
        if (!cancelled) setExtrasLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dish?.id]);

  useEffect(() => {
    setSelectedModifiers({});
    setQty(1);
    setDetailsOpen(false);
  }, [dish?.id]);

  const ingredientsText = useMemo(() => {
    if (ingredientsApi && ingredientsApi.length) {
      const text = ingredientsApi
        .map((row) => {
          const ing = row?.ingredient;
          let name = '';
          if (ing && typeof ing === 'object' && String(ing.name || '').trim()) {
            name = String(ing.name).trim();
          } else if (typeof ing === 'string' && ing.trim()) {
            name = ing.trim();
          } else if (String(row?.name || '').trim()) {
            name = String(row.name).trim();
          } else if (String(row?.ingredientName || '').trim()) {
            name = String(row.ingredientName).trim();
          } else if (ing && typeof ing === 'object' && ing.id != null && String(ing.id).trim() !== '') {
            name = `Ингредиент №${ing.id}`;
          }
          const proc = row?.processingType ? ` (${row.processingType})` : '';
          const gw = row?.grossWeight != null ? ` — ${row.grossWeight} г` : '';
          return `${name}${proc}${gw}`;
        })
        .filter(Boolean)
        .join('\n');
      if (text.trim()) return text;
    }
    if (extrasFailed) {
      return 'Детальный состав с сервера не загрузился — ориентируйтесь на описание выше или зайдите позже.';
    }
    return dish.ingredients || '—';
  }, [ingredientsApi, dish.ingredients, extrasFailed]);

  const recommended = (dish.recommendedWith || [])
    .map((id) => dishes.find((row) => row.id === id))
    .filter(Boolean);

  const modifiersPrepared = useMemo(
    () =>
      (Array.isArray(modifiersApi) ? modifiersApi : [])
        .map((row) => {
          const m = row?.modificator;
          const id = String(m?.id ?? row?.id ?? '');
          const name = String(m?.ingredient?.name || 'Опция');
          const price = Number(m?.price || 0);
          return { id, name, price };
        })
        .filter((item) => item.id),
    [modifiersApi]
  );

  const selectedModifiersList = useMemo(
    () => modifiersPrepared.filter((item) => Boolean(selectedModifiers[item.id])),
    [modifiersPrepared, selectedModifiers]
  );

  const lineTotal = useMemo(() => {
    const mods = selectedModifiersList.reduce((sum, item) => sum + Number(item?.price || 0), 0);
    return (Number(dish.price || 0) + mods) * qty;
  }, [dish.price, selectedModifiersList, qty]);

  const ratingLine = useMemo(() => {
    const parts = [];
    if (dish.rating != null) {
      parts.push(`${Number(dish.rating).toFixed(1)}`);
    }
    if (dish.weight) {
      parts.push(dish.weight);
    }
    return parts.join(' · ');
  }, [dish.rating, dish.weight]);

  const handleToggleFavorite = () => {
    if (!dishIdKey || !onToggleFavorite) return;
    onToggleFavorite(dish.id);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${dish.title} — ${dish.price} ₽${dish.description ? `\n${dish.description}` : ''}`,
      });
    } catch {
      /* отмена пользователем */
    }
  };

  const handleAdd = () => {
    onAddToCart(dish.id, qty, { modifiers: selectedModifiersList });
  };

  const sheetBg = colors.backgroundLight;
  const heroBg = colors.cardElevated;
  const footerPadBottom = Math.max(insets.bottom, spacing.md);

  const { scrollHandler, panGesture, pullDistance, scrollBounceProps } = useRubberOverscroll({
    maxPull: PULL_REVEAL_MAX,
    scrollRubberFactor: 0.5,
    panRubberFactor: 0.55,
  });

  const heroExpandStyle = useAnimatedStyle(() => ({
    height: heroHeight + pullDistance.value * 0.95,
  }));

  const sheetPullStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pullDistance.value }],
  }));

  const nativeGesture = Gesture.Native();
  const scrollGestures = Gesture.Simultaneous(nativeGesture, panGesture);

  return (
    <View style={[styles.root, { backgroundColor: heroBg }]}>
      <Animated.View style={[styles.heroLayer, heroExpandStyle, { backgroundColor: heroBg }]}>
        <DishImage
          uri={dish.imageUrl}
          title={dish.title}
          style={styles.heroImage}
          borderRadius={0}
          contentFit="contain"
        />
      </Animated.View>

      <GestureDetector gesture={scrollGestures}>
        <AnimatedScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: heroHeight - SHEET_OVERLAP,
              paddingBottom: canOrder ? 96 + footerPadBottom : spacing['2xl'] + footerPadBottom,
            },
          ]}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollBounceProps}
        >
          <Animated.View style={[styles.sheet, sheetPullStyle, { backgroundColor: sheetBg }]}>
            {ratingLine ? (
            <View style={styles.ratingRow}>
              {dish.rating != null ? <Ionicons name="star" size={14} color={colors.warning} /> : null}
              <Text style={[styles.ratingText, { color: colors.textMuted }]}>{ratingLine}</Text>
            </View>
          ) : null}

          <Text style={[styles.title, { color: colors.text }]}>{dish.title}</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setDetailsOpen((open) => !open)}
            style={[styles.detailsRow, { borderTopColor: colors.hairline, borderBottomColor: colors.hairline }]}
          >
            <Text style={[styles.detailsRowTitle, { color: colors.text }]}>Подробнее о блюде</Text>
            <Ionicons
              name={detailsOpen ? 'chevron-up' : 'chevron-forward'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {detailsOpen ? (
            <View style={styles.detailsBody}>
              {dish.description ? (
                <Text style={[styles.body, { color: colors.textLight }]}>{dish.description}</Text>
              ) : null}

              <Text style={[styles.detailsLabel, { color: colors.text }]}>Состав</Text>
              {extrasLoading ? (
                <View style={styles.extrasLoading}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.extrasHint, { color: colors.textMuted }]}>Загружаем состав…</Text>
                </View>
              ) : (
                <Text style={[styles.body, { color: colors.textLight }]}>{ingredientsText}</Text>
              )}

              {canOrder && modifiersApi && modifiersApi.length ? (
                <>
                  <Text style={[styles.detailsLabel, { color: colors.text }]}>Дополнительно</Text>
                  <View style={styles.modGrid}>
                    {modifiersApi.map((row) => {
                      const m = row?.modificator;
                      const modifierId = String(m?.id ?? row?.id ?? '');
                      const selected = Boolean(selectedModifiers[modifierId]);
                      const name = m?.ingredient?.name || 'Опция';
                      const price = m?.price != null ? `+${m.price} ₽` : '';
                      return (
                        <TouchableOpacity
                          key={row.id ?? `${name}-${price}`}
                          activeOpacity={0.86}
                          onPress={() => {
                            if (!modifierId) return;
                            setSelectedModifiers((prev) => ({
                              ...prev,
                              [modifierId]: !prev[modifierId],
                            }));
                          }}
                          style={[
                            styles.modChip,
                            {
                              borderColor: selected ? colors.primary : colors.hairline,
                              backgroundColor: selected ? colors.primary : colors.cardElevated,
                            },
                          ]}
                        >
                          <Text style={[styles.modChipText, { color: selected ? colors.black : colors.text }]}>
                            {name}
                          </Text>
                          {price ? (
                            <Text
                              style={[styles.modChipPrice, { color: selected ? colors.black : colors.textMuted }]}
                            >
                              {price}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {canOrder ? (
                <View style={[styles.qtyRow, { backgroundColor: colors.cardElevated, borderColor: colors.hairline }]}>
                  <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>Количество</Text>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity onPress={() => setQty((v) => Math.max(1, v - 1))} hitSlop={10}>
                      <Text style={[styles.qtyButton, { color: colors.text }]}>−</Text>
                    </TouchableOpacity>
                    <Text style={[styles.qtyValue, { color: colors.text }]}>{qty}</Text>
                    <TouchableOpacity onPress={() => setQty((v) => v + 1)} hitSlop={10}>
                      <Text style={[styles.qtyButton, { color: colors.text }]}>＋</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {recommended.length ? (
            <View style={styles.recoSection}>
              <Text style={[styles.recoTitle, { color: colors.text }]}>Что ещё пригодится</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recoScroll}
              >
                {recommended.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.recoCard, { backgroundColor: colors.cardElevated, borderColor: colors.hairline }]}
                  >
                    <DishImage
                      uri={item.imageUrl}
                      title={item.title}
                      style={styles.recoImage}
                      borderRadius={borderRadius.lg}
                      contentFit="contain"
                    />
                    <Text numberOfLines={2} style={[styles.recoName, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <View style={styles.recoFooter}>
                      <Text style={[styles.recoPrice, { color: colors.text }]}>{item.price} ₽</Text>
                      {canOrder ? (
                        <TouchableOpacity
                          onPress={() => onAddToCart(item.id, 1)}
                          style={[styles.recoAdd, { backgroundColor: colors.primary }, shadowsThemed.accentGlow]}
                        >
                          <Ionicons name="add" size={20} color={colors.black} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {!canOrder ? <GuestOrderHintCard colors={colors} onOpenAuth={onOpenAuth} /> : null}
          </Animated.View>
        </AnimatedScrollView>
      </GestureDetector>

      <SafeAreaView edges={['top']} style={styles.heroToolbar} pointerEvents="box-none">
        <View style={styles.heroActionsRow} pointerEvents="auto">
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.heroIconBtn, { backgroundColor: colors.card }, shadowsThemed.small]}
            hitSlop={10}
            accessibilityLabel="Поделиться"
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          {canUseFavorites ? (
            <TouchableOpacity
              onPress={handleToggleFavorite}
              style={[styles.heroIconBtn, { backgroundColor: colors.card }, shadowsThemed.small]}
              hitSlop={10}
              accessibilityLabel="Избранное"
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? colors.error : colors.text}
              />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={onBack}
            style={[styles.heroIconBtn, { backgroundColor: colors.card }, shadowsThemed.small]}
            hitSlop={10}
            accessibilityLabel="Закрыть"
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {canOrder ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.primary,
              paddingBottom: footerPadBottom,
            },
            shadowsThemed.accentGlow,
          ]}
        >
          <Text style={[styles.footerPrice, { color: colors.black }]}>{lineTotal.toFixed(0)} ₽</Text>
          <TouchableOpacity
            onPress={handleAdd}
            activeOpacity={0.9}
            style={[styles.footerAddBtn, { backgroundColor: colors.card }]}
            accessibilityLabel="В корзину"
          >
            <Ionicons name="add" size={30} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  heroToolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  heroActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.xs,
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    borderTopLeftRadius: HERO_RADIUS,
    borderTopRightRadius: HERO_RADIUS,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    ...typography.caption,
    fontSize: 13,
  },
  title: {
    ...typography.h2,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  detailsRowTitle: {
    ...typography.body,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 16,
  },
  detailsBody: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  detailsLabel: {
    ...typography.h4,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  body: {
    ...typography.body,
    lineHeight: 22,
  },
  modGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  modChipText: {
    ...typography.caption,
    fontWeight: '600',
  },
  modChipPrice: {
    ...typography.caption,
    fontSize: 11,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  qtyLabel: {
    ...typography.caption,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qtyButton: {
    fontSize: 22,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  qtyValue: {
    ...typography.bodyLarge,
    fontFamily: fontFamily.sansBold,
    minWidth: 24,
    textAlign: 'center',
  },
  recoSection: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  recoTitle: {
    ...typography.h4,
    fontSize: 17,
    fontFamily: fontFamily.sansBold,
  },
  recoScroll: {
    gap: spacing.sm,
    paddingRight: layout.screenPaddingX,
  },
  recoCard: {
    width: 132,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  recoImage: {
    width: '100%',
    height: 88,
  },
  recoName: {
    ...typography.caption,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12,
    minHeight: 32,
  },
  recoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recoPrice: {
    ...typography.numeric,
    fontSize: 14,
  },
  recoAdd: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.md,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  footerPrice: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fontFamily.sansBold,
    letterSpacing: -0.4,
  },
  footerAddBtn: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extrasLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  extrasHint: {
    ...typography.caption,
  },
});

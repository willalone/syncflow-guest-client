import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND_LILAC, BRAND_LIME, borderRadius, getColors, getShadows, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import DishImage from '../components/DishImage';
import GradientBorderCard from '../components/GradientBorderCard';
import ScreenBackdrop from '../components/ScreenBackdrop';
import { runtimeConfig } from '../config/runtimeConfig';
import * as clientApi from '../services/api/clientApi';

const HERO_OUTER_R = borderRadius.xl + 2;

export default function DishDetailsScreen({ dish, dishes = [], onBack, onAddToCart }) {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = getColors(isDarkMode);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
  const [qty, setQty] = useState(1);
  const [ingredientsApi, setIngredientsApi] = useState(null);
  const [modifiersApi, setModifiersApi] = useState(null);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasFailed, setExtrasFailed] = useState(false);

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

  const ingredientsText = useMemo(() => {
    if (ingredientsApi && ingredientsApi.length) {
      return ingredientsApi
        .map((row) => {
          const name = row?.ingredient?.name || '';
          const proc = row?.processingType ? ` (${row.processingType})` : '';
          const gw = row?.grossWeight != null ? ` — ${row.grossWeight} г` : '';
          return `${name}${proc}${gw}`;
        })  
        .filter(Boolean)
        .join('\n');
    }
    if (extrasFailed) {
      return 'Детальный состав с сервера не загрузился — ориентируйтесь на описание выше или зайдите позже.';
    }
    return dish.ingredients || '—';
  }, [ingredientsApi, dish.ingredients, extrasFailed]);

  const recommended = (dish.recommendedWith || [])
    .map((id) => dishes.find((row) => row.id === id))
    .filter(Boolean);

  return (
    <ScreenBackdrop isDarkMode={isDarkMode} style={styles.backdrop}>
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.flex}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <TouchableOpacity onPress={onBack} style={styles.back} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
              <Text style={[styles.backText, { color: colors.text }]}>← Назад</Text>
            </TouchableOpacity>

            <View style={[styles.heroShell, shadowsThemed.float, { borderRadius: HERO_OUTER_R }]}>
              <GradientBorderCard colors={colors} innerStyle={styles.heroInner}>
                <DishImage uri={dish.imageUrl} title={dish.title} style={styles.image} borderRadius={0} />
              </GradientBorderCard>
            </View>

            <View style={styles.body}>
              <Text style={[styles.name, { color: colors.text }]}>{dish.title}</Text>
              <LinearGradient
                colors={[BRAND_LILAC, BRAND_LIME]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.titleAccent}
              />
              <Text style={[styles.price, { color: colors.primary }]}>
                {dish.price} руб.
              </Text>
              <Text style={[styles.label, { color: colors.textLight }]}>Описание</Text>
              <Text style={[styles.text, { color: colors.text }]}>{dish.description}</Text>
              <Text style={[styles.label, { color: colors.textLight }]}>Состав</Text>
              {extrasLoading ? (
                <View style={styles.extrasLoading}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.extrasHint, { color: colors.textMuted }]}>Загружаем состав…</Text>
                </View>
              ) : (
                <Text style={[styles.text, { color: colors.text }]}>{ingredientsText}</Text>
              )}
              {modifiersApi && modifiersApi.length ? (
                <>
                  <Text style={[styles.label, { color: colors.textLight }]}>Дополнительно</Text>
                  <View style={{ gap: spacing.xs }}>
                    {modifiersApi.map((row) => {
                      const m = row?.modificator;
                      const name = m?.ingredient?.name || 'Опция';
                      const price = m?.price != null ? `${m.price} руб.` : '';
                      const w = m?.grossWeight != null && m?.unit?.name ? ` · ${m.grossWeight} ${m.unit.name}` : '';
                      return (
                        <View
                          key={row.id ?? `${name}-${price}`}
                          style={[styles.modRow, { borderColor: colors.hairline, backgroundColor: colors.cardElevated }]}
                        >
                          <Text style={[styles.text, { color: colors.text, flex: 1 }]}>
                            {name}
                            {w}
                          </Text>
                          {price ? <Text style={[styles.modPrice, { color: colors.primary }]}>{price}</Text> : null}
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}
              {recommended.length ? (
                <>
                  <Text style={[styles.label, { color: colors.textLight }]}>Рекомендуем к этому блюду</Text>
                  <View style={styles.recoRow}>
                    {recommended.map((item) => (
                      <View
                        key={item.id}
                        style={[styles.recoChip, { borderColor: colors.hairline, backgroundColor: colors.cardElevated }]}
                      >
                        <Text style={[styles.recoTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.recoPrice, { color: colors.textLight }]}>{item.price} руб.</Text>
                        <TouchableOpacity
                          onPress={() => onAddToCart(item.id, 1)}
                          style={[styles.recoAddBtn, { backgroundColor: colors.primary }]}
                        >
                          <Text style={[styles.recoAddText, { color: colors.black }]}>Добавить</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          </ScrollView>

          <View
            style={[
              styles.bottom,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.hairline,
                paddingBottom: Math.max(insets.bottom, spacing.md),
              },
            ]}
          >
            <View style={[styles.qty, { borderColor: colors.hairline }]}>
              <TouchableOpacity onPress={() => setQty((value) => Math.max(1, value - 1))}>
                <Text style={[styles.qtyButton, { color: colors.text }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.qtyValue, { color: colors.text }]}>{qty}</Text>
              <TouchableOpacity onPress={() => setQty((value) => value + 1)}>
                <Text style={[styles.qtyButton, { color: colors.text }]}>＋</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => onAddToCart(dish.id, qty)}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.addText, { color: colors.black }]}>Добавить в корзину</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  safeTop: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  back: { paddingTop: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  backText: { ...typography.body, fontWeight: '600' },
  heroShell: {
    marginHorizontal: spacing.lg,
    borderRadius: HERO_OUTER_R,
  },
  heroInner: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%', borderRadius: 0 },
  body: { padding: spacing.lg, gap: spacing.sm },
  name: { ...typography.h2, letterSpacing: -0.5 },
  titleAccent: {
    width: 48,
    height: 3,
    borderRadius: 2,
    marginTop: -4,
    marginBottom: spacing.xs,
  },
  price: { ...typography.numeric, fontSize: 22, lineHeight: 28 },
  label: { ...typography.caption, fontWeight: '600', marginTop: spacing.xs, letterSpacing: 0.8 },
  text: { ...typography.body },
  recoRow: { gap: spacing.xs },
  recoChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md, padding: spacing.sm },
  recoTitle: { ...typography.caption, fontWeight: '700' },
  recoPrice: { ...typography.caption, marginTop: 2 },
  recoAddBtn: {
    marginTop: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: 6,
  },
  recoAddText: { ...typography.caption, fontWeight: '700' },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  qtyButton: { fontSize: 22, fontWeight: '700' },
  qtyValue: { ...typography.bodyLarge, fontWeight: '700' },
  addButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  addText: { ...typography.button, fontWeight: '700' },
  extrasLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  extrasHint: { ...typography.caption },
  modRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  modPrice: { ...typography.caption, fontWeight: '700' },
});

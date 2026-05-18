import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, getColors, getGlassTokens, getShadows, layout, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import DishImage from '../components/DishImage';
import ScreenBackdrop from '../components/ScreenBackdrop';
import GuestOrderHintCard from '../components/GuestOrderHintCard';
import { runtimeConfig } from '../config/runtimeConfig';
import * as clientApi from '../services/api/clientApi';

export default function DishDetailsScreen({
  dish,
  dishes = [],
  onBack,
  onAddToCart,
  canOrder = true,
  onOpenAuth,
}) {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = getColors(isDarkMode);
  const glass = useMemo(() => getGlassTokens(isDarkMode), [isDarkMode]);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
  const [qty, setQty] = useState(1);
  const [ingredientsApi, setIngredientsApi] = useState(null);
  const [modifiersApi, setModifiersApi] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
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

  useEffect(() => {
    setSelectedModifiers({});
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

  return (
    <ScreenBackdrop isDarkMode={isDarkMode} style={styles.backdrop}>
      <View style={styles.flex}>
        <View style={styles.hero}>
          <DishImage uri={dish.imageUrl} title={dish.title} style={styles.heroImage} borderRadius={0} />
          <View style={[styles.heroFade, { backgroundColor: isDarkMode ? 'rgba(20,16,24,0.35)' : 'rgba(250,247,252,0.15)' }]} />
          <SafeAreaView edges={['top']} style={styles.heroTopBar}>
            <TouchableOpacity
              onPress={onBack}
              style={[styles.iconBtn, { backgroundColor: glass.fillStrong, borderColor: glass.border, borderWidth: StyleSheet.hairlineWidth }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View
          style={[
            styles.sheet,
            shadowsThemed.glass,
            {
              backgroundColor: glass.fillStrong,
              borderColor: glass.border,
              borderWidth: StyleSheet.hairlineWidth,
              paddingBottom: canOrder ? 0 : Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.name, { color: colors.text }]}>{dish.title}</Text>
            <View style={styles.metaRow}>
              {dish.rating != null ? (
                <View style={styles.metaChip}>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text style={[styles.metaText, { color: colors.textLight }]}>{dish.rating}</Text>
                </View>
              ) : null}
              {dish.weight ? (
                <Text style={[styles.metaText, { color: colors.textMuted }]}>{dish.weight}</Text>
              ) : null}
            </View>
            <Text style={[styles.price, { color: colors.primaryDark }]}>{dish.price} ₽</Text>

            <Text style={[styles.sectionLabel, { color: colors.text }]}>Описание</Text>
            <Text style={[styles.body, { color: colors.textLight }]}>{dish.description}</Text>

            <Text style={[styles.sectionLabel, { color: colors.text }]}>Состав</Text>
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
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Дополнительно</Text>
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
                          <Text style={[styles.modChipPrice, { color: selected ? colors.black : colors.textMuted }]}>
                            {price}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}

            {recommended.length ? (
              <>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>С этим заказывают</Text>
                <View style={styles.recoRow}>
                  {recommended.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.recoCard, { backgroundColor: colors.cardElevated, borderColor: colors.hairline }]}
                    >
                      <Text numberOfLines={2} style={[styles.recoTitle, { color: colors.text }]}>
                        {item.title}
                      </Text>
                      <Text style={[styles.recoPrice, { color: colors.primaryDark }]}>{item.price} ₽</Text>
                      {canOrder ? (
                        <TouchableOpacity
                          onPress={() => onAddToCart(item.id, 1)}
                          style={[styles.recoAddBtn, { backgroundColor: colors.primary }, shadowsThemed.accentGlow]}
                        >
                          <Ionicons name="add" size={18} color={colors.black} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {!canOrder ? <GuestOrderHintCard colors={colors} onOpenAuth={onOpenAuth} /> : null}
          </ScrollView>

          {canOrder ? (
            <View
              style={[
                styles.bottom,
                {
                  borderTopColor: colors.hairline,
                  paddingBottom: Math.max(insets.bottom, spacing.md),
                },
              ]}
            >
              <View style={[styles.qty, { backgroundColor: colors.cardElevated, borderColor: colors.hairline }]}>
                <TouchableOpacity onPress={() => setQty((value) => Math.max(1, value - 1))} hitSlop={8}>
                  <Text style={[styles.qtyButton, { color: colors.text }]}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.qtyValue, { color: colors.text }]}>{qty}</Text>
                <TouchableOpacity onPress={() => setQty((value) => value + 1)} hitSlop={8}>
                  <Text style={[styles.qtyButton, { color: colors.text }]}>＋</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => onAddToCart(dish.id, qty, { modifiers: selectedModifiersList })}
                style={[styles.addButton, { backgroundColor: colors.primary }, shadowsThemed.accentGlow]}
              >
                <Text style={[styles.addText, { color: colors.black }]}>В корзину</Text>
                <Text style={[styles.addPrice, { color: colors.black }]}>{lineTotal.toFixed(0)} ₽</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </ScreenBackdrop>
  );
}

const HERO_H = 280;

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  flex: { flex: 1 },
  hero: {
    height: HERO_H,
    width: '100%',
    backgroundColor: '#1E1824',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFade: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.xs,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    flex: 1,
    marginTop: -borderRadius.sheet,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    overflow: 'hidden',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  name: {
    ...typography.h2,
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
  },
  price: {
    ...typography.numeric,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    ...typography.h4,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
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
  recoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recoCard: {
    width: '47%',
    minWidth: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  recoTitle: {
    ...typography.caption,
    fontWeight: '700',
    minHeight: 32,
  },
  recoPrice: {
    ...typography.numeric,
    fontSize: 15,
  },
  recoAddBtn: {
    alignSelf: 'flex-start',
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  bottom: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  qtyButton: { fontSize: 22, fontWeight: '700' },
  qtyValue: { ...typography.bodyLarge, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.pill,
  },
  addText: { ...typography.button, fontWeight: '700' },
  addPrice: { ...typography.numeric, fontSize: 16 },
  extrasLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  extrasHint: { ...typography.caption },
});

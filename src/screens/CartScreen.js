import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, getColors, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { buildCartPayableBreakdown, calculateCartTotal } from '../utils/cart';
import { runtimeConfig } from '../config/runtimeConfig';
import BrandHeaderAccent from '../components/BrandHeaderAccent';
import { DEFAULT_VENUE_LABEL } from '../constants/venue';
import CartItemsList from './cart/CartItemsList';
import CartFooterSection from './cart/CartFooterSection';

export default function CartScreen({
  cartItems,
  dishes = [],
  onChangeQty,
  onCheckout,
  onAddToCart,
  onValidationError,
  onPromoMessage,
  loyaltyPoints = 0,
  guestDiscountPercentage,
  appliedPromo = null,
  onApplyPromo,
  onClearPromo,
}) {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const colors = getColors(isDarkMode);
  const isWide = width >= 768;
  const isCompact = width < 380;
  const dishById = useMemo(
    () =>
      dishes.reduce((acc, dish) => {
        acc[dish.id] = dish;
        return acc;
      }, {}),
    [dishes]
  );
  const cartData = useMemo(
    () =>
      cartItems
        .map((item) => {
          const dish = dishById[item.id];
          if (!dish) return null;
          const modifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
          const modifiersTotal = modifiers.reduce((sum, modifier) => sum + Number(modifier?.price || 0), 0);
          return {
            ...dish,
            cartItemId: item.cartItemId || item.id,
            quantity: item.quantity,
            modifiers,
            effectiveUnitPrice: Number(dish.price || 0) + modifiersTotal,
          };
        })
        .filter(Boolean),
    [cartItems, dishById]
  );
  const total = useMemo(() => calculateCartTotal(cartItems, dishes), [cartItems, dishes]);
  const showLoyaltyIntegrations = runtimeConfig.integratedBackend === 'syncflow' || runtimeConfig.useMockApi;
  const showPromoInput = true;
  const [promoInput, setPromoInput] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [orderType, setOrderType] = useState('booking');
  const [usePoints, setUsePoints] = useState(false);
  const [pointsInput, setPointsInput] = useState('');
  const breakdown = useMemo(
    () =>
      buildCartPayableBreakdown({
        cartItems,
        dishes,
        appliedPromo,
        usePoints,
        pointsToSpendRaw: pointsInput,
        loyaltyPoints,
        guestDiscountPercentage,
      }),
    [cartItems, dishes, appliedPromo, usePoints, pointsInput, loyaltyPoints, guestDiscountPercentage]
  );
  const { promoRub, guestDiscountRub, maxPointsAllowed, pointsDiscountRub, payable } = breakdown;
  const recommended = useMemo(() => {
    const ids = new Set(cartData.flatMap((item) => item.recommendedWith || []));
    return dishes.filter((dish) => ids.has(dish.id) && !cartItems.some((row) => row.id === dish.id)).slice(0, 4);
  }, [cartData, dishes, cartItems]);

  const handleCheckout = useCallback(async () => {
    const requestedPointsRaw = Number(pointsInput.replace(/\D/g, '') || 0);
    if (usePoints && requestedPointsRaw > maxPointsAllowed) {
      onValidationError?.(`Можно списать максимум ${maxPointsAllowed} баллов.`);
      return;
    }
    if (usePoints && pointsDiscountRub <= 0) {
      onValidationError?.('Введите количество баллов для списания.');
      return;
    }

    await onCheckout({
      orderType,
      deliveryAddress: '',
      deliveryDetails: null,
      pickupAddress: orderType === 'pickup' ? DEFAULT_VENUE_LABEL : '',
      useLoyaltyPoints: usePoints,
      pointsToSpend: pointsDiscountRub,
      appliedPromo,
      promoDiscountRub: promoRub,
    });
  }, [pointsInput, usePoints, maxPointsAllowed, pointsDiscountRub, onCheckout, orderType, appliedPromo, promoRub, onValidationError]);

  const handleApplyPromo = useCallback(async () => {
    if (!onApplyPromo || !showPromoInput) return;
    try {
      setPromoBusy(true);
      await onApplyPromo(promoInput);
      onPromoMessage?.('success', 'Промокод применён');
      setPromoInput('');
    } catch (e) {
      onPromoMessage?.('error', e?.message || 'Промокод не применён');
    } finally {
      setPromoBusy(false);
    }
  }, [onApplyPromo, promoInput, onPromoMessage, showPromoInput]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <BrandHeaderAccent kicker="ЗАКАЗ" />
        <Text style={[styles.title, { color: colors.text }]}>Корзина</Text>
      </View>
      <CartItemsList styles={styles} colors={colors} cartData={cartData} onChangeQty={onChangeQty} />
      <CartFooterSection
        styles={styles}
        colors={colors}
        isWide={isWide}
        isCompact={isCompact}
        total={total}
        orderType={orderType}
        setOrderType={setOrderType}
        showPromoInput={showPromoInput}
        promoInput={promoInput}
        setPromoInput={setPromoInput}
        promoBusy={promoBusy}
        handleApplyPromo={handleApplyPromo}
        appliedPromo={appliedPromo}
        onClearPromo={onClearPromo}
        usePoints={usePoints}
        setUsePoints={setUsePoints}
        pointsInput={pointsInput}
        setPointsInput={setPointsInput}
        maxPointsAllowed={maxPointsAllowed}
        loyaltyPoints={loyaltyPoints}
        showLoyaltyIntegrations={showLoyaltyIntegrations}
          promoRub={promoRub}
          guestDiscountRub={guestDiscountRub}
          guestDiscountPercentage={guestDiscountPercentage}
          pointsDiscountRub={pointsDiscountRub}
          payable={payable}
        recommended={recommended}
        onAddToCart={onAddToCart}
        cartItemsLength={cartItems.length}
        handleCheckout={handleCheckout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.h2 },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
  item: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: '#DDE3EA',
  },
  center: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.bodyLarge, fontWeight: '600' },
  price: { ...typography.caption },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  control: { fontSize: 24, fontWeight: '700' },
  qty: { ...typography.body, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: '62%',
  },
  footerScroll: {
    flexGrow: 0,
  },
  footerScrollContent: {
    paddingBottom: spacing.md,
  },
  footerWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  total: { ...typography.h4 },
  button: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: { ...typography.button, fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  typeRowCompact: { flexWrap: 'wrap' },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  chipCompact: { paddingHorizontal: 10, minHeight: 32 },
  pointsRow: { marginTop: spacing.sm, gap: spacing.sm },
  pointsToggle: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pointsInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pointsHint: { ...typography.caption },
  summaryCard: {
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { ...typography.caption },
  summaryValue: { ...typography.caption, fontWeight: '700' },
  summaryTotalRow: { marginTop: spacing.xs, paddingTop: spacing.xs },
  summaryTotalLabel: { ...typography.body, fontWeight: '700' },
  summaryTotalValue: { ...typography.bodyLarge, fontWeight: '700' },
  recoBlock: { marginTop: spacing.sm, gap: spacing.xs },
  recoTitle: { ...typography.body, fontWeight: '700' },
  recoRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recoName: { ...typography.caption, flex: 1, marginRight: spacing.sm },
  recoBtn: { borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  promoBlock: { marginTop: spacing.sm, gap: spacing.xs },
  promoTitle: { ...typography.body, fontWeight: '700' },
  promoHint: { ...typography.caption },
  promoRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  promoInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  promoBtn: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  appliedPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
});

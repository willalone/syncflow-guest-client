import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, getColors, getShadows, layout, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { buildCartPayableBreakdown, calculateCartTotal } from '../utils/cart';
import { runtimeConfig } from '../config/runtimeConfig';
import ScreenBackdrop from '../components/ScreenBackdrop';
import { DEFAULT_VENUE_LABEL } from '../constants/venue';
import CheckoutFooterSection from './cart/CheckoutFooterSection';

export default function CheckoutScreen({
  onBack,
  cartItems,
  dishes = [],
  onCheckout,
  onAddToCart,
  onValidationError,
  onPromoMessage,
  loyaltyPoints = 0,
  guestDiscountPercentage,
  appliedPromo = null,
  onApplyPromo,
  onClearPromo,
  networkOffline = false,
}) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
  const showLoyaltyIntegrations = runtimeConfig.integratedBackend === 'syncflow' || runtimeConfig.useMockApi;
  const [promoInput, setPromoInput] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [orderType, setOrderType] = useState('pickup');
  const [usePoints, setUsePoints] = useState(false);
  const [pointsInput, setPointsInput] = useState('');

  const total = useMemo(() => calculateCartTotal(cartItems, dishes), [cartItems, dishes]);
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

  const dishById = useMemo(
    () =>
      dishes.reduce((acc, dish) => {
        acc[dish.id] = dish;
        return acc;
      }, {}),
    [dishes]
  );
  const recommended = useMemo(() => {
    const cartData = cartItems
      .map((item) => dishById[item.id])
      .filter(Boolean);
    const ids = new Set(cartData.flatMap((item) => item.recommendedWith || []));
    return dishes.filter((dish) => ids.has(dish.id) && !cartItems.some((row) => row.id === dish.id)).slice(0, 4);
  }, [cartItems, dishes, dishById]);

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
  }, [
    pointsInput,
    usePoints,
    maxPointsAllowed,
    pointsDiscountRub,
    onCheckout,
    orderType,
    appliedPromo,
    promoRub,
    onValidationError,
  ]);

  const handleApplyPromo = useCallback(async () => {
    if (!onApplyPromo) return;
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
  }, [onApplyPromo, promoInput, onPromoMessage]);

  return (
    <ScreenBackdrop isDarkMode={isDarkMode}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.cardElevated }]} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={[styles.kicker, { color: colors.textMuted }]}>ОФОРМЛЕНИЕ</Text>
            <Text style={[styles.title, { color: colors.text }]}>Оплата</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <CheckoutFooterSection
            embedded
            styles={checkoutStyles}
            colors={colors}
            shadows={shadowsThemed}
            total={total}
            orderType={orderType}
            setOrderType={setOrderType}
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
            checkoutDisabled={networkOffline}
          />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const checkoutStyles = StyleSheet.create({
  section: { gap: spacing.sm, marginBottom: spacing.md },
  total: { ...typography.h4 },
  typeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: layout.chipHeight - 4,
    justifyContent: 'center',
  },
  promoBlock: { gap: spacing.xs },
  promoTitle: { ...typography.body, fontWeight: '700' },
  promoHint: { ...typography.caption },
  promoRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  promoInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  promoBtn: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  appliedPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  pointsRow: { gap: spacing.sm },
  pointsToggle: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pointsInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pointsHint: { ...typography.caption },
  summaryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { ...typography.caption },
  summaryValue: { ...typography.caption, fontWeight: '700' },
  summaryTotalRow: { marginTop: spacing.xs, paddingTop: spacing.xs },
  summaryTotalLabel: { ...typography.body, fontWeight: '700' },
  summaryTotalValue: { ...typography.bodyLarge, fontWeight: '700' },
  recoBlock: { gap: spacing.xs },
  recoTitle: { ...typography.body, fontWeight: '700' },
  recoRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recoName: { ...typography.caption, flex: 1, marginRight: spacing.sm },
  recoBtn: { borderRadius: borderRadius.pill, paddingHorizontal: spacing.md, paddingVertical: 8 },
  button: {
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { ...typography.button, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: { flex: 1, gap: 2 },
  kicker: { ...typography.kicker },
  title: { ...typography.h2, letterSpacing: -0.4 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing['2xl'],
  },
});

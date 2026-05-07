import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, getColors, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { buildCartPayableBreakdown, calculateCartTotal } from '../utils/cart';
import { runtimeConfig } from '../config/runtimeConfig';
import DishImage from '../components/DishImage';
import BrandHeaderAccent from '../components/BrandHeaderAccent';
import { DEFAULT_VENUE_LABEL } from '../constants/venue';

export default function CartScreen({
  cartItems,
  dishes = [],
  onChangeQty,
  onCheckout,
  onAddToCart,
  onValidationError,
  onPromoMessage,
  loyaltyPoints = 0,
  appliedPromo = null,
  onApplyPromo,
  onClearPromo,
}) {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const colors = getColors(isDarkMode);
  const isWide = width >= 768;
  const isCompact = width < 380;
  const cartData = cartItems
    .map((item) => {
      const dish = dishes.find((d) => d.id === item.id);
      return dish ? { ...dish, quantity: item.quantity } : null;
    })
    .filter(Boolean);
  const total = calculateCartTotal(cartItems, dishes);
  const showLoyaltyIntegrations = runtimeConfig.integratedBackend === 'syncflow' || runtimeConfig.useMockApi;
  const [promoInput, setPromoInput] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [orderType, setOrderType] = useState('booking');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryHouse, setDeliveryHouse] = useState('');
  const [deliveryEntrance, setDeliveryEntrance] = useState('');
  const [deliveryIntercom, setDeliveryIntercom] = useState('');
  const [deliveryApartment, setDeliveryApartment] = useState('');
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
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
      }),
    [cartItems, dishes, appliedPromo, usePoints, pointsInput, loyaltyPoints]
  );
  const { promoRub, maxPointsAllowed, pointsDiscountRub, payable } = breakdown;
  const recommended = useMemo(() => {
    const ids = new Set(cartData.flatMap((item) => item.recommendedWith || []));
    return dishes.filter((dish) => ids.has(dish.id) && !cartItems.some((row) => row.id === dish.id)).slice(0, 4);
  }, [cartData, dishes, cartItems]);

  const handleCheckout = async () => {
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      onValidationError?.('Укажите адрес доставки.');
      return;
    }
    if (orderType === 'delivery' && !deliveryCity.trim()) {
      onValidationError?.('Укажите город доставки.');
      return;
    }
    if (orderType === 'delivery' && !deliveryHouse.trim()) {
      onValidationError?.('Укажите дом для доставки.');
      return;
    }
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
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : '',
      deliveryDetails:
        orderType === 'delivery'
          ? {
              city: deliveryCity.trim(),
              addressLine: deliveryAddress.trim(),
              house: deliveryHouse.trim(),
              entrance: deliveryEntrance.trim(),
              intercom: deliveryIntercom.trim(),
              apartment: deliveryApartment.trim(),
              leaveAtDoor: Boolean(leaveAtDoor),
            }
          : null,
      pickupAddress: orderType === 'pickup' ? DEFAULT_VENUE_LABEL : '',
      useLoyaltyPoints: usePoints,
      pointsToSpend: pointsDiscountRub,
      appliedPromo,
      promoDiscountRub: promoRub,
    });
  };

  const handleApplyPromo = async () => {
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
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <BrandHeaderAccent kicker="ЗАКАЗ" />
        <Text style={[styles.title, { color: colors.text }]}>Корзина</Text>
      </View>
      <FlatList
        data={cartData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: spacing['2xl'] }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Корзина пуста</Text>}
        renderItem={({ item }) => (
          <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <DishImage uri={item.imageUrl} title={item.title} style={styles.image} borderRadius={borderRadius.md} />
            <View style={styles.center}>
              <Text style={[styles.name, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.price, { color: colors.textLight }]}>{item.price} руб</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity onPress={() => onChangeQty(item.id, -1)}>
                <Text style={[styles.control, { color: colors.text }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.qty, { color: colors.text }]}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => onChangeQty(item.id, 1)}>
                <Text style={[styles.control, { color: colors.text }]}>＋</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View
        style={[
          styles.footer,
          isWide ? styles.footerWide : null,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <ScrollView
          style={styles.footerScroll}
          contentContainerStyle={styles.footerScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.total, { color: colors.text }]}>Итого: {total} руб.</Text>
          <View style={[styles.typeRow, isCompact ? styles.typeRowCompact : null]}>
            {[
              { id: 'booking', label: 'Бронь' },
              { id: 'pickup', label: 'Самовывоз' },
              { id: 'delivery', label: 'Доставка' },
            ].map((type) => (
              <TouchableOpacity
                key={type.id}
                onPress={() => setOrderType(type.id)}
                style={[
                  styles.chip,
                  isCompact ? styles.chipCompact : null,
                  {
                    borderColor: colors.border,
                    backgroundColor: orderType === type.id ? colors.primary : colors.background,
                  },
                ]}
              >
                <Text numberOfLines={1} style={{ color: orderType === type.id ? colors.black : colors.text, fontSize: isCompact ? 12 : 14 }}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {orderType === 'delivery' ? (
            <View style={styles.deliveryWrap}>
              <TextInput
                value={deliveryCity}
                onChangeText={setDeliveryCity}
                placeholder="Город"
                placeholderTextColor={colors.textMuted}
                style={[styles.addressInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              />
              <TextInput
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Улица"
                placeholderTextColor={colors.textMuted}
                style={[styles.addressInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              />
              <TextInput
                value={deliveryHouse}
                onChangeText={setDeliveryHouse}
                placeholder="Дом"
                placeholderTextColor={colors.textMuted}
                style={[styles.addressInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              />
              <TextInput
                value={deliveryEntrance}
                onChangeText={setDeliveryEntrance}
                placeholder="Подъезд"
                placeholderTextColor={colors.textMuted}
                style={[styles.addressInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              />
              <TextInput
                value={deliveryIntercom}
                onChangeText={setDeliveryIntercom}
                placeholder="Домофон"
                placeholderTextColor={colors.textMuted}
                style={[styles.addressInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              />
              <TextInput
                value={deliveryApartment}
                onChangeText={setDeliveryApartment}
                placeholder="Квартира"
                placeholderTextColor={colors.textMuted}
                style={[styles.addressInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              />
              <TouchableOpacity
                onPress={() => setLeaveAtDoor((prev) => !prev)}
                style={[styles.pointsToggle, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <Text style={{ color: colors.text }}>
                  {leaveAtDoor ? 'Оставить у двери: да' : 'Оставить у двери: нет'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {showLoyaltyIntegrations ? (
            <View style={styles.promoBlock}>
              <Text style={[styles.promoTitle, { color: colors.text }]}>Промокод</Text>
              <Text style={[styles.promoHint, { color: colors.textMuted }]}>
                После применения промокода скидка отобразится в блоке «Итого» ниже.
              </Text>
              <View style={styles.promoRow}>
                <TextInput
                  value={promoInput}
                  onChangeText={setPromoInput}
                  placeholder="Код"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  style={[
                    styles.promoInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
                  ]}
                />
                <TouchableOpacity
                  onPress={handleApplyPromo}
                  disabled={promoBusy || !promoInput.trim()}
                  style={[
                    styles.promoBtn,
                    { backgroundColor: promoBusy || !promoInput.trim() ? colors.textMuted : colors.primary },
                  ]}
                >
                  <Text style={{ color: colors.black, fontWeight: '700' }}>{promoBusy ? '…' : 'Применить'}</Text>
                </TouchableOpacity>
              </View>
              {appliedPromo ? (
                <View style={[styles.appliedPromo, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.text, flex: 1 }}>
                    {appliedPromo.code}: {appliedPromo.isPercentage ? `${appliedPromo.discountValue}%` : `${appliedPromo.discountValue} руб.`}
                  </Text>
                  <TouchableOpacity onPress={() => onClearPromo?.()}>
                    <Text style={{ color: colors.error, fontWeight: '600' }}>Сбросить</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={styles.pointsRow}>
            <TouchableOpacity
              onPress={() => setUsePoints((prev) => !prev)}
              style={[styles.pointsToggle, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <Text style={{ color: colors.text }}>
                {usePoints ? 'Списание баллов: включено' : 'Списание баллов: выключено'}
              </Text>
            </TouchableOpacity>
            {usePoints ? (
              <TextInput
                value={String(pointsInput)}
                onChangeText={setPointsInput}
                keyboardType="numeric"
                placeholder={`до ${maxPointsAllowed}`}
                placeholderTextColor={colors.textMuted}
                style={[styles.pointsInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              />
            ) : null}
            <Text style={[styles.pointsHint, { color: colors.textLight }]}>
              Доступно: {loyaltyPoints} • Максимум к списанию: {maxPointsAllowed}
            </Text>
            {showLoyaltyIntegrations ? (
              <Text style={[styles.pointsHint, { color: colors.textMuted, marginTop: spacing.xs }]}>
                После нажатия «Оформить заказ» баллы спишутся автоматически — номер заказа указывать не нужно.
              </Text>
            ) : null}
          </View>
          <View style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Сумма заказа</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{total} руб.</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Промокод</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>−{promoRub.toFixed(2)} руб.</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Списание баллов</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {usePoints ? `${pointsDiscountRub} баллов` : 'Не используется'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Скидка баллами</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>−{pointsDiscountRub.toFixed(2)} руб.</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={[styles.summaryTotalLabel, { color: colors.text }]}>К оплате</Text>
              <Text style={[styles.summaryTotalValue, { color: colors.text }]}>{payable.toFixed(2)} руб.</Text>
            </View>
          </View>
          {recommended.length ? (
            <View style={styles.recoBlock}>
              <Text style={[styles.recoTitle, { color: colors.text }]}>Рекомендуем к заказу</Text>
              {recommended.map((item) => (
                <View key={item.id} style={[styles.recoRow, { borderColor: colors.border }]}>
                  <Text style={[styles.recoName, { color: colors.text }]}>{item.title}</Text>
                  <TouchableOpacity
                    onPress={() => onAddToCart?.(item.id, 1)}
                    style={[styles.recoBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={{ color: colors.black }}>Добавить</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
          <TouchableOpacity
            onPress={handleCheckout}
            disabled={!cartItems.length}
            style={[
              styles.button,
              {
                backgroundColor: cartItems.length ? colors.primary : colors.textMuted,
                borderColor: colors.border,
                borderWidth: StyleSheet.hairlineWidth,
                opacity: cartItems.length ? 1 : 0.85,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: cartItems.length ? colors.black : colors.white }]}>Оформить заказ</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
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
  addressInput: {
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pointsRow: { marginTop: spacing.sm, gap: spacing.sm },
  deliveryWrap: { marginTop: spacing.sm, gap: spacing.xs },
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

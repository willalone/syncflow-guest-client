import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import GlassCard from '../../components/ui/GlassCard';

/**
 * Форма оформления заказа (промокод, баллы, итог, оплата).
 * На экране Checkout — внутри ScrollView; embedded без внешней обёртки футера.
 */
export default function CheckoutFooterSection({
  embedded = false,
  styles,
  colors,
  shadows,
  total,
  orderType,
  setOrderType,
  promoInput,
  setPromoInput,
  promoBusy,
  handleApplyPromo,
  appliedPromo,
  onClearPromo,
  usePoints,
  setUsePoints,
  pointsInput,
  setPointsInput,
  maxPointsAllowed,
  loyaltyPoints,
  showLoyaltyIntegrations,
  promoRub,
  guestDiscountRub = 0,
  guestDiscountPercentage,
  pointsDiscountRub,
  payable,
  recommended,
  onAddToCart,
  cartItemsLength,
  handleCheckout,
  checkoutDisabled = false,
}) {
  const canSubmit = cartItemsLength > 0 && !checkoutDisabled;

  const content = (
    <>
      <Text style={[styles.total, { color: colors.text }]}>Сумма заказа: {total} руб.</Text>
      {Number(guestDiscountPercentage) > 0 ? (
        <Text style={[styles.promoHint, { color: colors.textMuted }]}>
          Персональная скидка {Number(guestDiscountPercentage)}% учтена в расчёте ниже.
        </Text>
      ) : null}

      <Text style={[styles.promoTitle, { color: colors.text, marginTop: 8 }]}>Способ получения</Text>
      <View style={styles.typeRow}>
        {[
          { id: 'pickup', label: 'Самовывоз' },
          { id: 'booking', label: 'С бронью' },
        ].map((type) => (
          <TouchableOpacity
            key={type.id}
            onPress={() => setOrderType(type.id)}
            style={[
              styles.chip,
              {
                borderColor: orderType === type.id ? colors.primaryDark : colors.hairline,
                backgroundColor: orderType === type.id ? colors.primary : colors.cardElevated,
              },
            ]}
          >
            <Text style={{ color: orderType === type.id ? colors.black : colors.text, fontWeight: '600' }}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.promoBlock}>
        <Text style={[styles.promoTitle, { color: colors.text }]}>Промокод</Text>
        <View style={styles.promoRow}>
          <TextInput
            value={promoInput}
            onChangeText={setPromoInput}
            placeholder="Код"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            style={[styles.promoInput, { borderColor: colors.hairline, color: colors.text, backgroundColor: colors.cardElevated }]}
          />
          <TouchableOpacity
            onPress={handleApplyPromo}
            disabled={promoBusy || !promoInput.trim()}
            style={[styles.promoBtn, { backgroundColor: promoBusy || !promoInput.trim() ? colors.textMuted : colors.primary }]}
          >
            <Text style={{ color: colors.black, fontWeight: '700' }}>{promoBusy ? '…' : 'Применить'}</Text>
          </TouchableOpacity>
        </View>
        {appliedPromo ? (
          <View style={[styles.appliedPromo, { borderColor: colors.hairline }]}>
            <Text style={{ color: colors.text, flex: 1 }}>
              {appliedPromo.code}: {appliedPromo.isPercentage ? `${appliedPromo.discountValue}%` : `${appliedPromo.discountValue} руб.`}
            </Text>
            <TouchableOpacity onPress={() => onClearPromo?.()}>
              <Text style={{ color: colors.error, fontWeight: '600' }}>Сбросить</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={styles.pointsRow}>
        <TouchableOpacity
          onPress={() => setUsePoints((prev) => !prev)}
          style={[styles.pointsToggle, { borderColor: colors.hairline, backgroundColor: colors.cardElevated }]}
        >
          <Text style={{ color: colors.text }}>{usePoints ? 'Списать бонусы: да' : 'Списать бонусы: нет'}</Text>
        </TouchableOpacity>
        {usePoints ? (
          <TextInput
            value={String(pointsInput)}
            onChangeText={setPointsInput}
            keyboardType="numeric"
            placeholder={`до ${maxPointsAllowed}`}
            placeholderTextColor={colors.textMuted}
            style={[styles.pointsInput, { borderColor: colors.hairline, color: colors.text, backgroundColor: colors.cardElevated }]}
          />
        ) : null}
        <Text style={[styles.pointsHint, { color: colors.textLight }]}>
          Доступно: {loyaltyPoints} • Макс. к списанию: {maxPointsAllowed}
        </Text>
        {showLoyaltyIntegrations ? (
          <Text style={[styles.pointsHint, { color: colors.textMuted }]}>Баллы спишутся при оформлении заказа.</Text>
        ) : null}
      </View>

      <GlassCard mode="frosted" shadows={shadows} radius={20} style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Промокод</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>−{promoRub.toFixed(2)} ₽</Text>
        </View>
        {guestDiscountRub > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textLight }]}>
              Персональная скидка{guestDiscountPercentage != null ? ` (${guestDiscountPercentage}%)` : ''}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>−{guestDiscountRub.toFixed(2)} ₽</Text>
          </View>
        ) : null}
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Скидка баллами</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>−{pointsDiscountRub.toFixed(2)} ₽</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={[styles.summaryTotalLabel, { color: colors.text }]}>К оплате</Text>
          <Text style={[styles.summaryTotalValue, { color: colors.text }]}>{payable.toFixed(2)} ₽</Text>
        </View>
      </GlassCard>

      {recommended.length ? (
        <View style={styles.recoBlock}>
          <Text style={[styles.recoTitle, { color: colors.text }]}>Рекомендуем к заказу</Text>
          {recommended.map((item) => (
            <View key={item.id} style={[styles.recoRow, { borderColor: colors.hairline, backgroundColor: colors.cardElevated }]}>
              <Text style={[styles.recoName, { color: colors.text }]}>{item.title}</Text>
              <TouchableOpacity
                onPress={() => onAddToCart?.(item.id, 1)}
                style={[styles.recoBtn, { backgroundColor: colors.primary }, shadows?.accentGlow]}
              >
                <Text style={{ color: colors.black, fontWeight: '700' }}>+</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        onPress={handleCheckout}
        disabled={!canSubmit}
        style={[
          styles.button,
          { backgroundColor: canSubmit ? colors.primary : colors.textMuted },
          canSubmit ? shadows?.accentGlow : null,
        ]}
      >
        <Text style={[styles.buttonText, { color: canSubmit ? colors.black : colors.white }]}>
          {checkoutDisabled ? 'Нет сети' : orderType === 'booking' ? 'Перейти к бронированию' : 'Оформить и оплатить'}
        </Text>
      </TouchableOpacity>
    </>
  );

  if (embedded) {
    return <View style={styles.section}>{content}</View>;
  }

  return <View style={styles.section}>{content}</View>;
}

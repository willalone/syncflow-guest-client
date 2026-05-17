import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { spacing } from '../../constants/theme';

export default function CartFooterSection({
  styles,
  colors,
  isWide,
  isCompact,
  total,
  orderType,
  setOrderType,
  showPromoInput,
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
}) {
  return (
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
        {Number(guestDiscountPercentage) > 0 ? (
          <Text style={[styles.promoHint, { color: colors.textMuted, marginBottom: spacing.sm }]}>
            Персональная скидка {Number(guestDiscountPercentage)}% — в расчёте «К оплате» после промокода.
          </Text>
        ) : null}
        <View style={[styles.typeRow, isCompact ? styles.typeRowCompact : null]}>
          {[
            { id: 'booking', label: 'Бронь' },
            { id: 'pickup', label: 'Самовывоз' },
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
        {showPromoInput ? (
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
                style={[styles.promoInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
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
            <Text style={{ color: colors.text }}>{usePoints ? 'Списание баллов: включено' : 'Списание баллов: выключено'}</Text>
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
          {guestDiscountRub > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textLight }]}>
                Персональная скидка{guestDiscountPercentage != null ? ` (${guestDiscountPercentage}%)` : ''}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>−{guestDiscountRub.toFixed(2)} руб.</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textLight }]}>Списание баллов</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{usePoints ? `${pointsDiscountRub} баллов` : 'Не используется'}</Text>
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
                <TouchableOpacity onPress={() => onAddToCart?.(item.id, 1)} style={[styles.recoBtn, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: colors.black }}>Добавить</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
        <TouchableOpacity
          onPress={handleCheckout}
          disabled={!cartItemsLength}
          style={[
            styles.button,
            {
              backgroundColor: cartItemsLength ? colors.primary : colors.textMuted,
              borderColor: colors.border,
              borderWidth: StyleSheet.hairlineWidth,
              opacity: cartItemsLength ? 1 : 0.85,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: cartItemsLength ? colors.black : colors.white }]}>Оформить заказ</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}


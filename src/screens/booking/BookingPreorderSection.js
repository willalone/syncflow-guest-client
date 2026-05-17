import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export default function BookingPreorderSection({
  styles,
  colors,
  cartPreview,
  preorderMenuContext,
  onGoToMenuForPreorder,
  onChangeCartQty,
  preorderTotal,
}) {
  return (
    <>
      <Text style={[styles.subtitle, { color: colors.text }]}>Предзаказ к визиту</Text>
      <Text style={[styles.preorderHint, { color: colors.textLight }]}>
        Выберите блюда в корзине до нажатия «Подтвердить»: они будут сохранены в брони и оформлены заказом на выбранное время подачи.
      </Text>
      {!cartPreview.length ? (
        onGoToMenuForPreorder ? (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => onGoToMenuForPreorder?.(preorderMenuContext)}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Добавить блюда из меню</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.preorderHint, { color: colors.textMuted }]}>
            Корзина пуста — добавьте блюда через меню, затем вернитесь к брони.
          </Text>
        )
      ) : (
        <View style={[styles.preorderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {cartPreview.map((row) => (
            <View key={row.id} style={styles.preorderLine}>
              <Text style={[styles.preorderLineText, { color: colors.text }]} numberOfLines={2}>
                {row.title} × {row.qty}
              </Text>
              {row.modifiers?.length ? (
                <Text style={[styles.preorderLinePrice, { color: colors.textMuted, minWidth: 120, textAlign: 'left' }]}>
                  + {row.modifiers.map((m) => m.name).join(', ')}
                </Text>
              ) : null}
              <Text style={[styles.preorderLinePrice, { color: colors.primaryDark || colors.primary }]}>{row.lineTotal} руб</Text>
              {onChangeCartQty ? (
                <View style={styles.preorderQty}>
                  <TouchableOpacity onPress={() => onChangeCartQty(row.id, -1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={[styles.preorderQtyBtn, { color: colors.text }]}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onChangeCartQty(row.id, 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={[styles.preorderQtyBtn, { color: colors.text }]}>＋</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))}
          <Text style={[styles.preorderTotal, { color: colors.text }]}>Сумма предзаказа: {preorderTotal} руб</Text>
        </View>
      )}
    </>
  );
}

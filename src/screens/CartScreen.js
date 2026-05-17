import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors, getShadows, layout, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { calculateCartTotal } from '../utils/cart';
import ScreenBackdrop from '../components/ScreenBackdrop';
import CartItemsList from './cart/CartItemsList';
import CartSimpleFooter from './cart/CartSimpleFooter';

export default function CartScreen({
  cartItems,
  dishes = [],
  onChangeQty,
  onProceedToCheckout,
  networkOffline = false,
}) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);

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
  const itemCount = useMemo(
    () => cartItems.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
    [cartItems]
  );

  return (
    <ScreenBackdrop isDarkMode={isDarkMode}>
      <SafeAreaView style={styles.container}>
        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>ЗАКАЗ</Text>
          <Text style={[styles.title, { color: colors.text }]}>Корзина</Text>
        </View>
        <View style={styles.body}>
          <CartItemsList
            styles={styles}
            colors={colors}
            shadows={shadowsThemed}
            cartData={cartData}
            onChangeQty={onChangeQty}
          />
        </View>
        <CartSimpleFooter
          total={total}
          itemCount={itemCount}
          onProceedToCheckout={onProceedToCheckout}
          disabled={networkOffline}
        />
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  body: { flex: 1 },
  hero: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  kicker: { ...typography.kicker },
  title: { ...typography.h1, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  listFlex: { flex: 1 },
  list: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.sm, gap: spacing.md },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
  itemGlass: { marginBottom: 0 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  image: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  center: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.bodyLarge, fontWeight: '600' },
  price: { ...typography.caption },
  unitPrice: { ...typography.numeric, fontSize: 15 },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  control: { fontSize: 24, fontWeight: '700' },
  qty: { ...typography.body, fontWeight: '700', minWidth: 20, textAlign: 'center' },
});

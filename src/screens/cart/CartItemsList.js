import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, spacing } from '../../constants/theme';
import DishImage from '../../components/DishImage';

export default function CartItemsList({ styles, colors, cartData, onChangeQty }) {
  return (
    <FlatList
      data={cartData}
      keyExtractor={(item) => String(item.cartItemId || item.id)}
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
            {item.modifiers?.length ? (
              <Text style={[styles.price, { color: colors.textMuted }]}>
                + {item.modifiers.map((m) => m.name).join(', ')}
              </Text>
            ) : null}
            <Text style={[styles.price, { color: colors.primaryDark || colors.primary }]}>{item.effectiveUnitPrice} руб</Text>
          </View>
          <View style={styles.counter}>
            <TouchableOpacity onPress={() => onChangeQty(item.cartItemId || item.id, -1)}>
              <Text style={[styles.control, { color: colors.text }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.qty, { color: colors.text }]}>{item.quantity}</Text>
            <TouchableOpacity onPress={() => onChangeQty(item.cartItemId || item.id, 1)}>
              <Text style={[styles.control, { color: colors.text }]}>＋</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

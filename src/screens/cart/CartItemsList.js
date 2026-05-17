import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, spacing } from '../../constants/theme';
import DishImage from '../../components/DishImage';
import GlassCard from '../../components/ui/GlassCard';

export default function CartItemsList({ styles, colors, shadows, cartData, onChangeQty }) {
  return (
    <FlatList
      style={styles.listFlex}
      data={cartData}
      keyExtractor={(item) => String(item.cartItemId || item.id)}
      contentContainerStyle={[styles.list, { paddingBottom: spacing.md }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Корзина пуста</Text>}
      renderItem={({ item }) => (
        <GlassCard mode="frosted" shadows={shadows} radius={borderRadius['2xl']} style={styles.itemGlass}>
          <View style={styles.itemRow}>
            <DishImage uri={item.imageUrl} title={item.title} style={styles.image} borderRadius={borderRadius.lg} />
            <View style={styles.center}>
              <Text style={[styles.name, { color: colors.text }]}>{item.title}</Text>
              {item.modifiers?.length ? (
                <Text style={[styles.price, { color: colors.textMuted }]}>
                  + {item.modifiers.map((m) => m.name).join(', ')}
                </Text>
              ) : null}
              <Text style={[styles.unitPrice, { color: colors.primaryDark }]}>{item.effectiveUnitPrice} ₽</Text>
            </View>
            <View style={[styles.counter, { borderColor: colors.hairline, backgroundColor: colors.cardElevated }]}>
              <TouchableOpacity onPress={() => onChangeQty(item.cartItemId || item.id, -1)} hitSlop={8}>
                <Text style={[styles.control, { color: colors.text }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.qty, { color: colors.text }]}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => onChangeQty(item.cartItemId || item.id, 1)} hitSlop={8}>
                <Ionicons name="add" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>
      )}
    />
  );
}

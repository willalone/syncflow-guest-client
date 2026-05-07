import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '../constants/theme';
import DishImage from './DishImage';
import GradientBorderCard from './GradientBorderCard';
import { getRoleBadge, getRoleColor, getRoleLabel } from '../utils/dishBadges';

const CARD_OUTER_RADIUS = borderRadius.xl + 2;

export default function MenuDishCard({
  dish,
  colors,
  shadowsThemed,
  isCompact,
  isTablet,
  onPress,
  favorites = [],
  onToggleFavorite,
  showFavorite = true,
  priceSuffix = ' руб',
}) {
  const role = useMemo(() => getRoleBadge(dish), [dish]);
  const showHit = ['Локомотив', 'Премиум-якорь'].includes(role);

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.93}
        onPress={() => onPress(dish)}
        style={[
          styles.cardWrap,
          isTablet ? styles.cardWrapTablet : null,
          shadowsThemed.float,
          { borderRadius: CARD_OUTER_RADIUS },
        ]}
      >
        <GradientBorderCard
          colors={colors}
          innerStyle={[
            styles.cardInner,
            isCompact ? styles.cardInnerCompact : null,
            isTablet ? styles.cardInnerTablet : null,
          ]}
        >
          <View style={styles.imageWrap}>
            <DishImage
              uri={dish.imageUrl}
              title={dish.title}
              style={[styles.image, isCompact ? styles.imageCompact : null]}
              borderRadius={borderRadius.lg}
            />
            {showHit ? (
              <View
                style={[
                  styles.imageRoleBadge,
                  {
                    backgroundColor: `${getRoleColor(role)}DD`,
                    borderColor: 'transparent',
                  },
                ]}
              >
                <Text style={[styles.imageRoleText, { color: '#FFFFFF' }]}>{getRoleLabel(role)}</Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.content, isTablet ? styles.contentTablet : null]}>
            <View style={styles.nameRow}>
              <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.name, { color: colors.text }]}>
                {dish.title}
              </Text>
              {showFavorite ? (
                <TouchableOpacity onPress={() => onToggleFavorite?.(dish.id)} hitSlop={12}>
                  <Ionicons
                    name={favorites.includes(dish.id) ? 'heart' : 'heart-outline'}
                    size={18}
                    color={favorites.includes(dish.id) ? colors.error : colors.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
            {dish.weight ? (
              <Text numberOfLines={1} style={[styles.meta, { color: colors.textLight }]}>
                {dish.weight}
              </Text>
            ) : null}
            {dish.foodCostPercent ? (
              <Text numberOfLines={1} style={[styles.meta, { color: colors.textMuted }]}>
                Фудкост {dish.foodCostPercent}%
              </Text>
            ) : null}
            <View style={styles.footer}>
              <Text style={[styles.price, { color: colors.primaryDark }]}>
                {dish.price}
                {priceSuffix}
              </Text>
              {dish.rating != null ? (
                <View style={[styles.rate, { backgroundColor: colors.backgroundLight }]}>
                  <Text style={[styles.rateText, { color: colors.warning }]}>Рейтинг {dish.rating}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </GradientBorderCard>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    marginBottom: 10,
    borderRadius: CARD_OUTER_RADIUS,
  },
  cardWrapTablet: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: spacing.xs,
  },
  cardInner: {
    padding: spacing.md,
    flexDirection: 'row',
    minHeight: 136,
  },
  cardInnerCompact: {
    padding: spacing.sm,
    minHeight: 126,
  },
  cardInnerTablet: {
    flexDirection: 'column',
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.lg,
    backgroundColor: '#DDE3EA',
  },
  imageCompact: {
    width: 76,
    height: 76,
  },
  imageWrap: { position: 'relative' },
  imageRoleBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageRoleText: { ...typography.caption, fontSize: 8, fontWeight: '700' },
  content: { flex: 1, marginLeft: spacing.md, justifyContent: 'space-between' },
  contentTablet: { marginLeft: 0, marginTop: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.h4, flex: 1, marginRight: spacing.sm },
  meta: { ...typography.caption },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { ...typography.numeric },
  rate: { borderRadius: borderRadius.round, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  rateText: { ...typography.caption, fontWeight: '600' },
});

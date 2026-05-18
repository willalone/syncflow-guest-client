import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, layout, spacing, typography } from '../constants/theme';
import DishImage from './DishImage';
import SurfaceCard from './ui/SurfaceCard';
import CardDropShadow from './ui/CardDropShadow';
import { getRoleBadge, getRoleColor, getRoleLabel } from '../utils/dishBadges';

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
  priceSuffix = ' ₽',
}) {
  const role = useMemo(() => getRoleBadge(dish), [dish]);
  const showHit = ['Локомотив', 'Премиум-якорь'].includes(role);
  const imageSize = isCompact ? 80 : 96;

  return (
    <CardDropShadow
      radius={borderRadius['2xl']}
      backgroundColor={colors.card}
      style={isTablet ? styles.wrapTablet : styles.wrap}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(dish)}>
        <SurfaceCard
          colors={colors}
          shadows={shadowsThemed}
          radius={borderRadius['2xl']}
          elevated={false}
          style={[styles.card, { backgroundColor: colors.card }]}
        >
        <View style={[styles.row, isCompact ? styles.rowCompact : null]}>
          <View
            style={[
              styles.imageWrap,
              {
                width: imageSize,
                height: imageSize,
                backgroundColor: colors.cardElevated,
              },
            ]}
          >
            <DishImage
              uri={dish.imageUrl}
              title={dish.title}
              style={{ width: imageSize - 8, height: imageSize - 8, borderRadius: borderRadius.lg }}
              borderRadius={borderRadius.lg}
              contentFit="contain"
            />
            {showHit ? (
              <View style={[styles.imageRoleBadge, { backgroundColor: `${getRoleColor(role)}E6` }]}>
                <Text style={styles.imageRoleText}>{getRoleLabel(role)}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.content}>
            <View style={styles.nameRow}>
              <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.name, { color: colors.text }]}>
                {dish.title}
              </Text>
              {showFavorite ? (
                <TouchableOpacity onPress={() => onToggleFavorite?.(dish.id)} hitSlop={12}>
                  <Ionicons
                    name={favorites.includes(dish.id) ? 'heart' : 'heart-outline'}
                    size={20}
                    color={favorites.includes(dish.id) ? colors.error : colors.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
            {dish.weight ? (
              <Text numberOfLines={1} style={[styles.meta, { color: colors.textMuted }]}>
                {dish.weight}
              </Text>
            ) : dish.description ? (
              <Text numberOfLines={1} style={[styles.meta, { color: colors.textMuted }]}>
                {dish.description}
              </Text>
            ) : null}
            <View style={styles.footer}>
              <Text style={[styles.price, { color: colors.primaryDark }]}>
                {dish.price}
                {priceSuffix}
              </Text>
              <View style={[styles.addFab, { backgroundColor: colors.primary }, shadowsThemed?.accentGlow]}>
                <Ionicons name="add" size={22} color={colors.black} />
              </View>
            </View>
          </View>
        </View>
        </SurfaceCard>
      </TouchableOpacity>
    </CardDropShadow>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  wrapTablet: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  card: {
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowCompact: {
    gap: spacing.sm,
  },
  imageWrap: {
    position: 'relative',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageRoleBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  imageRoleText: {
    ...typography.caption,
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...typography.h4,
    flex: 1,
  },
  meta: {
    ...typography.caption,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  price: {
    ...typography.numeric,
    fontSize: 17,
  },
  addFab: {
    width: layout.fabSize,
    height: layout.fabSize,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

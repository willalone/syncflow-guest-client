import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { borderRadius, getShadows, spacing, typography } from '../../constants/theme';
import { hallTableLabel, shortTableLabel } from '../../utils/tableHallLayout';

/** Соотношение сторон карты под сетку 2×4. */
const FLOOR_ASPECT = 0.72;

function stateColors(state, colors, isDarkMode) {
  switch (state) {
    case 'selected':
      return {
        fill: colors.primary,
        border: colors.primaryDark,
        text: colors.black,
        borderWidth: 2,
      };
    case 'available':
      return {
        fill: isDarkMode ? colors.cardElevated : colors.card,
        border: colors.hairline,
        text: colors.text,
        borderWidth: StyleSheet.hairlineWidth,
      };
    case 'unsuitable':
      return {
        fill: colors.card,
        border: colors.warning,
        text: colors.textMuted,
        borderWidth: 1.5,
      };
    default:
      return {
        fill: isDarkMode ? 'rgba(42, 36, 54, 0.35)' : 'rgba(42, 28, 58, 0.06)',
        border: colors.border,
        text: colors.textMuted,
        borderWidth: StyleSheet.hairlineWidth,
      };
  }
}

function LegendDot({ color, borderColor, label, textColor }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color, borderColor: borderColor || color }]} />
      <Text style={[styles.legendLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function TableNode({ item, floorW, floorH, colors, isDarkMode, shadows, onSelect }) {
  const { layout, state } = item;
  const palette = stateColors(state, colors, isDarkMode);
  const disabled = state === 'busy' || state === 'unsuitable';
  const w = layout.w * floorW;
  const h = layout.h * floorH;
  const left = layout.x * floorW;
  const top = layout.y * floorH;
  const number = layout.hallNumber ?? '—';

  return (
    <Pressable
      onPress={() => !disabled && onSelect(item.id)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: state === 'selected', disabled }}
      accessibilityLabel={hallTableLabel(number)}
      style={({ pressed }) => [
        styles.tableNode,
        state === 'selected' ? shadows.medium : null,
        {
          left,
          top,
          width: w,
          height: h,
          backgroundColor: palette.fill,
          borderColor: palette.border,
          borderWidth: palette.borderWidth,
          opacity: disabled ? 0.42 : pressed && !disabled ? 0.9 : 1,
        },
      ]}
    >
      <Text style={[styles.tableNumber, { color: palette.text }]}>{number}</Text>
    </Pressable>
  );
}

export default function HallFloorPlan({
  items = [],
  selectedId,
  onSelect,
  colors,
  isDarkMode,
  loading = false,
  selectedDetail,
}) {
  const { width: screenW } = useWindowDimensions();
  const shadows = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
  const [floorSize, setFloorSize] = useState({ w: screenW - 32, h: Math.round((screenW - 32) / FLOOR_ASPECT) });

  const floorW = floorSize.w;
  const floorH = floorSize.h;

  const selectedItem = useMemo(
    () => items.find((t) => String(t.id) === String(selectedId)),
    [items, selectedId]
  );

  const selectedNumber = selectedItem?.layout?.hallNumber;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.floorCard,
          {
            backgroundColor: isDarkMode ? 'rgba(42, 36, 54, 0.45)' : 'rgba(250, 247, 252, 0.9)',
            borderColor: colors.border,
          },
        ]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setFloorSize({ w, h: Math.round(w / FLOOR_ASPECT) });
        }}
      >
        <View style={[styles.floorInner, { width: floorW, height: floorH }]}>
          <View style={[styles.markRow, { width: floorW }]}>
            <View style={styles.markCell}>
              <Text style={[styles.markWindows, { color: colors.error }]}>Окна</Text>
            </View>
            <View style={styles.markCell}>
              <Text style={[styles.markEntry, { color: colors.text }]}>Вход</Text>
            </View>
            <View style={styles.markCell}>
              <Text style={[styles.markWindows, { color: colors.error }]}>Окна</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingOverlay}>
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Загружаем схему…</Text>
            </View>
          ) : (
            items.map((item) => (
              <TableNode
                key={String(item.id)}
                item={item}
                floorW={floorW}
                floorH={floorH}
                colors={colors}
                isDarkMode={isDarkMode}
                shadows={shadows}
                onSelect={onSelect}
              />
            ))
          )}
        </View>
      </View>

      <View style={styles.legendRow}>
        <LegendDot color={colors.card} borderColor={colors.hairline} label="Свободен" textColor={colors.textLight} />
        <LegendDot
          color={isDarkMode ? 'rgba(42, 36, 54, 0.35)' : 'rgba(42, 28, 58, 0.06)'}
          borderColor={colors.border}
          label="Занят"
          textColor={colors.textLight}
        />
        <LegendDot color={colors.primary} borderColor={colors.primaryDark} label="Выбран" textColor={colors.textLight} />
      </View>

      {(selectedDetail || selectedItem) && (
        <View style={[styles.detailChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.detailTitle, { color: colors.text }]}>
            {selectedDetail?.title ||
              (selectedNumber ? hallTableLabel(selectedNumber) : shortTableLabel(selectedItem))}
          </Text>
          {selectedDetail?.meta ? (
            <Text style={[styles.detailMeta, { color: colors.textLight }]}>{selectedDetail.meta}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  floorCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius['2xl'],
    padding: spacing.sm,
    overflow: 'hidden',
  },
  floorInner: {
    position: 'relative',
    alignSelf: 'center',
  },
  markRow: {
    position: 'absolute',
    top: 4,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  markCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markEntry: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  markWindows: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tableNode: {
    position: 'absolute',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableNumber: {
    ...typography.h3,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: {
    width: 22,
    height: 14,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
  },
  legendLabel: { ...typography.caption },
  detailChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  detailTitle: { ...typography.body, fontWeight: '600' },
  detailMeta: { ...typography.caption },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { ...typography.caption },
});

import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import HallFloorPlan from '../../components/booking/HallFloorPlan';
import { mergeTableCatalog } from '../../utils/tableCatalog';
import { assignTablesToLayout, hallTableLabel } from '../../utils/tableHallLayout';

function buildHallItems({ allTables, availableTables, filteredTables, selected }) {
  const base = mergeTableCatalog(allTables, availableTables);
  const availableIds = new Set(availableTables.map((t) => String(t.id)));
  const selectableIds = new Set(filteredTables.map((t) => String(t.id)));
  const selectedKey = String(selected || '');

  return assignTablesToLayout(base).map((table) => {
    const id = String(table.id);
    let state = 'busy';
    if (selectableIds.has(id)) {
      state = selectedKey === id ? 'selected' : 'available';
    } else if (availableIds.has(id)) {
      state = 'unsuitable';
    }
    return { ...table, state };
  });
}

export default function BookingTablesSection({
  styles,
  colors,
  isDarkMode,
  filteredTables,
  availableTables,
  allTables = [],
  allTablesLoading = false,
  selected,
  setSelected,
}) {
  const hallItems = useMemo(
    () =>
      buildHallItems({
        allTables,
        availableTables: availableTables ?? [],
        filteredTables,
        selected,
      }),
    [allTables, availableTables, filteredTables, selected]
  );

  const hasAny = hallItems.length > 0;
  const hasSelectable = filteredTables.length > 0;

  const selectedDetail = useMemo(() => {
    const t = hallItems.find((row) => String(row.id) === String(selected));
    if (!t || t.state !== 'selected') return null;
    const num = t.layout?.hallNumber;
    const seats = t.seats ?? t.seatCount;
    const name = String(t.name || '').trim();
    const parts = [num ? hallTableLabel(num) : null, name || null, seats ? `до ${seats} гостей` : null].filter(Boolean);
    return {
      title: num ? hallTableLabel(num) : name || 'Стол',
      meta: parts.slice(1).join(' · ') || undefined,
    };
  }, [hallItems, selected]);

  return (
    <>
      <Text style={[styles.subtitle, { color: colors.text }]}>Схема зала</Text>
      <Text style={[styles.floorHint, { color: colors.textMuted }]}>
        Нажмите на свободный стол. Серые — заняты на выбранное время или не подходят по числу гостей.
      </Text>

      {hasAny ? (
        <HallFloorPlan
          items={hallItems}
          selectedId={selected}
          onSelect={setSelected}
          colors={colors}
          isDarkMode={isDarkMode}
          loading={allTablesLoading && !allTables.length}
          selectedDetail={selectedDetail}
        />
      ) : null}

      {!hasSelectable && (
        <Text style={[styles.status, { color: colors.warning }]}>
          {!availableTables?.length
            ? 'Список столов не пришёл с сервера. Войдите в аккаунт и зайдите в бронирование снова. Если вы уже вошли, а столы не появляются — это ошибка на стороне сервера при запросе столов.'
            : 'Под ваше время и число гостей нет подходящего стола — измените время или количество мест.'}
        </Text>
      )}
    </>
  );
}

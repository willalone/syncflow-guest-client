import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { borderRadius } from '../../constants/theme';
import DishImage from '../../components/DishImage';

export default function BookingTablesSection({ styles, colors, filteredTables, tables, selected, setSelected }) {
  return (
    <>
      <Text style={[styles.subtitle, { color: colors.text }]}>Доступные столы</Text>
      <View style={styles.tables}>
        {filteredTables.map((table) => (
          <TouchableOpacity
            key={table.id}
            onPress={() => setSelected(table.id)}
            style={[
              styles.tableCard,
              {
                backgroundColor: selected === table.id ? colors.cardElevated : colors.card,
                borderColor: selected === table.id ? colors.primary : colors.border,
              },
            ]}
          >
            <DishImage uri={table.imageUrl} title={table.name} style={styles.tableImage} borderRadius={borderRadius.md} />
            <Text style={[styles.tableName, { color: colors.text }]}>{table.name}</Text>
            <Text style={[styles.tableInfo, { color: colors.textLight }]}>
              До {table.seats} гостей
              {table.from && table.to ? ` • ${table.from}–${table.to}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
        {!filteredTables.length && (
          <Text style={[styles.status, { color: colors.warning }]}>
            {!tables.length
              ? 'Список столов не пришёл с сервера. Войдите в аккаунт и зайдите в бронирование снова. Если вы уже вошли, а столы не появляются — это ошибка на стороне сервера при запросе столов.'
              : 'Под ваше время и число гостей нет подходящего стола — измените время или количество мест.'}
          </Text>
        )}
      </View>
    </>
  );
}

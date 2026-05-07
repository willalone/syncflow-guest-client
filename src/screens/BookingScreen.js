import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, getColors, spacing, typography } from '../constants/theme';
import BrandHeaderAccent from '../components/BrandHeaderAccent';
import { useTheme } from '../contexts/ThemeContext';
import DishImage from '../components/DishImage';
import { applyDateMask, applyTimeMask, isValidDateMask, isValidTimeMask } from '../utils/inputMasks';
import { DEFAULT_VENUE_LABEL } from '../constants/venue';

export default function BookingScreen({
  tables = [],
  onSubmitBooking,
  cartItems = [],
  dishes = [],
  onGoToMenuForPreorder,
  onChangeCartQty,
}) {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const colors = getColors(isDarkMode);
  const isWide = width >= 768;
  const [people, setPeople] = useState('2');
  const [date, setDate] = useState(applyDateMask(new Date().toLocaleDateString('ru-RU')));
  const [time, setTime] = useState('19:30');
  const [selected, setSelected] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(new Date());
  const [validationError, setValidationError] = useState('');
  const [status, setStatus] = useState('');
  const [servingTime, setServingTime] = useState('19:30');

  useEffect(() => {
    tables.forEach((table) => {
      const u = table?.imageUrl && String(table.imageUrl).trim();
      if (u && !u.startsWith('data:')) {
        ExpoImage.prefetch(u, 'memory-disk').catch(() => null);
      }
    });
  }, [tables]);

  const guestsCount = Math.max(1, Number(String(people).replace(/\D/g, '') || 1));
  const filteredTables = useMemo(() => {
    const toMinutes = (val) => {
      const [hRaw, mRaw] = String(val || '00:00').split(':');
      return Number(hRaw) * 60 + Number(mRaw);
    };
    const selectedTimeMinutes = isValidTimeMask(time) ? toMinutes(time) : null;
    return tables.filter((table) => {
      const seatsOk = Number(table.seats || 0) >= guestsCount;
      const timeOk =
        selectedTimeMinutes === null
          ? true
          : selectedTimeMinutes >= toMinutes(table.from) && selectedTimeMinutes <= toMinutes(table.to);
      return seatsOk && timeOk;
    });
  }, [tables, guestsCount, time]);

  useEffect(() => {
    if (!filteredTables.find((table) => table.id === selected)) {
      setSelected(filteredTables[0]?.id || '');
    }
  }, [filteredTables, selected]);

  useEffect(() => {
    setServingTime(time);
  }, [time]);

  const cartPreview = useMemo(() => {
    return cartItems
      .map((item) => {
        const dish = dishes.find((d) => d.id === item.id);
        if (!dish) return null;
        return {
          id: item.id,
          title: dish.title,
          qty: item.quantity,
          lineTotal: dish.price * item.quantity,
        };
      })
      .filter(Boolean);
  }, [cartItems, dishes]);

  const preorderTotal = useMemo(() => cartPreview.reduce((sum, row) => sum + row.lineTotal, 0), [cartPreview]);

  const handleSubmit = async () => {
    const tableId = selected || filteredTables[0]?.id;
    if (!tableId) {
      setStatus('Нет доступных столов');
      return;
    }
    if (!isValidDateMask(date)) {
      setValidationError('Неверная дата. Используйте формат ДД.ММ.ГГГГ');
      return;
    }
    if (!isValidTimeMask(time)) {
      setValidationError('Неверное время. Используйте формат ЧЧ:ММ');
      return;
    }
    const serving = isValidTimeMask(servingTime) ? servingTime : time;
    if (!isValidTimeMask(serving)) {
      setValidationError('Неверное время подачи. Используйте формат ЧЧ:ММ');
      return;
    }
    setValidationError('');
    const success = await onSubmitBooking({
      people: guestsCount,
      date,
      time,
      address: DEFAULT_VENUE_LABEL,
      tableId,
      servingTime: serving,
    });
    if (success) {
      setStatus('Бронирование подтверждено. Данные сохранены в хранилище.');
    }
  };

  const monthLabel = calendarCursor.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
  const firstDay = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  const startWeekDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 0).getDate();
  const dayCells = Array.from({ length: startWeekDay }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, index) => index + 1)
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
      >
        <View style={styles.hero}>
          <BrandHeaderAccent kicker="СТОЛ" />
          <Text style={[styles.title, { color: colors.text }]}>Бронирование стола</Text>
        </View>

        <View style={[styles.form, isWide ? styles.formWide : null]}>
          <View style={[styles.fieldWrap, isWide ? styles.fieldWide : null]}>
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>Количество гостей</Text>
            <View style={[styles.counterField, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity onPress={() => setPeople(String(Math.max(1, guestsCount - 1)))} style={styles.counterBtn}>
                <Text style={[styles.counterBtnText, { color: colors.text }]}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.counterInput, { color: colors.text }]}
                value={String(guestsCount)}
                onChangeText={(value) => setPeople(String(Math.max(1, Number(value.replace(/\D/g, '') || 1))))}
                keyboardType="numeric"
                maxLength={2}
              />
              <TouchableOpacity onPress={() => setPeople(String(guestsCount + 1))} style={styles.counterBtn}>
                <Text style={[styles.counterBtnText, { color: colors.text }]}>＋</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.fieldWrap, isWide ? styles.fieldWide : null]}>
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>Дата</Text>
            <View style={styles.dateRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.dateInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                ]}
                value={date}
                onChangeText={(value) => setDate(applyDateMask(value))}
                placeholder="ДД.ММ.ГГГГ"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={10}
              />
              <TouchableOpacity
                style={[styles.calendarButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowCalendar((prev) => !prev)}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Календарь</Text>
              </TouchableOpacity>
            </View>
            {showCalendar && (
              <View style={[styles.calendar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity onPress={() => setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                    <Text style={[styles.calendarNav, { color: colors.text }]}>‹</Text>
                  </TouchableOpacity>
                  <Text style={[styles.calendarMonth, { color: colors.text }]}>{monthLabel}</Text>
                  <TouchableOpacity onPress={() => setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                    <Text style={[styles.calendarNav, { color: colors.text }]}>›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarGrid}>
                  {dayCells.map((day, idx) => (
                    <TouchableOpacity
                      key={`${day || 'empty'}-${idx}`}
                      disabled={!day}
                      style={styles.calendarCell}
                      onPress={() => {
                        const d = String(day).padStart(2, '0');
                        const m = String(calendarCursor.getMonth() + 1).padStart(2, '0');
                        const y = String(calendarCursor.getFullYear());
                        setDate(`${d}.${m}.${y}`);
                        setShowCalendar(false);
                      }}
                    >
                      <Text style={[styles.calendarCellText, { color: day ? colors.text : 'transparent' }]}>{day || '0'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={[styles.fieldWrap, isWide ? styles.fieldWide : null]}>
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>Время брони</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={time}
              onChangeText={(value) => setTime(applyTimeMask(value))}
              placeholder="ЧЧ:ММ"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>

          <View style={[styles.fieldWrap, isWide ? styles.fieldWide : null]}>
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>Время подачи блюд (предзаказ)</Text>
            <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
              Можно отличаться от времени брони, если блюда нужны позже.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={servingTime}
              onChangeText={(value) => setServingTime(applyTimeMask(value))}
              placeholder="ЧЧ:ММ"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>

        {Boolean(validationError) && (
          <Text style={[styles.errorText, { color: colors.error }]}>{validationError}</Text>
        )}

        <Text style={[styles.subtitle, { color: colors.text }]}>Предзаказ к визиту</Text>
        <Text style={[styles.preorderHint, { color: colors.textLight }]}>
          Выберите блюда в корзине до нажатия «Подтвердить»: они будут сохранены в брони и оформлены заказом на выбранное время подачи.
        </Text>
        {!cartPreview.length ? (
          onGoToMenuForPreorder ? (
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={onGoToMenuForPreorder}
              activeOpacity={0.85}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Добавить блюда из меню</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.preorderHint, { color: colors.textMuted }]}>Корзина пуста — добавьте блюда через меню, затем вернитесь к брони.</Text>
          )
        ) : (
          <View style={[styles.preorderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {cartPreview.map((row) => (
              <View key={row.id} style={styles.preorderLine}>
                <Text style={[styles.preorderLineText, { color: colors.text }]} numberOfLines={2}>
                  {row.title} × {row.qty}
                </Text>
                <Text style={[styles.preorderLinePrice, { color: colors.textLight }]}>{row.lineTotal} руб</Text>
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
              <DishImage
                uri={table.imageUrl}
                title={table.name}
                style={styles.tableImage}
                borderRadius={borderRadius.md}
              />
              <Text style={[styles.tableName, { color: colors.text }]}>{table.name}</Text>
              <Text style={[styles.tableInfo, { color: colors.textLight }]}>
                До {table.seats} гостей • {table.from} - {table.to}
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

        {Boolean(status) && <Text style={[styles.status, { color: colors.success }]}>{status}</Text>}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}
          onPress={handleSubmit}
        >
          <Text style={[styles.buttonText, { color: colors.black }]}>Подтвердить</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['2xl'], minHeight: '100%' },
  hero: { marginBottom: spacing.md },
  title: { ...typography.h2, marginBottom: spacing.sm, marginTop: 0 },
  form: { gap: spacing.sm },
  formWide: { flexDirection: 'row', flexWrap: 'wrap' },
  fieldWrap: { width: '100%' },
  fieldWide: { width: '48%' },
  fieldLabel: { ...typography.caption, marginBottom: spacing.xs, fontWeight: '600' },
  fieldHint: { ...typography.caption, marginBottom: spacing.xs },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    flexGrow: 1,
    minWidth: 180,
  },
  counterField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  counterBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { fontSize: 20, fontWeight: '700' },
  counterInput: { flex: 1, textAlign: 'center', ...typography.bodyLarge, fontWeight: '700' },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateInput: { flex: 1 },
  calendarButton: {
    minWidth: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendar: { marginTop: spacing.xs, borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.lg, padding: spacing.sm },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  calendarNav: { fontSize: 20, fontWeight: '700', paddingHorizontal: spacing.sm },
  calendarMonth: { ...typography.body, fontWeight: '600', textTransform: 'capitalize' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.28%', alignItems: 'center', paddingVertical: spacing.xs },
  calendarCellText: { ...typography.caption },
  errorText: { ...typography.caption, marginTop: spacing.xs },
  subtitle: { ...typography.h4, marginTop: spacing.lg, marginBottom: spacing.sm },
  preorderHint: { ...typography.caption, marginBottom: spacing.sm },
  preorderCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.xs },
  preorderLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  preorderLineText: { ...typography.body, flex: 1 },
  preorderLinePrice: { ...typography.caption, minWidth: 72, textAlign: 'right' },
  preorderQty: { flexDirection: 'row', gap: spacing.sm },
  preorderQtyBtn: { fontSize: 18, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  preorderTotal: { ...typography.body, fontWeight: '700', marginTop: spacing.sm },
  secondaryBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { ...typography.body, fontWeight: '600' },
  tables: { gap: spacing.sm },
  tableCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  tableImage: {
    width: '100%',
    height: 112,
    marginBottom: spacing.sm,
  },
  tableName: { ...typography.bodyLarge, fontWeight: '600' },
  tableInfo: { ...typography.caption, marginTop: spacing.xs },
  status: { ...typography.body, marginTop: spacing.md },
  button: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  buttonText: { ...typography.button, fontWeight: '700' },
});

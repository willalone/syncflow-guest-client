import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, getColors, getShadows, layout, spacing, typography } from '../constants/theme';
import ScreenBackdrop from '../components/ScreenBackdrop';
import { useTheme } from '../contexts/ThemeContext';
import { applyDateMask, isValidDateMask, isValidTimeMask } from '../utils/inputMasks';
import { DEFAULT_VENUE_LABEL } from '../constants/venue';
import BookingFormSection from './booking/BookingFormSection';
import BookingPreorderSection from './booking/BookingPreorderSection';
import BookingTablesSection from './booking/BookingTablesSection';

function addTwoHoursHm(timeHm) {
  const [hRaw = '0', mRaw = '0'] = String(timeHm || '00:00').split(':');
  const startMin = Number(hRaw) * 60 + Number(mRaw);
  const endMin = startMin + 120;
  const endH = Math.floor(endMin / 60) % 24;
  const endM = endMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function parseBookingDateTime(dateValue, timeValue) {
  const [dd, mm, yyyy] = String(dateValue || '').split('.');
  const [hh, min] = String(timeValue || '').split(':');
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const hours = Number(hh);
  const minutes = Number(min);
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null;
  }
  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export default function BookingScreen({
  tables = [],
  onSubmitBooking,
  onRequestAvailableTables,
  cartItems = [],
  dishes = [],
  onGoToMenuForPreorder,
  onChangeCartQty,
  networkOffline = false,
}) {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const colors = getColors(isDarkMode);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const hasWindow =
        table.from != null &&
        table.to != null &&
        String(table.from).trim() !== '' &&
        String(table.to).trim() !== '';
      const timeOk =
        selectedTimeMinutes === null
          ? true
          : !hasWindow
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

  useEffect(() => {
    if (typeof onRequestAvailableTables !== 'function') return undefined;
    if (!isValidDateMask(date) || !isValidTimeMask(time)) return undefined;

    const [dd, mm, yyyy] = String(date).split('.');
    if (!dd || !mm || !yyyy) return undefined;
    const dateIso = `${yyyy}-${mm}-${dd}`;

    const timer = setTimeout(() => {
      onRequestAvailableTables({
        date: dateIso,
        from: time,
        to: addTwoHoursHm(time),
        seats: guestsCount,
      }).catch(() => null);
    }, 250);

    return () => clearTimeout(timer);
  }, [date, time, guestsCount, onRequestAvailableTables]);

  const cartPreview = useMemo(() => {
    return cartItems
      .map((item) => {
        const dish = dishes.find((d) => d.id === item.id);
        if (!dish) return null;
        const modifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
        const modifiersTotal = modifiers.reduce((sum, modifier) => sum + Number(modifier?.price || 0), 0);
        return {
          id: item.cartItemId || item.id,
          title: dish.title,
          qty: item.quantity,
          modifiers,
          lineTotal: (Number(dish.price || 0) + modifiersTotal) * item.quantity,
        };
      })
      .filter(Boolean);
  }, [cartItems, dishes]);

  const preorderTotal = useMemo(() => cartPreview.reduce((sum, row) => sum + row.lineTotal, 0), [cartPreview]);

  const preorderMenuContext = useMemo(() => {
    if (!isValidDateMask(date) || !isValidTimeMask(servingTime || time)) return null;
    const [dd, mm, yyyy] = String(date).split('.');
    if (!dd || !mm || !yyyy) return null;
    return {
      date: `${yyyy}-${mm}-${dd}`,
      time: servingTime || time,
      source: 'booking',
    };
  }, [date, servingTime, time]);

  const handleSubmit = async () => {
    if (isSubmitting || networkOffline) return;
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
    const bookingDateTime = parseBookingDateTime(date, time);
    if (!bookingDateTime) {
      setValidationError('Не удалось разобрать дату или время брони.');
      return;
    }
    if (bookingDateTime.getTime() <= Date.now()) {
      setValidationError('Нельзя забронировать стол на прошедшее время.');
      return;
    }
    const serving = isValidTimeMask(servingTime) ? servingTime : time;
    if (!isValidTimeMask(serving)) {
      setValidationError('Неверное время подачи. Используйте формат ЧЧ:ММ');
      return;
    }
    setValidationError('');
    setStatus('');
    setIsSubmitting(true);
    try {
      const result = await onSubmitBooking({
        people: guestsCount,
        date,
        time,
        address: DEFAULT_VENUE_LABEL,
        tableId,
        servingTime: serving,
      });
      if (result?.ok) {
        setStatus('Бронирование подтверждено.');
      } else {
        setStatus(result?.message || 'Не удалось создать бронь. Попробуйте еще раз.');
      }
    } finally {
      setIsSubmitting(false);
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
    <ScreenBackdrop isDarkMode={isDarkMode}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
      >
        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>СТОЛ</Text>
          <Text style={[styles.title, { color: colors.text }]}>Бронирование</Text>
        </View>

        <BookingFormSection
          styles={styles}
          colors={colors}
          isWide={isWide}
          guestsCount={guestsCount}
          setPeople={setPeople}
          date={date}
          setDate={setDate}
          showCalendar={showCalendar}
          setShowCalendar={setShowCalendar}
          monthLabel={monthLabel}
          setCalendarCursor={setCalendarCursor}
          calendarCursor={calendarCursor}
          dayCells={dayCells}
          time={time}
          setTime={setTime}
          servingTime={servingTime}
          setServingTime={setServingTime}
        />

        {Boolean(validationError) && (
          <Text style={[styles.errorText, { color: colors.error }]}>{validationError}</Text>
        )}

        <BookingPreorderSection
          styles={styles}
          colors={colors}
          cartPreview={cartPreview}
          preorderMenuContext={preorderMenuContext}
          onGoToMenuForPreorder={onGoToMenuForPreorder}
          onChangeCartQty={onChangeCartQty}
          preorderTotal={preorderTotal}
        />

        <BookingTablesSection
          styles={styles}
          colors={colors}
          filteredTables={filteredTables}
          tables={tables}
          selected={selected}
          setSelected={setSelected}
        />

        {Boolean(status) && <Text style={[styles.status, { color: colors.success }]}>{status}</Text>}

        <TouchableOpacity
          style={[
            styles.button,
            shadowsThemed.medium,
            {
              backgroundColor: networkOffline ? colors.textMuted : colors.primary,
              opacity: networkOffline ? 0.85 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || networkOffline}
        >
          <Text style={[styles.buttonText, { color: colors.black }]}>
            {networkOffline ? 'Нет сети' : isSubmitting ? 'Отправляем...' : 'Подтвердить бронь'}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    minHeight: '100%',
  },
  hero: { marginBottom: spacing.lg, gap: 4 },
  kicker: { ...typography.kicker },
  title: { ...typography.h1, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  form: { gap: spacing.sm },
  formWide: { flexDirection: 'row', flexWrap: 'wrap' },
  fieldWrap: { width: '100%' },
  fieldWide: { width: '48%' },
  fieldLabel: { ...typography.caption, marginBottom: spacing.xs, fontWeight: '600' },
  fieldHint: { ...typography.caption, marginBottom: spacing.xs },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    flexGrow: 1,
    minWidth: 180,
  },
  counterField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
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
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendar: { marginTop: spacing.xs, borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.xl, padding: spacing.sm },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  calendarNav: { fontSize: 20, fontWeight: '700', paddingHorizontal: spacing.sm },
  calendarMonth: { ...typography.body, fontWeight: '600', textTransform: 'capitalize' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.28%', alignItems: 'center', paddingVertical: spacing.xs },
  calendarCellText: { ...typography.caption },
  errorText: { ...typography.caption, marginTop: spacing.xs },
  subtitle: { ...typography.h4, marginTop: spacing.lg, marginBottom: spacing.sm },
  preorderHint: { ...typography.caption, marginBottom: spacing.sm },
  preorderCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius['2xl'], padding: spacing.md, gap: spacing.xs },
  preorderLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  preorderLineText: { ...typography.body, flex: 1 },
  preorderLinePrice: { ...typography.caption, minWidth: 72, textAlign: 'right' },
  preorderQty: { flexDirection: 'row', gap: spacing.sm },
  preorderQtyBtn: { fontSize: 18, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  preorderTotal: { ...typography.body, fontWeight: '700', marginTop: spacing.sm },
  secondaryBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { ...typography.body, fontWeight: '600' },
  tables: { gap: spacing.sm },
  tableCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.xl,
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
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  buttonText: { ...typography.button, fontWeight: '700' },
});

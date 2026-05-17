import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { applyDateMask, applyTimeMask } from '../../utils/inputMasks';

export default function BookingFormSection({
  styles,
  colors,
  isWide,
  guestsCount,
  setPeople,
  date,
  setDate,
  showCalendar,
  setShowCalendar,
  monthLabel,
  setCalendarCursor,
  calendarCursor,
  dayCells,
  time,
  setTime,
  servingTime,
  setServingTime,
}) {
  return (
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
            style={[styles.input, styles.dateInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
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
        <Text style={[styles.fieldHint, { color: colors.textMuted }]}>Можно отличаться от времени брони, если блюда нужны позже.</Text>
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
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { borderRadius, getColors, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { DEFAULT_VENUE_LABEL } from '../constants/venue';

export default function WaiterCallModal({ visible, onClose, tables = [], onSubmit }) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [step, setStep] = useState('confirm');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [tableCustom, setTableCustom] = useState('');
  const [sending, setSending] = useState(false);

  const tablesList = useMemo(() => tables || [], [tables]);

  useEffect(() => {
    if (!visible) {
      setStep('confirm');
      setSelectedTableId('');
      setTableCustom('');
      setSending(false);
    }
  }, [visible]);

  const selectedTableName = useMemo(() => {
    if (!selectedTableId) return '';
    const t = tablesList.find((x) => String(x.id) === String(selectedTableId));
    return t ? String(t.name || t.id) : '';
  }, [selectedTableId, tablesList]);

  const tableLabel = String(tableCustom || '').trim() || selectedTableName;

  const handleSend = async () => {
    if (!tableLabel) {
      return;
    }
    setSending(true);
    try {
      await onSubmit({
        context: 'in_restaurant',
        address: DEFAULT_VENUE_LABEL,
        tableHint: tableLabel,
        message: `Зал: ${DEFAULT_VENUE_LABEL}, стол: ${tableLabel}`,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Вызов официанта</Text>
          {step === 'confirm' ? (
            <>
              <Text style={[styles.body, { color: colors.textLight }]}>
                Эта функция доступна только если вы уже в зале ресторана. Продолжить?
              </Text>
              <TouchableOpacity
                style={[styles.primary, { backgroundColor: colors.primary }]}
                onPress={() => setStep('details')}
              >
                <Text style={[styles.primaryText, { color: colors.black }]}>Да, я в ресторане</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondary, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.secondaryText, { color: colors.text }]}>Отмена</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll} nestedScrollEnabled>
              <Text style={[styles.hint, { color: colors.textMuted, marginBottom: spacing.sm }]}>
                Заведение: {DEFAULT_VENUE_LABEL}
              </Text>

              <Text style={[styles.label, { color: colors.textLight }]}>Стол</Text>
              {tablesList.length ? (
                <View style={styles.chips}>
                  {tablesList.map((t) => {
                    const active = String(selectedTableId) === String(t.id);
                    return (
                      <TouchableOpacity
                        key={String(t.id)}
                        onPress={() => {
                          setSelectedTableId(String(t.id));
                          setTableCustom('');
                        }}
                        style={[
                          styles.chip,
                          {
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active ? colors.primary : colors.background,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? colors.black : colors.text,
                            ...typography.caption,
                            fontWeight: '600',
                          }}
                        >
                          {t.name || t.id}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Если вашего стола нет в списке, введите номер или описание ниже.
              </Text>
              <TextInput
                value={tableCustom}
                onChangeText={(v) => {
                  setTableCustom(v);
                  if (v.trim()) setSelectedTableId('');
                }}
                placeholder="Например: 12 или у окна справа"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
                ]}
              />

              <TouchableOpacity
                style={[
                  styles.primary,
                  { backgroundColor: colors.primary, marginTop: spacing.md, opacity: sending ? 0.7 : 1 },
                ]}
                disabled={sending || !tableLabel}
                onPress={handleSend}
              >
                <Text style={[styles.primaryText, { color: colors.black }]}>Отправить официанту</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondary, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.secondaryText, { color: colors.text }]}>Закрыть</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  scroll: { maxHeight: 420 },
  title: { ...typography.h3, marginBottom: spacing.sm },
  body: { ...typography.body, marginBottom: spacing.md },
  label: { ...typography.caption, fontWeight: '600', marginBottom: spacing.xs },
  hint: { ...typography.caption, marginTop: spacing.xs, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  primary: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryText: { ...typography.button, fontWeight: '700' },
  secondary: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryText: { ...typography.body, fontWeight: '600' },
});

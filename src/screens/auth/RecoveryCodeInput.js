import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RECOVERY_CODE_LENGTH } from '../../constants/passwordRecovery';
import { borderRadius, fontFamily, spacing, typography } from '../../constants/theme';

/**
 * Ввод 6-значного кода: видимое поле + ячейки-подсказка (тап по ряду фокусирует ввод).
 */
export default function RecoveryCodeInput({ value, onChange, colors, isDarkMode, inputStyle }) {
  const inputRef = useRef(null);
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, RECOVERY_CODE_LENGTH);

  const handleChange = (raw) => {
    onChange(
      String(raw || '')
        .replace(/\D/g, '')
        .slice(0, RECOVERY_CODE_LENGTH),
    );
  };

  const cellBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)';

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textMuted }]}>
        Код из письма ({RECOVERY_CODE_LENGTH} цифр)
      </Text>
      <Pressable onPress={() => inputRef.current?.focus()} style={styles.row} accessibilityRole="button">
        {Array.from({ length: RECOVERY_CODE_LENGTH }).map((_, index) => (
          <View
            key={`recovery-code-cell-${index}`}
            style={[
              styles.cell,
              {
                borderColor: colors.hairline,
                backgroundColor: cellBg,
              },
              index === digits.length ? styles.cellActive : null,
            ]}
          >
            <Text style={[styles.digit, { color: colors.text }]}>{digits[index] || ''}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={inputRef}
        style={[styles.input, inputStyle, { color: colors.text, borderColor: colors.hairline }]}
        value={digits}
        onChangeText={handleChange}
        placeholder="123456"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        maxLength={RECOVERY_CODE_LENGTH}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  label: {
    ...typography.caption,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: {
    borderWidth: 1.5,
  },
  digit: {
    ...typography.h3,
    fontFamily: fontFamily.sansBold,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 20,
    letterSpacing: 6,
    textAlign: 'center',
    fontFamily: fontFamily.sansMedium,
  },
});

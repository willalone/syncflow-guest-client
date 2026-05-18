import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { borderRadius, fontFamily, spacing, typography } from '../../constants/theme';
import { RECOVERY_CODE_TTL_MINUTES, RECOVERY_MIN_PASSWORD_LENGTH, RECOVERY_STAGE } from '../../constants/passwordRecovery';
import RecoveryCodeInput from './RecoveryCodeInput';

export default function PasswordRecoveryModal({
  visible,
  blurIntensity,
  blurTint,
  isDarkMode,
  colors,
  recoveryEmail,
  setRecoveryEmail,
  recoveryStage,
  recoveryCode,
  setRecoveryCode,
  recoveryPassword,
  setRecoveryPassword,
  recoveryConfirmPassword,
  setRecoveryConfirmPassword,
  recoveryError,
  recoverySuccess,
  recoveryLoading,
  closeForgotModal,
  requestRecoveryCode,
  submitRecovery,
}) {
  const isVerify = recoveryStage === RECOVERY_STAGE.VERIFY;
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeForgotModal}>
      <View style={styles.modalOverlay}>
        <BlurView
          intensity={blurIntensity}
          tint={blurTint}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={[styles.recoveryModal, { borderColor: colors.hairline }]}
        >
          <View
            style={[
              styles.recoveryInner,
              { backgroundColor: isDarkMode ? 'rgba(38, 32, 46, 0.6)' : 'rgba(255, 255, 255, 0.72)' },
            ]}
          >
            <Text style={[styles.recoveryTitle, { color: colors.text }]}>Восстановление пароля</Text>
            <Text style={[styles.recoveryHint, { color: colors.textMuted }]}>
              {isVerify
                ? `Введите код из письма. Он действует ${RECOVERY_CODE_TTL_MINUTES} мин с момента отправки. Новый пароль — от ${RECOVERY_MIN_PASSWORD_LENGTH} символов.`
                : recoveryLoading
                  ? 'Сервер отправляет письмо — обычно 30 сек – 3 мин. Не закрывайте окно: поля для кода появятся после ответа сервера.'
                  : 'Укажите email аккаунта и нажмите «Отправить код». Письмо приходит отдельно от срока «15 мин» — это время, чтобы ввести код после получения.'}
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.hairline,
                  backgroundColor: inputBg,
                  color: colors.text,
                },
              ]}
              value={recoveryEmail}
              onChangeText={setRecoveryEmail}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!recoveryLoading && !isVerify}
            />

            {isVerify && !recoveryLoading ? (
              <TouchableOpacity
                onPress={requestRecoveryCode}
                activeOpacity={0.8}
                style={styles.forgotBtn}
              >
                <Text style={[styles.forgotText, { color: colors.primary }]}>Отправить код повторно</Text>
              </TouchableOpacity>
            ) : null}

            {isVerify ? (
              <>
                <RecoveryCodeInput
                  value={recoveryCode}
                  onChange={setRecoveryCode}
                  colors={colors}
                  isDarkMode={isDarkMode}
                  inputStyle={{ backgroundColor: inputBg }}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.hairline,
                      backgroundColor: inputBg,
                      color: colors.text,
                    },
                  ]}
                  value={recoveryPassword}
                  onChangeText={setRecoveryPassword}
                  placeholder="Новый пароль"
                  secureTextEntry
                  placeholderTextColor={colors.textMuted}
                  textContentType="newPassword"
                  editable={!recoveryLoading}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.hairline,
                      backgroundColor: inputBg,
                      color: colors.text,
                    },
                  ]}
                  value={recoveryConfirmPassword}
                  onChangeText={setRecoveryConfirmPassword}
                  placeholder="Подтвердите новый пароль"
                  secureTextEntry
                  placeholderTextColor={colors.textMuted}
                  textContentType="newPassword"
                  editable={!recoveryLoading}
                />
              </>
            ) : null}

            {Boolean(recoveryError) ? <Text style={[styles.error, { color: colors.error }]}>{recoveryError}</Text> : null}
            {Boolean(recoverySuccess) ? (
              <Text style={[styles.recoverySuccess, { color: colors.success }]}>{recoverySuccess}</Text>
            ) : null}

            <View style={styles.recoveryActions}>
              <TouchableOpacity
                onPress={closeForgotModal}
                activeOpacity={0.9}
                style={[styles.modalBtnGhost, { borderColor: colors.hairline }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  {recoveryLoading ? 'Прервать' : 'Отмена'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={isVerify ? submitRecovery : requestRecoveryCode}
                activeOpacity={0.92}
                style={[styles.modalBtnPrimary, { backgroundColor: colors.primary }]}
                disabled={recoveryLoading}
              >
                {recoveryLoading ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: colors.black }]}>
                    {isVerify ? 'Обновить пароль' : 'Отправить код'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 12, 20, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  recoveryModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  recoveryInner: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  recoveryTitle: {
    ...typography.h3,
  },
  recoveryHint: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    ...typography.caption,
    fontFamily: fontFamily.sansMedium,
  },
  recoverySuccess: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  recoveryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalBtnGhost: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimary: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    ...typography.button,
    fontWeight: '700',
  },
});

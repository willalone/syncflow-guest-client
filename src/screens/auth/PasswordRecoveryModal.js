import React from 'react';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { RECOVERY_CODE_TTL_MINUTES, RECOVERY_MIN_PASSWORD_LENGTH, RECOVERY_STAGE } from '../../constants/passwordRecovery';
import RecoveryCodeInput from './RecoveryCodeInput';

export default function PasswordRecoveryModal({
  visible,
  blurIntensity,
  blurTint,
  isDarkMode,
  Platform,
  styles,
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
                ? `Код из письма (${RECOVERY_CODE_TTL_MINUTES} мин). Затем новый пароль — от ${RECOVERY_MIN_PASSWORD_LENGTH} символов.`
                : recoveryLoading
                  ? 'Ждём ответ сервера. Поля для кода появятся только после подтверждения отправки письма.'
                  : 'Укажите email, привязанный к аккаунту, и нажмите «Отправить код».'}
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

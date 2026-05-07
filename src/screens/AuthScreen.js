import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { borderRadius, getColors, spacing, typography, fontFamily } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { runtimeConfig } from '../config/runtimeConfig';
import { applyPhoneMask, isValidEmail } from '../utils/inputMasks';
import BrandHeaderAccent from '../components/BrandHeaderAccent';
import AuthAtmosphereBackground from '../components/AuthAtmosphereBackground';
import { CLIENT_APP_TITLE, CLIENT_BRAND_KICKER } from '../constants/venue';

const isSyncflowBackend = runtimeConfig.integratedBackend === 'syncflow';

export default function AuthScreen() {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { signIn, signUp, authError, setAuthError, requestPasswordRecovery, confirmPasswordRecovery } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+7 ');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryStage, setRecoveryStage] = useState('request');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  const pillX = useRef(new Animated.Value(0)).current;
  const [segmentHalf, setSegmentHalf] = useState(0);
  const segmentLaidOut = useRef(false);

  useEffect(() => {
    if (segmentHalf <= 0) return;
    const target = isRegisterMode ? segmentHalf : 0;
    if (!segmentLaidOut.current) {
      pillX.setValue(target);
      segmentLaidOut.current = true;
      return;
    }
    Animated.timing(pillX, {
      toValue: target,
      duration: 230,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isRegisterMode, segmentHalf, pillX]);

  const cardShadow = isDarkMode
    ? {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.5,
        shadowRadius: 34,
        elevation: 20,
      }
    : {
        shadowColor: '#3D2858',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 16,
      };

  const blurTint = isDarkMode ? 'dark' : 'light';
  const blurIntensity = Platform.OS === 'ios' ? 48 : 36;

  const resetRecoveryModal = () => {
    setRecoveryEmail('');
    setRecoveryCode('');
    setRecoveryPassword('');
    setRecoveryConfirmPassword('');
    setRecoveryError('');
    setRecoverySuccess('');
    setRecoveryStage('request');
    setRecoveryLoading(false);
  };

  const openForgotModal = () => {
    setRecoveryEmail(email.trim());
    setRecoveryCode('');
    setRecoveryPassword('');
    setRecoveryConfirmPassword('');
    setRecoveryError('');
    setRecoverySuccess('');
    setRecoveryStage('request');
    setForgotVisible(true);
  };

  const closeForgotModal = () => {
    setForgotVisible(false);
    resetRecoveryModal();
  };

  const generateRecoveryCode = () => String(Math.floor(1000 + Math.random() * 9000));

  const requestRecoveryCode = async () => {
    const nextEmail = recoveryEmail.trim().toLowerCase();
    if (!isValidEmail(nextEmail)) {
      setRecoveryError('Введите корректный email (обязателен символ @).');
      return;
    }
    try {
      setRecoveryLoading(true);
      setRecoveryError('');
      setRecoverySuccess('');
      const code = generateRecoveryCode();
      await requestPasswordRecovery({ email: nextEmail, code });
      setRecoveryCode('');
      setRecoveryStage('verify');
      setRecoverySuccess('Код из 4 цифр отправлен на почту.');
    } catch (error) {
      setRecoveryError(error.message || 'Не удалось отправить код. Попробуйте позже.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const submitRecovery = async () => {
    const nextEmail = recoveryEmail.trim().toLowerCase();
    if (!isValidEmail(nextEmail)) {
      setRecoveryError('Введите корректный email (обязателен символ @).');
      return;
    }
    if (!/^\d{4}$/.test(recoveryCode)) {
      setRecoveryError('Введите 4-значный код из письма.');
      return;
    }
    if (!recoveryPassword || recoveryPassword.length < 4) {
      setRecoveryError('Новый пароль должен содержать минимум 4 символа.');
      return;
    }
    if (recoveryPassword !== recoveryConfirmPassword) {
      setRecoveryError('Пароли не совпадают.');
      return;
    }
    try {
      setRecoveryLoading(true);
      setRecoveryError('');
      setRecoverySuccess('');
      await confirmPasswordRecovery({
        email: nextEmail,
        code: recoveryCode,
        newPassword: recoveryPassword,
      });
      setRecoverySuccess('Пароль обновлен. Теперь можно войти.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        closeForgotModal();
      }, 700);
    } catch (error) {
      setRecoveryError(error.message || 'Не удалось восстановить пароль.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const submit = async () => {
    try {
      setLoading(true);
      setAuthError('');
      if (isSyncflowBackend) {
        if (!password || password.length < 1) {
          throw new Error('Введите пароль');
        }
        if (isRegisterMode) {
          if (password !== confirmPassword) {
            throw new Error('Пароли не совпадают');
          }
          if (!firstName.trim() || !lastName.trim()) {
            throw new Error('Укажите имя и фамилию');
          }
          if (!login.trim()) {
            throw new Error('Укажите логин');
          }
          if (email.trim() && !isValidEmail(email.trim())) {
            throw new Error('Введите корректный email (обязателен символ @).');
          }
          await signUp({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            login: login.trim(),
            password,
            email: email.trim() ? email.trim().toLowerCase() : undefined,
          });
        } else {
          if (!login.trim()) {
            throw new Error('Укажите логин');
          }
          await signIn({ login: login.trim(), password });
        }
      } else {
        if (String(phone).replace(/\D/g, '').length < 11) {
          throw new Error('Введите полный номер телефона');
        }
        if (isRegisterMode) {
          if (password !== confirmPassword) {
            throw new Error('Пароли не совпадают');
          }
          await signUp({ name, phone, password });
        } else {
          await signIn({ phone, password });
        }
      }
    } catch (error) {
      setAuthError(error.message || 'Не удалось выполнить вход. Проверьте данные и повторите попытку.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AuthAtmosphereBackground isDarkMode={isDarkMode} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <BrandHeaderAccent kicker={CLIENT_BRAND_KICKER} />

            <View style={styles.hero}>
              <Image source={require('../../assets/app-logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={[styles.brand, { color: colors.text }]}>{CLIENT_APP_TITLE}</Text>
              <Text style={[styles.tagline, { color: colors.textMuted }]}>
                Вход и регистрация в одном ритме с приложением
              </Text>
            </View>

            <View style={[styles.cardFloating, cardShadow]}>
              <BlurView
                intensity={blurIntensity}
                tint={blurTint}
                experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                style={[styles.cardBlur, { borderColor: colors.hairline }]}
              >
                <View
                  style={[
                    styles.cardInnerTint,
                    {
                      backgroundColor: isDarkMode ? 'rgba(38, 32, 46, 0.45)' : 'rgba(255, 255, 255, 0.52)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.segment,
                      {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(42, 36, 58, 0.08)',
                      },
                    ]}
                    onLayout={(e) => {
                      const w = e.nativeEvent.layout.width;
                      const inset = 3;
                      const inner = Math.max(0, w - inset * 2);
                      setSegmentHalf(inner / 2);
                    }}
                  >
                    <Animated.View
                      style={[
                        styles.segmentPill,
                        { backgroundColor: colors.primary },
                        segmentHalf > 0
                          ? { width: segmentHalf, opacity: 1, transform: [{ translateX: pillX }] }
                          : { width: 0, opacity: 0 },
                      ]}
                    />
                    <TouchableOpacity
                      style={styles.segmentBtn}
                      onPress={() => {
                        setIsRegisterMode(false);
                        setAuthError('');
                      }}
                      activeOpacity={0.9}
                    >
                      <Text
                        style={[
                          styles.segmentLabel,
                          {
                            color: !isRegisterMode ? colors.black : colors.textLight,
                            fontFamily: !isRegisterMode ? fontFamily.sansBold : fontFamily.sansMedium,
                          },
                        ]}
                      >
                        Вход
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.segmentBtn}
                      onPress={() => {
                        setIsRegisterMode(true);
                        setAuthError('');
                      }}
                      activeOpacity={0.9}
                    >
                      <Text
                        style={[
                          styles.segmentLabel,
                          {
                            color: isRegisterMode ? colors.black : colors.textLight,
                            fontFamily: isRegisterMode ? fontFamily.sansBold : fontFamily.sansMedium,
                          },
                        ]}
                      >
                        Регистрация
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isRegisterMode && !isSyncflowBackend && (
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: colors.hairline,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                          color: colors.text,
                        },
                      ]}
                      value={name}
                      onChangeText={setName}
                      placeholder="Имя"
                      placeholderTextColor={colors.textMuted}
                    />
                  )}
                  {isRegisterMode && isSyncflowBackend && (
                    <>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            borderColor: colors.hairline,
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                            color: colors.text,
                          },
                        ]}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="Имя"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="words"
                      />
                      <TextInput
                        style={[
                          styles.input,
                          {
                            borderColor: colors.hairline,
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                            color: colors.text,
                          },
                        ]}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Фамилия"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="words"
                      />
                    </>
                  )}
                  {isSyncflowBackend ? (
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: colors.hairline,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                          color: colors.text,
                        },
                      ]}
                      value={login}
                      onChangeText={setLogin}
                      placeholder="Логин"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  ) : null}
                  {!isSyncflowBackend && (
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: colors.hairline,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                          color: colors.text,
                        },
                      ]}
                      value={phone}
                      onChangeText={(value) => setPhone(applyPhoneMask(value))}
                      placeholder={isSyncflowBackend ? 'Телефон (необязательно)' : '+7 999 123-45-67'}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                    />
                  )}
                  {isSyncflowBackend && isRegisterMode ? (
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: colors.hairline,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                          color: colors.text,
                        },
                      ]}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email (для восстановления пароля)"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  ) : null}
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: colors.hairline,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                        color: colors.text,
                      },
                    ]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Пароль"
                    secureTextEntry
                    placeholderTextColor={colors.textMuted}
                    textContentType="password"
                    autoComplete="password"
                  />
                  {isSyncflowBackend && !isRegisterMode ? (
                    <TouchableOpacity onPress={openForgotModal} activeOpacity={0.8} style={styles.forgotBtn}>
                      <Text style={[styles.forgotText, { color: colors.primary }]}>Забыли пароль?</Text>
                    </TouchableOpacity>
                  ) : null}
                  {isRegisterMode && (
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: colors.hairline,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                          color: colors.text,
                        },
                      ]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Подтвердите пароль"
                      secureTextEntry
                      placeholderTextColor={colors.textMuted}
                      textContentType="password"
                      autoComplete="password"
                    />
                  )}

                  {Boolean(authError) && <Text style={[styles.error, { color: colors.error }]}>{authError}</Text>}

                  <TouchableOpacity
                    onPress={submit}
                    disabled={loading}
                    activeOpacity={0.92}
                    style={[styles.cta, { backgroundColor: colors.primary }]}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.black} />
                    ) : (
                      <Text style={[styles.ctaText, { color: colors.black }]}>
                        {isRegisterMode ? 'Создать аккаунт' : 'Войти'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Modal visible={forgotVisible} transparent animationType="fade" onRequestClose={closeForgotModal}>
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
                Введите email, получите 4-значный код и задайте новый пароль.
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.hairline,
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
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
              />

              {recoveryStage === 'verify' ? (
                <>
                  <TextInput
                    style={styles.hiddenCodeInput}
                    value={recoveryCode}
                    onChangeText={(value) => setRecoveryCode(String(value || '').replace(/\D/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    autoFocus
                  />
                  <TouchableOpacity activeOpacity={1} onPress={() => null} style={styles.codeRow}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <View
                        key={`recovery-code-${index}`}
                        style={[
                          styles.codeCell,
                          {
                            borderColor: colors.hairline,
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                          },
                        ]}
                      >
                        <Text style={[styles.codeDigit, { color: colors.text }]}>{recoveryCode[index] || ''}</Text>
                      </View>
                    ))}
                  </TouchableOpacity>

                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: colors.hairline,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                        color: colors.text,
                      },
                    ]}
                    value={recoveryPassword}
                    onChangeText={setRecoveryPassword}
                    placeholder="Новый пароль"
                    secureTextEntry
                    placeholderTextColor={colors.textMuted}
                    textContentType="newPassword"
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: colors.hairline,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                        color: colors.text,
                      },
                    ]}
                    value={recoveryConfirmPassword}
                    onChangeText={setRecoveryConfirmPassword}
                    placeholder="Подтвердите новый пароль"
                    secureTextEntry
                    placeholderTextColor={colors.textMuted}
                    textContentType="newPassword"
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
                  disabled={recoveryLoading}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={recoveryStage === 'request' ? requestRecoveryCode : submitRecovery}
                  activeOpacity={0.92}
                  style={[styles.modalBtnPrimary, { backgroundColor: colors.primary }]}
                  disabled={recoveryLoading}
                >
                  {recoveryLoading ? (
                    <ActivityIndicator color={colors.black} />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: colors.black }]}>
                      {recoveryStage === 'request' ? 'Отправить код' : 'Обновить пароль'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  logo: {
    width: 72,
    height: 72,
  },
  brand: {
    ...typography.h2,
    textAlign: 'center',
  },
  tagline: {
    ...typography.caption,
    textAlign: 'center',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.md,
  },
  cardFloating: {
    borderRadius: borderRadius['2xl'],
  },
  cardBlur: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardInnerTint: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    gap: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  segmentPill: {
    position: 'absolute',
    left: 3,
    top: 3,
    bottom: 3,
    borderRadius: borderRadius.md,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentLabel: {
    ...typography.button,
    fontSize: 14,
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
  hiddenCodeInput: {
    position: 'absolute',
    opacity: 0.01,
    width: 1,
    height: 1,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  codeCell: {
    flex: 1,
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: {
    ...typography.h3,
    fontFamily: fontFamily.sansBold,
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
  cta: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  ctaText: {
    ...typography.button,
    fontWeight: '700',
  },
});

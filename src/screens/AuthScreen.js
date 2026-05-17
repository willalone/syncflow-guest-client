import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
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
import { applyPhoneMask, isValidEmailForSyncflow, normalizeEmailForApi } from '../utils/inputMasks';
import { usePasswordRecovery } from '../hooks/usePasswordRecovery';
import BrandHeaderAccent from '../components/BrandHeaderAccent';
import AuthAtmosphereBackground from '../components/AuthAtmosphereBackground';
import { CLIENT_APP_TITLE, CLIENT_BRAND_KICKER } from '../constants/venue';
import AuthModeSegment from './auth/AuthModeSegment';
import PasswordRecoveryModal from './auth/PasswordRecoveryModal';

const isSyncflowBackend = runtimeConfig.integratedBackend === 'syncflow';

export default function AuthScreen({ onBackToMenu }) {
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

  const recovery = usePasswordRecovery({
    requestPasswordRecovery,
    confirmPasswordRecovery,
    onLoginPasswordsCleared: () => {
      setPassword('');
      setConfirmPassword('');
    },
  });

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
          if (email.trim() && !isValidEmailForSyncflow(email)) {
            throw new Error(
              'Введите email латиницей (как на сервере). Уберите лишние пробелы и скрытые символы после копирования.',
            );
          }
          await signUp({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            login: login.trim(),
            password,
            email: email.trim() ? normalizeEmailForApi(email) : undefined,
          });
        } else {
          if (!login.trim()) {
            throw new Error('Укажите логин');
          }
          await signIn({ login: login.trim(), password });
        }
      } else {
        if (String(phone).replace(/\D/g, '').length < 11) {
          throw new Error('Введите логин полностью');
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
            {typeof onBackToMenu === 'function' ? (
              <TouchableOpacity onPress={onBackToMenu} style={styles.backToMenuBtn} activeOpacity={0.85}>
                <Text style={[styles.backToMenuText, { color: colors.textLight }]}>← Вернуться к меню</Text>
              </TouchableOpacity>
            ) : null}
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
                  <AuthModeSegment
                    styles={styles}
                    colors={colors}
                    fontFamily={fontFamily}
                    segmentHalf={segmentHalf}
                    pillX={pillX}
                    isRegisterMode={isRegisterMode}
                    setIsRegisterMode={setIsRegisterMode}
                    setAuthError={setAuthError}
                    onSegmentLayout={(e) => {
                      const w = e.nativeEvent.layout.width;
                      const inset = 3;
                      const inner = Math.max(0, w - inset * 2);
                      setSegmentHalf(inner / 2);
                    }}
                  />

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
                      placeholder="Логин"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="default"
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
                    <TouchableOpacity
                      onPress={() => recovery.openWithEmailHint(email)}
                      activeOpacity={0.8}
                      style={styles.forgotBtn}
                    >
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
      <PasswordRecoveryModal
        visible={recovery.forgotVisible}
        blurIntensity={blurIntensity}
        blurTint={blurTint}
        isDarkMode={isDarkMode}
        colors={colors}
        recoveryEmail={recovery.recoveryEmail}
        setRecoveryEmail={recovery.setRecoveryEmail}
        recoveryStage={recovery.recoveryStage}
        recoveryCode={recovery.recoveryCode}
        setRecoveryCode={recovery.setRecoveryCode}
        recoveryPassword={recovery.recoveryPassword}
        setRecoveryPassword={recovery.setRecoveryPassword}
        recoveryConfirmPassword={recovery.recoveryConfirmPassword}
        setRecoveryConfirmPassword={recovery.setRecoveryConfirmPassword}
        recoveryError={recovery.recoveryError}
        recoverySuccess={recovery.recoverySuccess}
        recoveryLoading={recovery.recoveryLoading}
        closeForgotModal={recovery.closeForgotModal}
        requestRecoveryCode={recovery.requestRecoveryCode}
        submitRecovery={recovery.submitRecovery}
      />
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
  backToMenuBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backToMenuText: {
    ...typography.caption,
    fontFamily: fontFamily.sansMedium,
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

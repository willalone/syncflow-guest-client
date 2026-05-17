import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors, getShadows, spacing, borderRadius, typography } from '../constants/theme';
import BrandHeaderAccent from '../components/BrandHeaderAccent';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useClientData } from '../contexts/ClientDataContext';
import { applyDateMask, applyPhoneMask, isValidDateMask } from '../utils/inputMasks';
import { runtimeConfig } from '../config/runtimeConfig';
import * as clientApi from '../services/api/clientApi';
import ProfileHeaderCard from './profile/ProfileHeaderCard';
import ProfileStatsCard from './profile/ProfileStatsCard';
import ProfileHistorySection, { ProfileHistoryCard } from './profile/ProfileHistorySection';
import DeleteAccountModal from './profile/DeleteAccountModal';

export default function ProfileScreen({
  onOpenNotifications,
  onOpenBookings,
  onOpenOrders,
}) {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, signOut, updateAccount, deleteAccount, refreshSessionFromStorage } = useAuth();
  const { bookings, orders, profile, saveProfile, favorites, notifications, notificationsUnreadCount } = useClientData();
  const isSyncflowBackend = runtimeConfig.integratedBackend === 'syncflow';
  const colors = getColors(isDarkMode);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    login: '',
    email: '',
    phoneNumber: '',
    password: '',
  });
  const [saveStatus, setSaveStatus] = useState('');
  const [saveStatusIsError, setSaveStatusIsError] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDeleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [bonusTransactions, setBonusTransactions] = useState([]);

  useEffect(() => {
    setForm({
      firstName: profile?.firstName || user?.firstName || user?.name || '',
      lastName: profile?.lastName || '',
      birthDate: profile?.birthDate || '',
      login: profile?.login || user?.login || '',
      email: profile?.email || user?.email || '',
      phoneNumber: profile?.phoneNumber || profile?.phone || user?.phoneNumber || user?.phone || '',
      password: '',
    });
  }, [profile, user]);

  useEffect(() => {
    if (!isSyncflowBackend || !user?.id) {
      setBonusTransactions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await clientApi.fetchBonusTransactions(user.id);
        if (!cancelled) setBonusTransactions(Array.isArray(rows) ? rows.slice(0, 8) : []);
      } catch {
        if (!cancelled) setBonusTransactions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSyncflowBackend, user?.id]);

  const fullName = useMemo(() => {
    const parts = [form.firstName, form.lastName].filter(Boolean);
    return parts.join(' ') || profile?.displayName || user?.login || user?.name || '';
  }, [form.firstName, form.lastName, profile?.displayName, user]);

  const xpPointsRaw = profile?.xpPoints;
  const hasXpData = xpPointsRaw != null && Number.isFinite(Number(xpPointsRaw));
  const xpPoints = hasXpData ? Number(xpPointsRaw) : null;
  const loyaltyLevel = useMemo(() => {
    if (xpPoints == null) return '';
    if (xpPoints >= 800) return 'Легенда';
    if (xpPoints >= 400) return 'Эксперт';
    if (xpPoints >= 150) return 'Постоянный гость';
    return 'Новичок';
  }, [xpPoints]);

  const onSaveProfile = useCallback(async () => {
    setSaveStatusIsError(false);
    if (form.birthDate && !isValidDateMask(form.birthDate)) {
      setSaveStatusIsError(true);
      setSaveStatus('Проверьте дату рождения: формат ДД.ММ.ГГГГ');
      return;
    }
    const profilePatch = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      birthDate: form.birthDate.trim(),
      login: form.login.trim(),
      email: form.email.trim(),
      ...(isSyncflowBackend ? { phoneNumber: form.phoneNumber.trim() } : {}),
    };
    setIsSavingProfile(true);
    setSaveStatus('');
    try {
      await saveProfile(profilePatch);
      if (!isSyncflowBackend) {
        const accountPatch = {
          name: [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ') || form.firstName.trim(),
          phoneRaw: form.login.trim(),
        };
        if (form.password.trim()) {
          accountPatch.password = form.password.trim();
        }
        await updateAccount(accountPatch);
      } else if (typeof refreshSessionFromStorage === 'function') {
        await refreshSessionFromStorage();
      }
      setSaveStatusIsError(false);
      setSaveStatus('Данные профиля сохранены');
      setForm((prev) => ({ ...prev, password: '' }));
    } catch (error) {
      setSaveStatusIsError(true);
      setSaveStatus(error?.message || 'Не удалось сохранить профиль. Проверьте сеть и попробуйте снова.');
    } finally {
      setIsSavingProfile(false);
    }
  }, [form, isSyncflowBackend, saveProfile, updateAccount, refreshSessionFromStorage]);

  const onDeleteAccount = useCallback(async () => {
    try {
      await deleteAccount();
    } catch (error) {
      setSaveStatusIsError(true);
      setSaveStatus(error?.message || 'Не удалось удалить аккаунт. Повторите попытку позже.');
    } finally {
      setDeleteConfirmVisible(false);
    }
  }, [deleteAccount]);

  const notificationsPreview = useMemo(() => notifications.slice(0, 1), [notifications]);
  const bookingsPreview = useMemo(() => bookings.slice(0, 1), [bookings]);
  const ordersPreview = useMemo(() => orders.slice(0, 1), [orders]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, shadowsThemed.small, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <BrandHeaderAccent kicker="ВАШ КАБИНЕТ" />
        <Text style={[styles.title, { color: colors.text }]}>Профиль</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
      >
        <ProfileHeaderCard colors={colors} shadowsThemed={shadowsThemed} fullName={fullName} role={profile?.role} />

        <ProfileStatsCard
          colors={colors}
          shadowsThemed={shadowsThemed}
          loyaltyPoints={profile?.loyaltyPoints}
          hasXpData={hasXpData}
          xpPoints={xpPoints}
          loyaltyLevel={loyaltyLevel}
          discountPercentage={profile?.discountPercentage}
          visitCount={profile?.visitCount}
          registrationDate={profile?.registrationDate}
        />

        {isSyncflowBackend && bonusTransactions.length ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>История бонусов</Text>
            {bonusTransactions.map((tx) => (
              <View
                key={tx.id}
                style={[styles.bonusTxRow, { borderColor: colors.border, backgroundColor: colors.backgroundLight }]}
              >
                <Text style={[styles.historyTitle, { color: colors.text }]}>
                  {tx.type === 'SPENDING' ? 'Списание' : 'Начисление'}: {tx.amount >= 0 ? '+' : ''}
                  {tx.amount} балл.
                </Text>
                <Text style={[styles.historyText, { color: colors.textLight }]}>
                  {tx.description || (tx.orderId ? `Заказ №${tx.orderId}` : '')}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Личные данные</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundLight }]}
            placeholder="Имя"
            placeholderTextColor={colors.textMuted}
            value={form.firstName}
            onChangeText={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundLight }]}
            placeholder="Фамилия"
            placeholderTextColor={colors.textMuted}
            value={form.lastName}
            onChangeText={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundLight }]}
            placeholder="Дата рождения (ДД.ММ.ГГГГ)"
            placeholderTextColor={colors.textMuted}
            value={form.birthDate}
            onChangeText={(value) => setForm((prev) => ({ ...prev, birthDate: applyDateMask(value) }))}
            keyboardType="number-pad"
            maxLength={10}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundLight }]}
            placeholder="Логин"
            placeholderTextColor={colors.textMuted}
            value={form.login}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, login: isSyncflowBackend ? value : applyPhoneMask(value) }))
            }
            keyboardType="default"
          />
          {isSyncflowBackend ? (
            <>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundLight }]}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={form.email}
                onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundLight }]}
                placeholder="Телефон для бронирования (+7…)"
                placeholderTextColor={colors.textMuted}
                value={form.phoneNumber}
                onChangeText={(value) => setForm((prev) => ({ ...prev, phoneNumber: value }))}
                keyboardType="phone-pad"
              />
            </>
          ) : null}
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundLight }]}
            placeholder="Новый пароль"
            placeholderTextColor={colors.textMuted}
            value={form.password}
            secureTextEntry
            textContentType="oneTimeCode"
            autoComplete="off"
            onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
          />
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isSavingProfile ? 0.65 : 1 }]}
            onPress={onSaveProfile}
            disabled={isSavingProfile}
          >
            <Text style={[styles.saveButtonText, { color: colors.black }]}>
              {isSavingProfile ? 'Сохранение…' : 'Сохранить изменения'}
            </Text>
          </TouchableOpacity>
          {Boolean(saveStatus) && (
            <Text style={[styles.saveStatus, { color: saveStatusIsError ? colors.error : colors.success }]}>{saveStatus}</Text>
          )}
        </View>

        <ProfileHistorySection
          colors={colors}
          title={`Уведомления${notificationsUnreadCount > 0 ? ` · ${notificationsUnreadCount}` : ''}`}
          onOpen={onOpenNotifications}
        >
          {notificationsPreview.map((item) => (
            <ProfileHistoryCard key={item.id} colors={colors}>
              <Text style={[styles.historyTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.historyText, { color: colors.textLight }]}>{item.text}</Text>
            </ProfileHistoryCard>
          ))}
        </ProfileHistorySection>

        <ProfileHistorySection colors={colors} title={`Мои бронирования (${bookings.length})`} onOpen={onOpenBookings}>
          {bookingsPreview.map((booking) => (
            <ProfileHistoryCard key={booking.id} colors={colors}>
              <Text style={[styles.historyTitle, { color: colors.text }]}>{booking.date} в {booking.time}</Text>
              <Text style={[styles.historyText, { color: colors.textLight }]}>
                Гостей: {booking.people != null ? booking.people : '—'} • Адрес: {booking.address || '—'}
              </Text>
              {booking.preorder?.items?.length ? (
                <Text style={[styles.historyText, { color: colors.textLight }]}>
                  Предзаказ: {booking.preorder.items.length} поз. • подача {booking.preorder.servingTime || booking.time}
                </Text>
              ) : null}
            </ProfileHistoryCard>
          ))}
        </ProfileHistorySection>

        <ProfileHistorySection
          colors={colors}
          title={`Мои заказы (${orders.length})`}
          onOpen={onOpenOrders}
          meta={`Избранное: ${favorites.length}`}
        >
          {ordersPreview.map((order) => (
            <ProfileHistoryCard key={order.id} colors={colors}>
              <Text style={[styles.historyTitle, { color: colors.text }]}>Сумма: {order.total} руб.</Text>
              <Text style={[styles.historyText, { color: colors.textLight }]}>
                Адрес: {order.bookingDraft?.address || 'не указан'} • Бонусы: -{order.bonusSpent || 0} / +{order.bonusEarned || 0}
              </Text>
              <Text style={[styles.historyText, { color: colors.textLight }]}>
                XP: +{order.xpEarned || 0} • Состав: {(order.items || []).map((item) => `${item.title} x${item.quantity}`).join(', ')}
              </Text>
              <Text style={[styles.historyText, { color: colors.textLight }]}>
                Статус оплаты: {order.paymentStatus === 'paid' ? 'Оплачен' : 'Ожидание оплаты'}
              </Text>
            </ProfileHistoryCard>
          ))}
        </ProfileHistorySection>
        <TouchableOpacity
          style={[styles.themeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={toggleTheme}
        >
          <Text style={[styles.themeButtonText, { color: colors.text }]}>
            Тема: {isDarkMode ? 'Темная' : 'Светлая'} (нажмите для смены)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.error }]}
          onPress={signOut}
        >
          <Text style={[styles.logoutText, { color: colors.white }]}>Выйти из аккаунта</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={() => setDeleteConfirmVisible(true)}
        >
          <Text style={[styles.deleteText, { color: colors.error }]}>Удалить аккаунт</Text>
        </TouchableOpacity>
      </ScrollView>
      <DeleteAccountModal
        visible={isDeleteConfirmVisible}
        colors={colors}
        onDelete={onDeleteAccount}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    ...typography.h2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  themeButton: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  themeButtonText: {
    ...typography.body,
    fontWeight: '500',
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    ...typography.body,
  },
  saveButton: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  saveButtonText: {
    ...typography.button,
    fontWeight: '700',
  },
  saveStatus: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  historyTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  historyText: {
    ...typography.caption,
  },
  bonusTxRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  logoutButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  logoutText: {
    ...typography.button,
    fontWeight: '700',
  },
  deleteButton: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  deleteText: {
    ...typography.button,
    fontWeight: '700',
  },
});


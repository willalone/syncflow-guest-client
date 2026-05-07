import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors, getShadows, spacing, borderRadius, typography } from '../constants/theme';
import BrandHeaderAccent from '../components/BrandHeaderAccent';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useClientData } from '../contexts/ClientDataContext';
import { applyDateMask, applyPhoneMask, isValidDateMask } from '../utils/inputMasks';
import { runtimeConfig } from '../config/runtimeConfig';

export default function ProfileScreen({
  onOpenNotifications,
  onOpenBookings,
  onOpenOrders,
  onOpenDeliveries,
  onSendTestPush,
}) {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, signOut, updateAccount, deleteAccount } = useAuth();
  const { bookings, orders, profile, saveProfile, favorites, notifications } = useClientData();
  const isSyncflowBackend = runtimeConfig.integratedBackend === 'syncflow';
  const colors = getColors(isDarkMode);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    login: '',
    email: '',
    password: '',
  });
  const [saveStatus, setSaveStatus] = useState('');
  const [isDeleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  useEffect(() => {
    setForm({
      firstName: profile?.firstName || user?.firstName || user?.name || '',
      lastName: profile?.lastName || '',
      birthDate: profile?.birthDate || '',
      login: profile?.login || user?.login || user?.phone || '',
      email: profile?.email || user?.email || '',
      password: '',
    });
  }, [profile, user]);

  const fullName = useMemo(() => {
    const parts = [form.firstName, form.lastName].filter(Boolean);
    return parts.join(' ') || profile?.displayName || user?.login || user?.name || 'Гость';
  }, [form.firstName, form.lastName, profile?.displayName, user]);

  const xpPoints = Number(profile?.xpPoints || 0);
  const deliveryOrders = useMemo(
    () => (orders || []).filter((order) => String(order.orderType || '') === 'delivery'),
    [orders]
  );
  const loyaltyLevel = useMemo(() => {
    if (xpPoints >= 800) return 'Легенда';
    if (xpPoints >= 400) return 'Эксперт';
    if (xpPoints >= 150) return 'Постоянный гость';
    return 'Новичок';
  }, [xpPoints]);

  const onSaveProfile = async () => {
    if (form.birthDate && !isValidDateMask(form.birthDate)) {
      setSaveStatus('Проверьте дату рождения: формат ДД.ММ.ГГГГ');
      return;
    }
    const profilePatch = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      birthDate: form.birthDate.trim(),
      login: form.login.trim(),
      email: form.email.trim(),
    };
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
    }
    setSaveStatus('Данные профиля сохранены');
    setForm((prev) => ({ ...prev, password: '' }));
  };

  const onDeleteAccount = async () => {
    try {
      await deleteAccount();
    } catch (error) {
      setSaveStatus(error?.message || 'Не удалось удалить аккаунт. Повторите попытку позже.');
    } finally {
      setDeleteConfirmVisible(false);
    }
  };

  const pickAvatarFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSaveStatus('Нет доступа к галерее. Разрешите доступ в настройках телефона.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    const uri = String(result.assets[0].uri || '');
    if (!uri) return;
    await saveProfile({ avatarUrl: uri });
    setSaveStatus('Фотография профиля обновлена');
  };

  const pickAvatarFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setSaveStatus('Нет доступа к камере. Разрешите доступ в настройках телефона.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    const uri = String(result.assets[0].uri || '');
    if (!uri) return;
    await saveProfile({ avatarUrl: uri });
    setSaveStatus('Фотография профиля обновлена');
  };

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
        <View
          style={[
            styles.profileCard,
            shadowsThemed.float,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.profileHeader}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.avatar, shadowsThemed.small, { backgroundColor: colors.cardElevated }]}
              onPress={pickAvatarFromGallery}
            >
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: colors.primaryDark }]}>ИИ</Text>
              )}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>{fullName}</Text>
              <Text style={[styles.profileRole, { color: colors.textLight }]}>{profile?.role || 'Постоянный гость'}</Text>
              <Text style={[styles.profileShift, { color: colors.warning }]}>Рейтинг: 4.9</Text>
              <View style={styles.avatarActions}>
                <TouchableOpacity
                  style={[styles.avatarBtn, { backgroundColor: colors.backgroundLight, borderColor: colors.border }]}
                  onPress={pickAvatarFromCamera}
                >
                  <Text style={[styles.avatarBtnText, { color: colors.text }]}>Сделать фото</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.avatarBtn, { backgroundColor: colors.backgroundLight, borderColor: colors.border }]}
                  onPress={pickAvatarFromGallery}
                >
                  <Text style={[styles.avatarBtnText, { color: colors.text }]}>Выбрать из галереи</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statsCard,
            shadowsThemed.float,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.statsTitle, { color: colors.text }]}>Бонусный баланс</Text>
          <Text style={[styles.bonusValue, { color: colors.primary }]}>{profile?.loyaltyPoints ?? 0} баллов</Text>
          <Text style={[styles.xpValue, { color: colors.info }]}>Опыт: {xpPoints} XP • Уровень: {loyaltyLevel}</Text>
          <View style={[styles.progressBackground, { backgroundColor: colors.background }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.progressLabel, { color: colors.textLight }]}>
            1 балл = 1 рубль. Списание до 50% чека. XP начисляется отдельно.
          </Text>
        </View>

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
            placeholder={isSyncflowBackend ? 'Логин' : 'Логин/телефон'}
            placeholderTextColor={colors.textMuted}
            value={form.login}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, login: isSyncflowBackend ? value : applyPhoneMask(value) }))
            }
            keyboardType={isSyncflowBackend ? 'default' : 'phone-pad'}
          />
          {isSyncflowBackend ? (
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
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={onSaveProfile}>
            <Text style={[styles.saveButtonText, { color: colors.black }]}>Сохранить изменения</Text>
          </TouchableOpacity>
          {Boolean(saveStatus) && <Text style={[styles.saveStatus, { color: colors.success }]}>{saveStatus}</Text>}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Уведомления</Text>
            <TouchableOpacity onPress={onOpenNotifications}>
              <Text style={[styles.linkText, { color: colors.primaryDark }]}>Смотреть все</Text>
            </TouchableOpacity>
          </View>
          {notifications.slice(0, 1).map((item) => (
            <View key={item.id} style={[styles.historyCard, { borderColor: colors.border, backgroundColor: colors.backgroundLight }]}>
              <Text style={[styles.historyTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.historyText, { color: colors.textLight }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Мои бронирования ({bookings.length})</Text>
            <TouchableOpacity onPress={onOpenBookings}>
              <Text style={[styles.linkText, { color: colors.primaryDark }]}>Смотреть все</Text>
            </TouchableOpacity>
          </View>
          {bookings.slice(0, 1).map((booking) => (
            <View key={booking.id} style={[styles.historyCard, { borderColor: colors.border, backgroundColor: colors.backgroundLight }]}>
              <Text style={[styles.historyTitle, { color: colors.text }]}>{booking.date} в {booking.time}</Text>
              <Text style={[styles.historyText, { color: colors.textLight }]}>
                Гостей: {booking.people} • Адрес: {booking.address || 'не указан'}
              </Text>
              {booking.preorder?.items?.length ? (
                <Text style={[styles.historyText, { color: colors.textLight }]}>
                  Предзаказ: {booking.preorder.items.length} поз. • подача {booking.preorder.servingTime || booking.time}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Мои заказы ({orders.length})</Text>
            <TouchableOpacity onPress={onOpenOrders}>
              <Text style={[styles.linkText, { color: colors.primaryDark }]}>Смотреть все</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionMeta, { color: colors.textLight }]}>Избранное: {favorites.length}</Text>
          {orders.slice(0, 1).map((order) => (
            <View key={order.id} style={[styles.historyCard, { borderColor: colors.border, backgroundColor: colors.backgroundLight }]}>
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
            </View>
          ))}
        </View>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Мои доставки ({deliveryOrders.length})</Text>
            <TouchableOpacity onPress={onOpenDeliveries}>
              <Text style={[styles.linkText, { color: colors.primaryDark }]}>Смотреть все</Text>
            </TouchableOpacity>
          </View>
          {deliveryOrders.slice(0, 1).map((order) => (
            <View key={order.id} style={[styles.historyCard, { borderColor: colors.border, backgroundColor: colors.backgroundLight }]}>
              <Text style={[styles.historyTitle, { color: colors.text }]}>Сумма: {order.total} руб.</Text>
              <Text style={[styles.historyText, { color: colors.textLight }]}>
                Город: {order?.deliveryDetails?.city || 'не указан'} • Улица: {order?.deliveryDetails?.addressLine || order?.bookingDraft?.address || 'не указан'}
              </Text>
              <Text style={[styles.historyText, { color: colors.textLight }]}>
                Статус: {order?.deliveryStatus || 'создано'}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.themeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={toggleTheme}
        >
          <Text style={[styles.themeButtonText, { color: colors.text }]}>
            Тема: {isDarkMode ? 'Темная' : 'Светлая'} (нажмите для смены)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.themeButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: spacing.sm }]}
          onPress={onSendTestPush}
        >
          <Text style={[styles.themeButtonText, { color: colors.text }]}>
            Отправить тестовое push-уведомление
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
      <Modal transparent visible={isDeleteConfirmVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Удалить аккаунт?</Text>
            <Text style={[styles.modalText, { color: colors.textLight }]}>
              Аккаунт и связанные данные будут удалены. Это действие нельзя отменить.
            </Text>
            <TouchableOpacity style={[styles.modalDangerBtn, { backgroundColor: colors.error }]} onPress={onDeleteAccount}>
              <Text style={[styles.modalDangerText, { color: colors.white }]}>Удалить</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              onPress={() => setDeleteConfirmVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.text }]}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  profileCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  avatarText: {
    ...typography.h3,
    fontWeight: '700',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
  },
  profileInfo: {
    flex: 1,
  },
  avatarActions: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  avatarBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  avatarBtnText: {
    ...typography.caption,
    fontWeight: '600',
  },
  profileName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  profileRole: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  profileShift: {
    ...typography.caption,
  },
  statsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statsTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  bonusValue: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  xpValue: {
    ...typography.caption,
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  progressBackground: {
    height: 8,
    borderRadius: borderRadius.round,
    marginBottom: spacing.sm,
  },
  progressFill: {
    width: '72%',
    height: '100%',
    borderRadius: borderRadius.round,
  },
  progressLabel: {
    ...typography.caption,
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
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { ...typography.caption, fontWeight: '700' },
  sectionMeta: {
    ...typography.caption,
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
  historyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  historyTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  historyText: {
    ...typography.caption,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  modalTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  modalText: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  modalDangerBtn: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  modalDangerText: {
    ...typography.button,
    fontWeight: '700',
  },
  modalCancelBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  modalCancelText: {
    ...typography.button,
    fontWeight: '600',
  },
});


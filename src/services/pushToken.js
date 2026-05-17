import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export async function getNativePushToken() {
  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current?.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested?.status;
    }
    if (status !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = String(tokenData?.data || tokenData || '').trim();
    return token || null;
  } catch {
    return null;
  }
}

import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

try {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
} catch {
  // Expo Go SDK 53+: ограничения push — не блокируем запуск UI.
}

registerRootComponent(App);


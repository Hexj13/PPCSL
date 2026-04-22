import { Platform } from 'react-native';

import { mobileDevicesApi } from '@/api/devices';

let notificationHandlerConfigured = false;

export async function registerPushWithBackend(): Promise<void> {
  if (Platform.OS === 'web') return;

  const Notifications = await import('expo-notifications');

  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;
  if (!token) return;

  await mobileDevicesApi.register({
    pushToken: token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
}

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { registerForPushNotificationsAsync, addNotificationListeners } from '../services/notifications';

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync();

    const removeListeners = addNotificationListeners(
      (notification) => {
        console.log('Notification received:', notification);
      },
      (response) => {
        console.log('Notification clicked:', response);
      }
    );

    return () => removeListeners();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1a1a1a' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome/index" />
        <Stack.Screen name="signin/index" />
        <Stack.Screen name="signup/index" />
        <Stack.Screen name="scanner/index" />
        <Stack.Screen name="charts/index" />
        <Stack.Screen name="reminders/index" />
        <Stack.Screen name="subscription/index" />
        <Stack.Screen name="history/index" />
        <Stack.Screen name="about/index" />
        <Stack.Screen name="profile/index" />
      </Stack>
    </SafeAreaProvider>
  );
}

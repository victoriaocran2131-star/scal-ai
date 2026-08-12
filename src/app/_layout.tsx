import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
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
        <Stack.Screen name="history/index" />
        <Stack.Screen name="about/index" />
      </Stack>
    </SafeAreaProvider>
  );
}

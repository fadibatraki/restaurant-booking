import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/auth-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'تسجيل الدخول' }} />
        <Stack.Screen name="register" options={{ title: 'إنشاء حساب' }} />
        <Stack.Screen name="restaurants/[id]" options={{ title: 'الحجز' }} />
        <Stack.Screen name="reservations/my" options={{ title: 'حجوزاتي' }} />
        <Stack.Screen name="notifications/index" options={{ title: 'الإشعارات' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </AuthProvider>
  );
}

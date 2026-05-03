import { Redirect, router, usePathname } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppHeader } from '@/components/ui/app-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function AccountScreen() {
  const { isLoading, logout, user } = useAuth();
  const pathname = usePathname();

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  if (isLoading) {
    return (
      <AppScreen style={styles.center}>
        <ActivityIndicator color={AppTheme.colors.primary} />
      </AppScreen>
    );
  }

  if (!user) {
    return <Redirect href={{ pathname: '/login', params: { redirectTo: pathname } }} />;
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <AppHeader
          eyebrow="حساب العميل"
          title="الحساب"
          subtitle="إدارة بيانات الدخول والخروج من حسابك."
        />
      </View>

      <View style={styles.content}>
        <AppCard style={styles.card}>
          <View style={styles.infoRow}>
            <ThemedText style={styles.value}>{user.name}</ThemedText>
            <ThemedText style={styles.label}>الاسم</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.value}>{user.email}</ThemedText>
            <ThemedText style={styles.label}>البريد الإلكتروني</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.value}>{user.role}</ThemedText>
            <ThemedText style={styles.label}>نوع الحساب</ThemedText>
          </View>
        </AppCard>

        <AppButton onPress={handleLogout}>تسجيل الخروج</AppButton>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: AppTheme.spacing[5],
    paddingTop: AppTheme.spacing[6],
    paddingBottom: AppTheme.spacing[5],
  },
  content: {
    paddingHorizontal: AppTheme.spacing[4],
    gap: AppTheme.spacing[4],
  },
  card: {
    alignItems: 'flex-end',
  },
  infoRow: {
    width: '100%',
    gap: AppTheme.spacing[1],
    alignItems: 'flex-end',
  },
  label: {
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  value: {
    color: AppTheme.colors.textSecondary,
    textAlign: 'right',
  },
});

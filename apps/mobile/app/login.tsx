import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppHeader } from '@/components/ui/app-header';
import { AppInput } from '@/components/ui/app-input';
import { AppScreen } from '@/components/ui/app-screen';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const params = useLocalSearchParams<{ redirectTo?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    const trimmedEmail = email.trim();

    setError(null);

    if (!trimmedEmail) {
      setError('البريد الإلكتروني مطلوب');
      return;
    }

    if (!password) {
      setError('كلمة المرور مطلوبة');
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: trimmedEmail,
        password,
      });

      const redirectTo = Array.isArray(params.redirectTo) ? params.redirectTo[0] : params.redirectTo;
      router.replace(redirectTo?.startsWith('/') ? (redirectTo as Href) : '/');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'تعذر تسجيل الدخول');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppScreen style={styles.screen}>
      <AppCard style={styles.card}>
        <AppHeader
          eyebrow="حساب العميل"
          title="تسجيل الدخول"
          subtitle="ادخل بحسابك لإكمال حجز الطاولة."
        />

        <View style={styles.form}>
          <AppInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="البريد الإلكتروني"
            value={email}
          />
          <AppInput
            onChangeText={setPassword}
            placeholder="كلمة المرور"
            secureTextEntry
            value={password}
          />

          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

          <AppButton disabled={isSubmitting} onPress={handleLogin}>
            {isSubmitting ? 'جاري الدخول...' : 'دخول'}
          </AppButton>
          {isSubmitting ? <ActivityIndicator color={AppTheme.colors.primary} /> : null}

          <AppButton
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/register',
                params: params.redirectTo ? { redirectTo: params.redirectTo } : {},
              })
            }>
            إنشاء حساب جديد
          </AppButton>

          <AppButton variant="secondary" onPress={() => router.replace('/')}>
            العودة للمطاعم
          </AppButton>
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
    padding: AppTheme.spacing[5],
  },
  card: {
    gap: AppTheme.spacing[6],
  },
  form: {
    gap: AppTheme.spacing[3],
  },
  error: {
    color: AppTheme.colors.error,
    fontWeight: '700',
    textAlign: 'right',
  },
});

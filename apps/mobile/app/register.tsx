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
import { register } from '@/lib/api';

function getRedirectTarget(value: string | string[] | undefined): Href {
  const redirectTo = Array.isArray(value) ? value[0] : value;
  return redirectTo?.startsWith('/') ? (redirectTo as Href) : '/';
}

export default function RegisterScreen() {
  const { login } = useAuth();
  const params = useLocalSearchParams<{ redirectTo?: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    setError(null);

    if (trimmedName.length < 2) {
      setError('الاسم مطلوب ويجب أن يكون من حرفين على الأقل');
      return;
    }

    if (!trimmedEmail) {
      setError('البريد الإلكتروني مطلوب');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      });
      await login({
        email: trimmedEmail,
        password,
      });
      router.replace(getRedirectTarget(params.redirectTo));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'تعذر إنشاء الحساب');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppScreen style={styles.screen}>
      <AppCard style={styles.card}>
        <AppHeader
          eyebrow="حساب جديد"
          title="إنشاء حساب"
          subtitle="أنشئ حساب عميل واحجز طاولتك خلال لحظات."
        />

        <View style={styles.form}>
          <AppInput label="الاسم" onChangeText={setName} placeholder="اسمك الكامل" value={name} />
          <AppInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="البريد الإلكتروني"
            onChangeText={setEmail}
            placeholder="customer@example.com"
            value={email}
          />
          <AppInput
            label="كلمة المرور"
            onChangeText={setPassword}
            placeholder="6 أحرف على الأقل"
            secureTextEntry
            value={password}
          />
          <AppInput
            keyboardType="phone-pad"
            label="رقم الهاتف"
            onChangeText={setPhone}
            placeholder="اختياري"
            value={phone}
          />

          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

          <AppButton disabled={isSubmitting} onPress={handleRegister}>
            {isSubmitting ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
          </AppButton>
          {isSubmitting ? <ActivityIndicator color={AppTheme.colors.primary} /> : null}

          <AppButton
            variant="secondary"
            onPress={() =>
              router.replace({
                pathname: '/login',
                params: params.redirectTo ? { redirectTo: params.redirectTo } : {},
              })
            }>
            لدي حساب بالفعل
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

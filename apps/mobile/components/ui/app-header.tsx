import { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppTheme } from '@/constants/theme';

type AppHeaderProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}>;

export function AppHeader({ children, eyebrow, title, subtitle, style }: AppHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {eyebrow ? <ThemedText style={styles.eyebrow}>{eyebrow}</ThemedText> : null}
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-end',
    gap: AppTheme.spacing[3],
  },
  eyebrow: {
    minHeight: 32,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: AppTheme.radius.pill,
    overflow: 'hidden',
    color: AppTheme.colors.primaryHover,
    backgroundColor: 'rgba(232, 93, 4, 0.1)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  title: {
    color: AppTheme.colors.text,
    textAlign: 'right',
  },
  subtitle: {
    color: AppTheme.colors.textSecondary,
    textAlign: 'right',
  },
});

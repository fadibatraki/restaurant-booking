import { PropsWithChildren } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppTheme } from '@/constants/theme';

type AppBadgeProps = PropsWithChildren<{
  tone?: 'primary' | 'success' | 'error' | 'neutral';
  style?: TextStyle;
}>;

export function AppBadge({ children, style, tone = 'primary' }: AppBadgeProps) {
  return <ThemedText style={[styles.badge, styles[tone], style]}>{children}</ThemedText>;
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppTheme.radius.pill,
    overflow: 'hidden',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  primary: {
    color: AppTheme.colors.primaryHover,
    backgroundColor: 'rgba(232, 93, 4, 0.1)',
  },
  success: {
    color: AppTheme.colors.success,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
  },
  error: {
    color: AppTheme.colors.error,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  neutral: {
    color: AppTheme.colors.text,
    backgroundColor: AppTheme.colors.surfaceAlt,
  },
});

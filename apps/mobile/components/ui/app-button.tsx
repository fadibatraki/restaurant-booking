import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppTheme } from '@/constants/theme';

type AppButtonProps = PropsWithChildren<
  PressableProps & {
    variant?: 'primary' | 'secondary' | 'ghost';
    style?: StyleProp<ViewStyle>;
  }
>;

export function AppButton({
  children,
  disabled,
  style,
  variant = 'primary',
  ...pressableProps
}: AppButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        variant === 'primary' ? AppTheme.shadow.primary : undefined,
        (pressed || disabled) && styles.pressed,
        style,
      ]}
      {...pressableProps}>
      <ThemedText style={[styles.text, variant === 'primary' ? styles.primaryText : styles.darkText]}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: AppTheme.spacing[5],
    borderRadius: AppTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: AppTheme.colors.primary,
  },
  secondary: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.75,
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryText: {
    color: AppTheme.colors.white,
  },
  darkText: {
    color: AppTheme.colors.text,
  },
});

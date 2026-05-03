import { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppTheme } from '@/constants/theme';

type AppCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

type AppPressableCardProps = PropsWithChildren<
  PressableProps & {
    style?: StyleProp<ViewStyle>;
  }
>;

export function AppCard({ children, style }: AppCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppPressableCard({ children, style, ...pressableProps }: AppPressableCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      {...pressableProps}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.9)',
    borderRadius: AppTheme.radius.lg,
    padding: AppTheme.spacing[5],
    gap: AppTheme.spacing[4],
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadow.soft,
  },
  pressed: {
    opacity: 0.8,
  },
});

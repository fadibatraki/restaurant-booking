import { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppTheme } from '@/constants/theme';

type AppScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function AppScreen({ children, style }: AppScreenProps) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
});

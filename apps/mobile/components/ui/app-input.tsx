import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppTheme } from '@/constants/theme';

type AppInputProps = TextInputProps & {
  label?: string;
};

export function AppInput({ label, style, ...inputProps }: AppInputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <ThemedText style={styles.label}>{label}</ThemedText> : null}
      <TextInput
        placeholderTextColor={AppTheme.colors.placeholder}
        style={[styles.input, style]}
        textAlign="right"
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: AppTheme.spacing[2],
  },
  label: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: AppTheme.spacing[4],
    paddingVertical: 14,
    color: AppTheme.colors.text,
    backgroundColor: AppTheme.colors.surface,
    fontSize: 16,
  },
});

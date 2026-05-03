import { Platform } from 'react-native';

export const AppTheme = {
  colors: {
    primary: '#E85D04',
    primaryHover: '#C84E04',
    accentSoft: '#FDBA74',
    background: '#FFF8F3',
    surface: '#FFFFFF',
    surfaceAlt: '#FEF1E8',
    text: '#111111',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    borderStrong: '#D4D7DD',
    success: '#16A34A',
    error: '#DC2626',
    placeholder: '#9CA3AF',
    white: '#FFFFFF',
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    pill: 999,
  },
  shadow: {
    soft: {
      shadowColor: '#111111',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.06,
      shadowRadius: 30,
      elevation: 2,
    },
    primary: {
      shadowColor: '#E85D04',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 3,
    },
  },
};

export const Colors = {
  light: {
    text: AppTheme.colors.text,
    background: AppTheme.colors.background,
    tint: AppTheme.colors.primary,
    icon: AppTheme.colors.textSecondary,
    tabIconDefault: AppTheme.colors.textSecondary,
    tabIconSelected: AppTheme.colors.primary,
  },
  dark: {
    text: AppTheme.colors.text,
    background: AppTheme.colors.background,
    tint: AppTheme.colors.primary,
    icon: AppTheme.colors.textSecondary,
    tabIconDefault: AppTheme.colors.textSecondary,
    tabIconSelected: AppTheme.colors.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

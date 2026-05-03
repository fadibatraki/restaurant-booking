import { Link, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppTheme } from '@/constants/theme';

type BottomNavItem = {
  href: Href;
  icon: ComponentProps<typeof IconSymbol>['name'];
  key: 'restaurants' | 'reservations' | 'account';
  label: string;
};

type MobileBottomNavProps = {
  activeTab?: BottomNavItem['key'];
};

const BASE_HEIGHT = Platform.select({ ios: 92, android: 88, default: 92 });

const navItems: BottomNavItem[] = [
  { key: 'restaurants', label: 'المطاعم', href: '/', icon: 'house.fill' },
  { key: 'reservations', label: 'حجوزاتي', href: '/reservations', icon: 'paperplane.fill' },
  { key: 'account', label: 'الحساب', href: '/account', icon: 'person.fill' },
];

export function MobileBottomNav({ activeTab }: MobileBottomNavProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, AppTheme.spacing[2]);

  return (
    <View style={[styles.nav, { height: BASE_HEIGHT + bottomInset, paddingBottom: bottomInset }]}>
      {navItems.map((item) => {
        const isActive = item.key === activeTab;
        const color = isActive ? AppTheme.colors.primary : AppTheme.colors.textSecondary;

        return (
          <Link asChild href={item.href} key={item.key}>
            <Pressable style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
              <IconSymbol size={24} name={item.icon} color={color} />
              <Text style={[styles.label, { color }]}>{item.label}</Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

export const MOBILE_BOTTOM_NAV_RESERVED_HEIGHT = BASE_HEIGHT + AppTheme.spacing[4];

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
    paddingTop: AppTheme.spacing[2],
  },
  item: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    paddingBottom: 4,
  },
  itemPressed: {
    opacity: 0.72,
  },
  label: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: true,
  },
});

import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppTheme } from '@/constants/theme';

function TabBarIconWithLabel({
  name,
  label,
  color,
}: {
  name: React.ComponentProps<typeof IconSymbol>['name'];
  label: string;
  color: string;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        paddingTop: 2,
      }}>
      <IconSymbol size={24} name={name} color={color} />
      <Text
        style={{
          marginTop: 3,
          fontSize: 12,
          lineHeight: 18,
          fontWeight: '700',
          color,
          textAlign: 'center',
          includeFontPadding: true,
        }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AppTheme.colors.primary,
        tabBarInactiveTintColor: AppTheme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: AppTheme.colors.surface,
          borderTopColor: AppTheme.colors.border,
          borderTopWidth: 1,
          height: Platform.select({ ios: 92, android: 88, default: 92 }),
          paddingTop: AppTheme.spacing[2],
          paddingBottom: AppTheme.spacing[3],
        },
        tabBarItemStyle: {
          paddingTop: 2,
          paddingBottom: 4,
        },
        tabBarShowLabel: false,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'المطاعم',
          tabBarIcon: ({ color }) => (
            <TabBarIconWithLabel name="house.fill" label="المطاعم" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'حجوزاتي',
          tabBarIcon: ({ color }) => (
            <TabBarIconWithLabel name="paperplane.fill" label="حجوزاتي" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'الحساب',
          tabBarIcon: ({ color }) => (
            <TabBarIconWithLabel name="person.fill" label="الحساب" color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}

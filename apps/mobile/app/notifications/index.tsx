import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, Stack, usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppHeader } from '@/components/ui/app-header';
import { AppScreen } from '@/components/ui/app-screen';
import { MOBILE_BOTTOM_NAV_RESERVED_HEIGHT, MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/api';
import { playNotificationSound } from '@/lib/notification-sound';
import type { Notification, NotificationType } from '@/lib/types';

const AUTO_REFRESH_INTERVAL_MS = 8000;

const notificationTypeMeta: Record<
  NotificationType,
  {
    icon: ComponentProps<typeof MaterialIcons>['name'];
    color: string;
    bg: string;
  }
> = {
  RESERVATION_CREATED: {
    icon: 'event-seat',
    color: AppTheme.colors.primary,
    bg: 'rgba(232, 93, 4, 0.12)',
  },
  RESERVATION_CANCELLED_BY_CUSTOMER: {
    icon: 'event-busy',
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.12)',
  },
  RESERVATION_CONFIRMED_BY_OWNER: {
    icon: 'verified',
    color: AppTheme.colors.success,
    bg: 'rgba(22, 163, 74, 0.14)',
  },
  RESERVATION_COMPLETED_BY_OWNER: {
    icon: 'task-alt',
    color: '#475569',
    bg: 'rgba(71, 85, 105, 0.14)',
  },
  RESERVATION_REJECTED_BY_OWNER: {
    icon: 'cancel',
    color: AppTheme.colors.error,
    bg: 'rgba(220, 38, 38, 0.14)',
  },
  RESERVATION_CANCELLED_BY_OWNER: {
    icon: 'highlight-off',
    color: AppTheme.colors.error,
    bg: 'rgba(220, 38, 38, 0.14)',
  },
};

function shouldShowNotification(notification: Notification) {
  return notification.type !== 'RESERVATION_COMPLETED_BY_OWNER';
}

function formatNotificationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ar-SY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function NotificationsScreen() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitializedUnreadRef = useRef(false);
  const knownUnreadIdsRef = useRef<Set<string>>(new Set());

  const loadNotifications = useCallback(
    async (isSilent = false) => {
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      if (!isSilent) {
        setError(null);
      }

      try {
        const response = await getMyNotifications(accessToken);
        setNotifications(response.filter(shouldShowNotification));
      } catch (caughtError) {
        if (!isSilent) {
          setError(caughtError instanceof Error ? caughtError.message : 'تعذر تحميل الإشعارات');
        }
      } finally {
        if (!isSilent) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (accessToken) {
      loadNotifications();
    }
  }, [accessToken, loadNotifications]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isStopped = false;
    const interval = setInterval(async () => {
      if (isStopped) {
        return;
      }

      await loadNotifications(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      isStopped = true;
      clearInterval(interval);
    };
  }, [accessToken, loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  useEffect(() => {
    const unreadIds = new Set(
      notifications.filter((notification) => !notification.isRead).map((notification) => notification.id)
    );

    if (!hasInitializedUnreadRef.current) {
      hasInitializedUnreadRef.current = true;
      knownUnreadIdsRef.current = unreadIds;
      return;
    }

    const hasNewUnread = Array.from(unreadIds).some((id) => !knownUnreadIdsRef.current.has(id));
    knownUnreadIdsRef.current = unreadIds;

    if (hasNewUnread) {
      void playNotificationSound();
    }
  }, [notifications]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadNotifications();
  }, [loadNotifications]);

  const handlePressNotification = useCallback(
    async (notification: Notification) => {
      if (!accessToken || notification.isRead) {
        return;
      }

      try {
        const updated = await markNotificationRead(notification.id, accessToken);
        setNotifications((previousNotifications) =>
          previousNotifications.map((item) => (item.id === updated.id ? updated : item))
        );
      } catch {
        // Ignore read errors to keep interaction smooth.
      }
    },
    [accessToken]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!accessToken || unreadCount === 0 || isMarkingAll) {
      return;
    }

    setIsMarkingAll(true);

    try {
      await markAllNotificationsRead(accessToken);
      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) => ({ ...notification, isRead: true }))
      );
    } catch {
      // Keep state unchanged on error.
    } finally {
      setIsMarkingAll(false);
    }
  }, [accessToken, isMarkingAll, unreadCount]);

  if (isAuthLoading) {
    return (
      <AppScreen style={styles.center}>
        <ActivityIndicator color={AppTheme.colors.primary} />
      </AppScreen>
    );
  }

  if (!accessToken) {
    return <Redirect href={{ pathname: '/login', params: { redirectTo: pathname } }} />;
  }

  return (
    <AppScreen>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerWrap}>
        <AppHeader
          eyebrow="تنبيهات الحساب"
          title="الإشعارات"
          subtitle="تابع كل جديد حول حجوزاتك مباشرة"
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppTheme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppCard style={styles.stateCard}>
            <ThemedText style={styles.error}>{error}</ThemedText>
            <AppButton variant="secondary" onPress={() => loadNotifications()}>
              إعادة المحاولة
            </AppButton>
          </AppCard>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={notifications}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.controlsRow}>
              <View style={styles.unreadSummary}>
                <ThemedText style={styles.unreadSummaryNumber}>{unreadCount}</ThemedText>
                <ThemedText style={styles.unreadSummaryText}>غير مقروء</ThemedText>
              </View>

              <Pressable
                disabled={unreadCount === 0 || isMarkingAll}
                onPress={handleMarkAllRead}
                style={({ pressed }) => [
                  styles.markAllButton,
                  (unreadCount === 0 || isMarkingAll) && styles.markAllButtonDisabled,
                  pressed && unreadCount > 0 && !isMarkingAll && styles.pressed,
                ]}>
                <ThemedText
                  style={[
                    styles.markAllButtonText,
                    (unreadCount === 0 || isMarkingAll) && styles.markAllButtonTextDisabled,
                  ]}>
                  {isMarkingAll ? 'جارٍ التعليم...' : 'تعيين الكل كمقروء'}
                </ThemedText>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <AppCard style={styles.emptyCard}>
              <MaterialIcons name="notifications-none" size={28} color={AppTheme.colors.placeholder} />
              <ThemedText style={styles.emptyTitle}>لا توجد إشعارات حاليا</ThemedText>
              <ThemedText style={styles.emptyText}>عند حدوث تحديثات على حجوزاتك ستظهر هنا مباشرة.</ThemedText>
            </AppCard>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor={AppTheme.colors.primary}
              onRefresh={handleRefresh}
            />
          }
          renderItem={({ item }) => {
            const meta = notificationTypeMeta[item.type];

            return (
              <Pressable
                onPress={() => handlePressNotification(item)}
                style={({ pressed }) => [
                  styles.notificationCard,
                  !item.isRead && styles.notificationCardUnread,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.notificationTopRow}>
                  <View style={styles.iconAndTitleRow}>
                    <View style={[styles.notificationIconWrap, { backgroundColor: meta.bg }]}>
                      <MaterialIcons name={meta.icon} size={19} color={meta.color} />
                    </View>
                    <ThemedText style={styles.notificationTitle}>{item.title}</ThemedText>
                  </View>

                  {!item.isRead ? <View style={styles.unreadDot} /> : null}
                </View>

                <ThemedText style={styles.notificationBody}>{item.body}</ThemedText>

                <View style={styles.notificationMetaRow}>
                  <ThemedText style={styles.notificationTime}>{formatNotificationTime(item.createdAt)}</ThemedText>
                  <ThemedText style={styles.readStateText}>{item.isRead ? 'مقروءة' : 'جديدة'}</ThemedText>
                </View>
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <MobileBottomNav />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppTheme.spacing[5],
  },
  headerWrap: {
    paddingTop: AppTheme.spacing[8],
    paddingBottom: AppTheme.spacing[3],
    paddingHorizontal: AppTheme.spacing[5],
  },
  stateCard: {
    alignItems: 'flex-end',
  },
  error: {
    color: AppTheme.colors.error,
    textAlign: 'right',
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: AppTheme.spacing[4],
    paddingBottom: MOBILE_BOTTOM_NAV_RESERVED_HEIGHT,
    gap: AppTheme.spacing[3],
  },
  controlsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppTheme.spacing[2],
  },
  unreadSummary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  unreadSummaryNumber: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: AppTheme.colors.text,
  },
  unreadSummaryText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: AppTheme.colors.textSecondary,
  },
  markAllButton: {
    borderRadius: AppTheme.radius.pill,
    backgroundColor: 'rgba(232, 93, 4, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  markAllButtonDisabled: {
    backgroundColor: 'rgba(156, 163, 175, 0.16)',
  },
  markAllButtonText: {
    color: AppTheme.colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  markAllButtonTextDisabled: {
    color: AppTheme.colors.placeholder,
  },
  notificationCard: {
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.9)',
    borderRadius: AppTheme.radius.lg,
    padding: AppTheme.spacing[4],
    backgroundColor: AppTheme.colors.surface,
    gap: AppTheme.spacing[2],
    ...AppTheme.shadow.soft,
  },
  notificationCardUnread: {
    borderColor: 'rgba(232, 93, 4, 0.4)',
    backgroundColor: '#FFFDFB',
  },
  notificationTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppTheme.spacing[2],
  },
  iconAndTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  notificationIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTitle: {
    flex: 1,
    textAlign: 'right',
    color: AppTheme.colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: AppTheme.colors.primary,
  },
  notificationBody: {
    color: AppTheme.colors.textSecondary,
    textAlign: 'right',
    fontSize: 14,
    lineHeight: 21,
  },
  notificationMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppTheme.spacing[2],
  },
  notificationTime: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right',
  },
  readStateText: {
    color: '#7C8597',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppTheme.spacing[2],
    paddingVertical: AppTheme.spacing[6],
  },
  emptyTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: AppTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  pressed: {
    opacity: 0.86,
  },
});

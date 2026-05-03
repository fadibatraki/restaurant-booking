import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppScreen } from '@/components/ui/app-screen';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { getMyNotifications, getRestaurants } from '@/lib/api';
import { playNotificationSound } from '@/lib/notification-sound';
import type { Restaurant } from '@/lib/types';

type RestaurantListCardProps = {
  item: Restaurant;
  index: number;
};

function formatHours(openTime: string | null, closeTime: string | null) {
  if (openTime && closeTime) {
    return `${openTime} - ${closeTime}`;
  }

  if (openTime) {
    return `يفتح ${openTime}`;
  }

  if (closeTime) {
    return `يغلق ${closeTime}`;
  }

  return 'المواعيد غير متاحة';
}

function RestaurantListCard({ item, index }: RestaurantListCardProps) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      delay: 120 + index * 65,
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });
  const animatedCardStyle = {
    opacity: entrance,
    transform: [{ translateY }],
  };
  const description = item.description ?? 'تجربة طعام مميزة بلمسة عصرية وأجواء راقية.';

  return (
    <Animated.View style={animatedCardStyle}>
      <Link
        asChild
        href={{
          pathname: '/restaurants/[id]',
          params: { id: item.id },
        }}>
        <Pressable style={({ pressed }) => [styles.restaurantCard, pressed && styles.restaurantCardPressed]}>
          <View style={styles.cardTopRow}>
            <View style={styles.imageWrap}>
              {item.image ? (
                <Image resizeMode="cover" source={{ uri: item.image }} style={styles.image} />
              ) : (
                <View style={styles.imageFallback}>
                  <MaterialIcons name="storefront" size={28} color={AppTheme.colors.primary} />
                </View>
              )}
            </View>

            <View style={styles.cardMainInfo}>
              <View style={styles.typePill}>
                <ThemedText style={styles.typePillText}>مطعم</ThemedText>
              </View>
              <ThemedText numberOfLines={1} ellipsizeMode="tail" style={styles.cardTitle}>
                {item.name}
              </ThemedText>
              <View style={styles.addressRow}>
                <MaterialIcons name="location-on" size={15} color={AppTheme.colors.textSecondary} />
                <ThemedText numberOfLines={1} ellipsizeMode="tail" style={styles.cardAddress}>
                  {item.address}
                </ThemedText>
              </View>
              <ThemedText numberOfLines={2} ellipsizeMode="tail" style={styles.cardDescription}>
                {description}
              </ThemedText>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.metaPillsRow}>
              <View style={styles.hoursPill}>
                <MaterialIcons name="schedule" size={14} color={AppTheme.colors.textSecondary} />
                <ThemedText style={styles.hoursPillText}>{formatHours(item.openTime, item.closeTime)}</ThemedText>
              </View>
            </View>
            <View style={styles.reserveCta}>
              <MaterialIcons name="chevron-left" size={20} color={AppTheme.colors.white} />
              <ThemedText style={styles.reserveCtaText}>احجز الآن</ThemedText>
            </View>
          </View>
        </Pressable>
      </Link>
    </Animated.View>
  );
}

export default function RestaurantsScreen() {
  const { accessToken } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const hasInitializedUnreadRef = useRef(false);
  const knownUnreadIdsRef = useRef<Set<string>>(new Set());

  const loadRestaurants = useCallback(async () => {
    setError(null);

    try {
      const response = await getRestaurants();
      setRestaurants(response);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'تعذر تحميل المطاعم');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const loadUnreadNotifications = useCallback(async () => {
    if (!accessToken) {
      setUnreadCount(0);
      hasInitializedUnreadRef.current = false;
      knownUnreadIdsRef.current = new Set();
      return;
    }

    try {
      const notifications = await getMyNotifications(accessToken);
      const unreadIds = notifications
        .filter(
          (notification) =>
            !notification.isRead && notification.type !== 'RESERVATION_COMPLETED_BY_OWNER'
        )
        .map((notification) => notification.id);

      setUnreadCount(unreadIds.length);

      const unreadSet = new Set(unreadIds);
      if (!hasInitializedUnreadRef.current) {
        hasInitializedUnreadRef.current = true;
        knownUnreadIdsRef.current = unreadSet;
        return;
      }

      const hasNewUnread = unreadIds.some((id) => !knownUnreadIdsRef.current.has(id));
      knownUnreadIdsRef.current = unreadSet;

      if (hasNewUnread) {
        void playNotificationSound();
      }
    } catch {
      // Keep previous count on error.
    }
  }, [accessToken]);

  useEffect(() => {
    loadUnreadNotifications();
  }, [loadUnreadNotifications]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const interval = setInterval(() => {
      loadUnreadNotifications();
    }, 8000);

    return () => {
      clearInterval(interval);
    };
  }, [accessToken, loadUnreadNotifications]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadRestaurants();
  }

  const filteredRestaurants = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return restaurants;
    }

    return restaurants.filter((restaurant) =>
      [restaurant.name, restaurant.address, restaurant.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [restaurants, searchValue]);

  return (
    <AppScreen>
      <View style={styles.heroWrap}>
        <View style={styles.heroTopRow}>
          <Link asChild href="/notifications">
            <Pressable style={({ pressed }) => [styles.notifyButton, pressed && styles.notifyButtonPressed]}>
              <MaterialIcons name="notifications-none" size={24} color={AppTheme.colors.textSecondary} />
              {unreadCount > 0 ? (
                <View style={styles.notifyCountBadge}>
                  <ThemedText style={styles.notifyCountText}>{unreadCount > 99 ? '+99' : unreadCount}</ThemedText>
                </View>
              ) : (
                <View style={styles.notifyDot} />
              )}
            </Pressable>
          </Link>

          <View style={styles.heroBadge}>
            <MaterialIcons name="calendar-month" size={17} color={AppTheme.colors.primary} />
            <ThemedText style={styles.heroBadgeText}>حجوزات المطاعم</ThemedText>
          </View>
        </View>

        <View style={styles.heroTitleRow}>
          <ThemedText style={styles.heroSpark}>✦</ThemedText>
          <ThemedText style={styles.heroTitle}>المطاعم</ThemedText>
        </View>
        <ThemedText style={styles.heroSubtitle}>اختر مطعما واحجز طاولتك بسهولة</ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppTheme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppCard style={styles.stateCard}>
            <ThemedText style={styles.error}>{error}</ThemedText>
            <AppButton variant="secondary" onPress={loadRestaurants}>
              إعادة المحاولة
            </AppButton>
          </AppCard>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filteredRestaurants}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.listTopArea}>
              <View style={styles.searchShell}>
                <MaterialIcons name="search" size={24} color={AppTheme.colors.placeholder} />
                <TextInput
                  placeholder="ابحث عن مطعم أو مطبخ أو منطقة..."
                  placeholderTextColor={AppTheme.colors.placeholder}
                  style={styles.searchInput}
                  textAlign="right"
                  value={searchValue}
                  onChangeText={setSearchValue}
                />
                <View style={styles.filterHint}>
                  <MaterialIcons name="tune" size={20} color={AppTheme.colors.textSecondary} />
                </View>
              </View>

              <View style={styles.sectionRow}>
                <ThemedText style={styles.sectionAction}>عرض الكل</ThemedText>
                <ThemedText style={styles.sectionTitle}>المطاعم القريبة</ThemedText>
              </View>
            </View>
          }
          ListEmptyComponent={
            <AppCard style={styles.emptyCard}>
              <ThemedText style={styles.emptyTitle}>
                {searchValue.trim() ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد مطاعم متاحة حاليا'}
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {searchValue.trim()
                  ? 'جرّب كلمات أبسط أو اسم منطقة أخرى.'
                  : 'اسحب للأسفل للتحديث أو أعد المحاولة بعد قليل.'}
              </ThemedText>
            </AppCard>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor={AppTheme.colors.primary}
              onRefresh={handleRefresh}
            />
          }
          renderItem={({ item, index }) => <RestaurantListCard item={item} index={index} />}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    paddingTop: AppTheme.spacing[8],
    paddingBottom: AppTheme.spacing[4],
    paddingHorizontal: AppTheme.spacing[5],
    gap: AppTheme.spacing[3],
  },
  heroTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifyButton: {
    width: 58,
    height: 58,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    backgroundColor: AppTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...AppTheme.shadow.soft,
  },
  notifyButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  notifyDot: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: AppTheme.colors.primary,
    borderWidth: 2,
    borderColor: AppTheme.colors.surface,
  },
  notifyCountBadge: {
    position: 'absolute',
    top: 10,
    right: 9,
    minWidth: 20,
    height: 20,
    borderRadius: 99,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.primary,
    borderWidth: 2,
    borderColor: AppTheme.colors.surface,
  },
  notifyCountText: {
    color: AppTheme.colors.white,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: 'rgba(232, 93, 4, 0.12)',
  },
  heroBadgeText: {
    color: AppTheme.colors.primary,
    fontSize: 30 / 2,
    lineHeight: 19,
    fontWeight: '800',
    textAlign: 'right',
  },
  heroTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  heroSpark: {
    color: AppTheme.colors.primary,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  heroTitle: {
    color: AppTheme.colors.text,
    fontSize: 54 / 2,
    lineHeight: 35,
    fontWeight: '900',
    textAlign: 'right',
  },
  heroSubtitle: {
    color: AppTheme.colors.textSecondary,
    fontSize: 34 / 2,
    lineHeight: 30,
    fontWeight: '600',
    textAlign: 'right',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppTheme.spacing[5],
  },
  stateCard: {
    alignItems: 'flex-end',
  },
  error: {
    color: AppTheme.colors.error,
    fontWeight: '700',
    textAlign: 'right',
  },
  list: {
    paddingHorizontal: AppTheme.spacing[4],
    paddingBottom: AppTheme.spacing[8],
    gap: AppTheme.spacing[3],
  },
  listTopArea: {
    backgroundColor: AppTheme.colors.background,
    paddingBottom: AppTheme.spacing[3],
    gap: AppTheme.spacing[3],
  },
  searchShell: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: AppTheme.radius.xl,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.7)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    ...AppTheme.shadow.soft,
  },
  searchInput: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 17,
    paddingVertical: 10,
  },
  filterHint: {
    width: 36,
    height: 36,
    borderRadius: AppTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
  },
  sectionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 34 / 2,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'right',
  },
  sectionAction: {
    color: AppTheme.colors.primary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'right',
  },
  emptyCard: {
    alignItems: 'flex-end',
    borderColor: 'rgba(253, 186, 116, 0.36)',
    padding: AppTheme.spacing[5],
  },
  emptyTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
  },
  emptyText: {
    color: AppTheme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 22,
  },
  restaurantCard: {
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.84)',
    borderRadius: 26,
    backgroundColor: AppTheme.colors.surface,
    padding: AppTheme.spacing[4],
    gap: AppTheme.spacing[3],
    ...AppTheme.shadow.soft,
  },
  restaurantCardPressed: {
    transform: [{ scale: 0.985 }],
  },
  cardTopRow: {
    flexDirection: 'row-reverse',
    gap: AppTheme.spacing[3],
  },
  imageWrap: {
    width: 112,
    height: 112,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232, 93, 4, 0.15)',
    backgroundColor: '#FDF3EA',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMainInfo: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  typePill: {
    alignSelf: 'flex-start',
    borderRadius: AppTheme.radius.pill,
    backgroundColor: 'rgba(232, 93, 4, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typePillText: {
    color: '#925A2A',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardTitle: {
    color: AppTheme.colors.text,
    fontSize: 37 / 2,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'right',
    width: '100%',
  },
  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    width: '100%',
  },
  cardAddress: {
    color: AppTheme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  cardDescription: {
    color: AppTheme.colors.textSecondary,
    fontSize: 30 / 2,
    lineHeight: 22,
    textAlign: 'right',
    width: '100%',
  },
  cardFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppTheme.spacing[2],
  },
  metaPillsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: AppTheme.spacing[2],
    flexShrink: 1,
  },
  hoursPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hoursPillText: {
    color: '#3F3F46',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  reserveCta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 132,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...AppTheme.shadow.primary,
  },
  reserveCtaText: {
    color: AppTheme.colors.white,
    fontSize: 28 / 2,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
});

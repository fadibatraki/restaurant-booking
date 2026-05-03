import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, router, usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { cancelReservation, getMyReservations, getRestaurants } from '@/lib/api';
import { playNotificationSound } from '@/lib/notification-sound';
import type { Reservation, ReservationStatus, Restaurant } from '@/lib/types';

type StatusTone = 'primary' | 'success' | 'error' | 'neutral';
type UiReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
type ReservationFilter = 'ALL' | 'UPCOMING' | 'CONFIRMED' | 'CANCELLED';
type NoticeTone = 'success' | 'error';
const AUTO_REFRESH_INTERVAL_MS = 4000;

const statusMeta: Record<
  UiReservationStatus,
  { label: string; tone: StatusTone; icon: ComponentProps<typeof MaterialIcons>['name'] }
> = {
  PENDING: { label: 'قيد الانتظار', tone: 'primary', icon: 'schedule' },
  CONFIRMED: { label: 'مؤكد', tone: 'success', icon: 'check-circle' },
  CANCELLED: { label: 'ملغي', tone: 'error', icon: 'cancel' },
};

const toneColors: Record<StatusTone, { text: string; bg: string }> = {
  primary: { text: '#D97706', bg: 'rgba(249, 115, 22, 0.14)' },
  success: { text: '#16A34A', bg: 'rgba(34, 197, 94, 0.14)' },
  error: { text: '#DC2626', bg: 'rgba(239, 68, 68, 0.13)' },
  neutral: { text: '#64748B', bg: 'rgba(100, 116, 139, 0.14)' },
};

const reservationFilters: { key: ReservationFilter; label: string }[] = [
  { key: 'ALL', label: 'الكل' },
  { key: 'UPCOMING', label: 'القادمة' },
  { key: 'CONFIRMED', label: 'المؤكدة' },
  { key: 'CANCELLED', label: 'الملغية' },
];

function getStatusChangeNotice(status: ReservationStatus): { title: string; message: string; tone: NoticeTone } {
  if (status === 'CONFIRMED') {
    return {
      title: 'تمت الموافقة على الحجز',
      message: 'مدير المطعم وافق على حجزك.',
      tone: 'success',
    };
  }

  if (status === 'CANCELLED') {
    return {
      title: 'تم إلغاء الحجز',
      message: 'تم إلغاء الحجز من جهة المطعم.',
      tone: 'error',
    };
  }

  return {
    title: 'تم تحديث الحجز',
    message: 'حدث تغيير جديد على حالة الحجز.',
    tone: 'success',
  };
}

function isCustomerVisibleReservation(status: ReservationStatus) {
  return status !== 'COMPLETED';
}

function toUiStatus(status: ReservationStatus): UiReservationStatus {
  if (status === 'CONFIRMED' || status === 'CANCELLED') {
    return status;
  }

  return 'PENDING';
}

function formatReservationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: value,
      time: '',
    };
  }

  return {
    date: new Intl.DateTimeFormat('ar-SY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('ar-SY', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
  };
}

function formatReservationReference(id: string) {
  const shortId = id.slice(-6).toUpperCase();
  return `مرجع الحجز #${shortId}`;
}

function canCancelReservation(status: ReservationStatus) {
  return status === 'PENDING' || status === 'CONFIRMED';
}

function StatusPill({ status, compact = false }: { status: ReservationStatus; compact?: boolean }) {
  const meta = statusMeta[toUiStatus(status)];
  const colors = toneColors[meta.tone];

  return (
    <View
      style={[
        styles.statusPill,
        compact && styles.statusPillCompact,
        { backgroundColor: colors.bg },
      ]}>
      <MaterialIcons
        name={meta.icon}
        size={compact ? 14 : 16}
        color={colors.text}
        style={styles.statusPillIcon}
      />
      <ThemedText style={[styles.statusPillText, compact && styles.statusPillTextCompact, { color: colors.text }]}>
        {meta.label}
      </ThemedText>
    </View>
  );
}

export default function MyReservationsScreen() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const pathname = usePathname();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ReservationFilter>('ALL');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelConfirmVisible, setIsCancelConfirmVisible] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: NoticeTone } | null>(null);
  const previousReservationsRef = useRef<Map<string, Reservation> | null>(null);
  const lastPlayedNoticeKeyRef = useRef<string | null>(null);

  const restaurantNames = useMemo(
    () => new Map(restaurants.map((restaurant) => [restaurant.id, restaurant.name])),
    [restaurants]
  );

  const loadReservations = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      const [myReservations, restaurantsResponse] = await Promise.all([
        getMyReservations(accessToken),
        getRestaurants().catch(() => []),
      ]);

      setReservations(myReservations.filter((reservation) => isCustomerVisibleReservation(reservation.status)));
      setRestaurants(restaurantsResponse);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'تعذر تحميل الحجوزات');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      loadReservations();
    }
  }, [accessToken, loadReservations]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isStopped = false;
    const interval = setInterval(async () => {
      if (isStopped) {
        return;
      }

      try {
        const latestReservations = await getMyReservations(accessToken);
        if (!isStopped) {
          setReservations(
            latestReservations.filter((reservation) =>
              isCustomerVisibleReservation(reservation.status)
            )
          );
        }
      } catch {
        // Silent polling to keep UI updated without noisy errors.
      }
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      isStopped = true;
      clearInterval(interval);
    };
  }, [accessToken]);

  useEffect(() => {
    const currentMap = new Map(reservations.map((reservation) => [reservation.id, reservation]));
    const previousMap = previousReservationsRef.current;
    previousReservationsRef.current = currentMap;

    if (!previousMap) {
      return;
    }

    if (notice || isCancelling) {
      return;
    }

    for (const reservation of reservations) {
      const previous = previousMap.get(reservation.id);
      if (previous && previous.status !== reservation.status) {
        if (!isCustomerVisibleReservation(reservation.status)) {
          continue;
        }
        setNotice(getStatusChangeNotice(reservation.status));
        return;
      }
    }

    const removedByRestaurant = Array.from(previousMap.keys()).find((id) => !currentMap.has(id));
    if (removedByRestaurant) {
      setNotice({
        title: 'تم حذف الحجز',
        message: 'تمت إزالة حجز من قائمتك بعد تحديث من المطعم.',
        tone: 'error',
      });
    }
  }, [isCancelling, notice, reservations]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const noticeKey = `${notice.tone}|${notice.title}|${notice.message}`;
    if (lastPlayedNoticeKeyRef.current === noticeKey) {
      return;
    }

    lastPlayedNoticeKeyRef.current = noticeKey;
    void playNotificationSound();
  }, [notice]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadReservations();
  }

  const selectedReservation = useMemo(
    () => reservations.find((reservation) => reservation.id === selectedReservationId) ?? null,
    [reservations, selectedReservationId]
  );
  const filteredReservations = useMemo(() => {
    if (activeFilter === 'ALL') {
      return reservations;
    }

    if (activeFilter === 'CONFIRMED') {
      return reservations.filter((reservation) => reservation.status === 'CONFIRMED');
    }

    if (activeFilter === 'CANCELLED') {
      return reservations.filter((reservation) => reservation.status === 'CANCELLED');
    }

    const now = new Date();
    return reservations.filter((reservation) => {
      const date = new Date(reservation.reservationDate);
      return (
        !Number.isNaN(date.getTime()) &&
        date > now &&
        reservation.status !== 'CANCELLED' &&
        reservation.status !== 'COMPLETED'
      );
    });
  }, [activeFilter, reservations]);

  const selectedReservationRestaurantName = selectedReservation
    ? restaurantNames.get(selectedReservation.restaurantId) ?? 'مطعم'
    : '';

  const selectedReservationDateTime = selectedReservation
    ? formatReservationDate(selectedReservation.reservationDate)
    : { date: '', time: '' };
  const canCancelSelectedReservation = selectedReservation
    ? canCancelReservation(selectedReservation.status)
    : false;

  const runCancelReservation = useCallback(async () => {
    if (!selectedReservation || !accessToken || isCancelling || !canCancelReservation(selectedReservation.status)) {
      return;
    }

    setIsCancelling(true);

    try {
      const updatedReservation = await cancelReservation(selectedReservation.id, accessToken);

      setReservations((previousReservations) =>
        previousReservations.filter((reservation) => reservation.id !== updatedReservation.id)
      );
      setIsCancelConfirmVisible(false);
      setSelectedReservationId(null);
      setNotice({
        title: 'تم الإلغاء بنجاح',
        message: 'تم حذف الحجز من قائمة حجوزاتك.',
        tone: 'success',
      });
    } catch (caughtError) {
      setIsCancelConfirmVisible(false);
      setNotice({
        title: 'تعذر إلغاء الحجز',
        message: caughtError instanceof Error ? caughtError.message : 'حدث خطأ غير متوقع أثناء الإلغاء.',
        tone: 'error',
      });
    } finally {
      setIsCancelling(false);
    }
  }, [accessToken, isCancelling, selectedReservation]);

  const confirmAndCancelReservation = useCallback(() => {
    if (!selectedReservation || isCancelling || !canCancelReservation(selectedReservation.status)) {
      return;
    }

    setIsCancelConfirmVisible(true);
  }, [isCancelling, selectedReservation]);

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
      <View style={styles.header}>
        <AppHeader
          eyebrow="حساب العميل"
          title="حجوزاتي"
          subtitle="تابع مواعيدك وحالة كل حجز في مكان واحد."
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppTheme.colors.primary} />
        </View>
      ) : error ? (
        <AppCard style={styles.stateCard}>
          <ThemedText style={styles.error}>{error}</ThemedText>
          <AppButton variant="secondary" onPress={loadReservations}>
            إعادة المحاولة
          </AppButton>
        </AppCard>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filteredReservations}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.filterRow}>
              {reservationFilters.map((filter) => {
                const isActive = filter.key === activeFilter;

                return (
                  <Pressable
                    key={filter.key}
                    onPress={() => setActiveFilter(filter.key)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                      pressed && styles.filterChipPressed,
                    ]}>
                    <ThemedText style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {filter.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          }
          ListEmptyComponent={
            <AppCard style={styles.emptyCard}>
              <ThemedText style={styles.emptyTitle}>
                {activeFilter === 'ALL' ? 'لا توجد حجوزات بعد' : 'لا توجد نتائج لهذا الفلتر'}
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {activeFilter === 'ALL'
                  ? 'ابدأ من قائمة المطاعم واختر وقتك المناسب.'
                  : 'جرب فلترًا آخر أو اسحب للتحديث.'}
              </ThemedText>
              <AppButton onPress={() => router.push('/')}>استعراض المطاعم</AppButton>
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
            const formatted = formatReservationDate(item.reservationDate);
            const restaurantName = restaurantNames.get(item.restaurantId);

            return (
              <AppCard style={styles.reservationCard}>
                <View style={styles.cardMainRow}>
                  <View style={styles.restaurantColumn}>
                    <ThemedText numberOfLines={1} ellipsizeMode="tail" style={styles.cardTitle}>
                      {restaurantName ?? 'مطعم'}
                    </ThemedText>
                    <ThemedText style={styles.cardMeta}>{formatReservationReference(item.id)}</ThemedText>
                  </View>

                  <View style={styles.verticalDivider} />

                  <View style={styles.dateColumn}>
                    <View style={styles.dateLine}>
                      <MaterialIcons name="calendar-month" size={16} color={AppTheme.colors.textSecondary} />
                      <ThemedText style={styles.dateLineText}>{formatted.date}</ThemedText>
                    </View>
                    <View style={styles.dateLine}>
                      <MaterialIcons name="schedule" size={16} color={AppTheme.colors.textSecondary} />
                      <ThemedText style={styles.dateLineText}>{formatted.time || '-'}</ThemedText>
                    </View>
                  </View>

                  <View style={styles.verticalDivider} />

                  <View style={styles.statusColumn}>
                    <StatusPill status={item.status} compact />
                  </View>
                </View>

                <Pressable
                  onPress={() => setSelectedReservationId(item.id)}
                  style={({ pressed }) => [styles.detailsRow, pressed && styles.detailsRowPressed]}>
                  <MaterialIcons name="chevron-left" size={17} color={AppTheme.colors.primary} />
                  <ThemedText style={styles.detailsText}>عرض التفاصيل</ThemedText>
                </Pressable>
              </AppCard>
            );
          }}
        />
      )}

      <Modal
        animationType="slide"
        transparent
        visible={Boolean(selectedReservation)}
        onRequestClose={() => setSelectedReservationId(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setSelectedReservationId(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setSelectedReservationId(null)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <MaterialIcons name="close" size={20} color={AppTheme.colors.textSecondary} />
              </Pressable>
              <ThemedText type="subtitle" style={styles.modalTitle}>تفاصيل الحجز</ThemedText>
              <View style={styles.closeSpacer} />
            </View>

            {selectedReservation ? (
              <>
                <View style={styles.modalHeroCard}>
                  <View style={styles.modalStoreIconWrap}>
                    <MaterialIcons name="storefront" size={24} color={AppTheme.colors.primary} />
                  </View>
                  <View style={styles.modalHeroText}>
                    <ThemedText style={styles.modalRestaurantName}>{selectedReservationRestaurantName}</ThemedText>
                    <ThemedText style={styles.modalReference}>{formatReservationReference(selectedReservation.id)}</ThemedText>
                  </View>
                </View>

                <View style={styles.modalDetailsCard}>
                  <View style={styles.modalDetailRow}>
                    <ThemedText style={styles.modalDetailValue}>{selectedReservationDateTime.date}</ThemedText>
                    <View style={styles.modalLabelWithIcon}>
                      <MaterialIcons name="calendar-month" size={18} color={AppTheme.colors.text} />
                      <ThemedText style={styles.modalDetailLabel}>التاريخ</ThemedText>
                    </View>
                  </View>
                  <View style={styles.modalDivider} />

                  <View style={styles.modalDetailRow}>
                    <ThemedText style={styles.modalDetailValue}>{selectedReservationDateTime.time || '-'}</ThemedText>
                    <View style={styles.modalLabelWithIcon}>
                      <MaterialIcons name="schedule" size={18} color={AppTheme.colors.text} />
                      <ThemedText style={styles.modalDetailLabel}>الوقت</ThemedText>
                    </View>
                  </View>
                  <View style={styles.modalDivider} />

                  <View style={styles.modalDetailRow}>
                    <ThemedText style={styles.modalDetailValue}>
                      {selectedReservation.guestsCount === 1
                        ? 'ضيف واحد'
                        : `${selectedReservation.guestsCount} ضيوف`}
                    </ThemedText>
                    <View style={styles.modalLabelWithIcon}>
                      <MaterialIcons name="groups-2" size={18} color={AppTheme.colors.text} />
                      <ThemedText style={styles.modalDetailLabel}>عدد الضيوف</ThemedText>
                    </View>
                  </View>
                  <View style={styles.modalDivider} />

                  <View style={styles.modalDetailRow}>
                    <StatusPill status={selectedReservation.status} />
                    <View style={styles.modalLabelWithIcon}>
                      <MaterialIcons name="query-builder" size={18} color={AppTheme.colors.text} />
                      <ThemedText style={styles.modalDetailLabel}>الحالة</ThemedText>
                    </View>
                  </View>
                  <View style={styles.modalDivider} />

                  <View style={styles.modalDetailRow}>
                    <ThemedText style={styles.modalDetailValue}>
                      {selectedReservation.notes?.trim() ? selectedReservation.notes : 'لا توجد ملاحظات'}
                    </ThemedText>
                    <View style={styles.modalLabelWithIcon}>
                      <MaterialIcons name="notes" size={18} color={AppTheme.colors.text} />
                      <ThemedText style={styles.modalDetailLabel}>ملاحظات</ThemedText>
                    </View>
                  </View>
                </View>

                {canCancelSelectedReservation ? (
                  <AppButton
                    variant="secondary"
                    disabled={isCancelling}
                    style={styles.modalCancelCta}
                    onPress={confirmAndCancelReservation}>
                    {isCancelling ? 'جارٍ إلغاء الحجز...' : 'إلغاء الحجز'}
                  </AppButton>
                ) : null}

                <AppButton
                  disabled={isCancelling}
                  style={styles.modalCloseCta}
                  onPress={() => setSelectedReservationId(null)}>
                  إغلاق
                </AppButton>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isCancelConfirmVisible}
        onRequestClose={() => setIsCancelConfirmVisible(false)}>
        <View style={styles.popupBackdrop}>
          <View style={styles.popupCard}>
            <ThemedText style={styles.popupTitle}>تأكيد إلغاء الحجز</ThemedText>
            <ThemedText style={styles.popupMessage}>
              هل أنت متأكد من إلغاء هذا الحجز؟ لا يمكن التراجع بعد الإلغاء.
            </ThemedText>
            <View style={styles.popupActions}>
              <AppButton
                variant="secondary"
                disabled={isCancelling}
                style={styles.popupSecondaryButton}
                onPress={() => setIsCancelConfirmVisible(false)}>
                تراجع
              </AppButton>
              <AppButton
                disabled={isCancelling}
                style={styles.popupPrimaryButton}
                onPress={() => {
                  void runCancelReservation();
                }}>
                {isCancelling ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}
              </AppButton>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(notice)}
        onRequestClose={() => setNotice(null)}>
        <Pressable style={styles.popupBackdrop} onPress={() => setNotice(null)}>
          <Pressable
            style={[
              styles.noticeCard,
              notice?.tone === 'error' ? styles.noticeCardError : styles.noticeCardSuccess,
            ]}
            onPress={() => setNotice(null)}>
            <ThemedText style={styles.noticeTitle}>{notice?.title}</ThemedText>
            <ThemedText style={styles.noticeMessage}>{notice?.message}</ThemedText>
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: AppTheme.spacing[5],
    paddingTop: AppTheme.spacing[6],
    paddingBottom: AppTheme.spacing[5],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppTheme.spacing[5],
  },
  stateCard: {
    margin: AppTheme.spacing[5],
    alignItems: 'flex-end',
  },
  list: {
    paddingHorizontal: AppTheme.spacing[4],
    paddingBottom: AppTheme.spacing[8],
    gap: AppTheme.spacing[3],
  },
  filterRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: AppTheme.spacing[2],
    marginBottom: AppTheme.spacing[3],
  },
  filterChip: {
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.95)',
    backgroundColor: AppTheme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: {
    borderColor: 'rgba(253, 186, 116, 0.55)',
    backgroundColor: 'rgba(255, 244, 230, 0.9)',
  },
  filterChipPressed: {
    opacity: 0.8,
  },
  filterChipText: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  filterChipTextActive: {
    color: AppTheme.colors.primaryHover,
  },
  reservationCard: {
    paddingHorizontal: AppTheme.spacing[4],
    paddingTop: AppTheme.spacing[3] - 2,
    paddingBottom: AppTheme.spacing[3] - 2,
    gap: AppTheme.spacing[2] - 2,
    borderColor: 'rgba(229, 231, 235, 0.88)',
    backgroundColor: AppTheme.colors.surface,
  },
  cardMainRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: AppTheme.spacing[2],
  },
  restaurantColumn: {
    flex: 1.05,
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 0,
  },
  cardTitle: {
    color: AppTheme.colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'right',
    width: '100%',
  },
  cardMeta: {
    color: AppTheme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'right',
  },
  dateColumn: {
    flex: 1.2,
    alignItems: 'flex-end',
    gap: 7,
  },
  dateLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  dateLineText: {
    color: AppTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'right',
  },
  statusColumn: {
    minWidth: 102,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(229, 231, 235, 0.95)',
  },
  statusPill: {
    minHeight: 34,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  statusPillCompact: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillIcon: {
    marginTop: 1,
  },
  statusPillText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  statusPillTextCompact: {
    fontSize: 13,
    lineHeight: 16,
  },
  detailsRow: {
    marginTop: 2,
    paddingTop: AppTheme.spacing[2] - 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.95)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    borderRadius: AppTheme.radius.sm,
  },
  detailsText: {
    color: AppTheme.colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  detailsRowPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.995 }],
  },
  pressed: {
    opacity: 0.72,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: AppTheme.radius.xl,
    borderTopRightRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.95)',
    backgroundColor: AppTheme.colors.surface,
    paddingHorizontal: AppTheme.spacing[4],
    paddingTop: AppTheme.spacing[2],
    paddingBottom: AppTheme.spacing[4],
    gap: AppTheme.spacing[3],
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHandle: {
    width: 54,
    height: 6,
    alignSelf: 'center',
    borderRadius: AppTheme.radius.pill,
    backgroundColor: 'rgba(17, 24, 39, 0.14)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 244, 230, 0.8)',
  },
  closeSpacer: {
    width: 38,
    height: 38,
  },
  modalTitle: {
    color: AppTheme.colors.text,
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  modalHeroCard: {
    borderWidth: 1,
    borderColor: 'rgba(253, 186, 116, 0.34)',
    borderRadius: AppTheme.radius.lg,
    backgroundColor: 'rgba(255, 244, 230, 0.5)',
    padding: AppTheme.spacing[4],
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppTheme.spacing[3],
  },
  modalStoreIconWrap: {
    width: 56,
    height: 56,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: 'rgba(232, 93, 4, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeroText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  modalRestaurantName: {
    color: AppTheme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'right',
  },
  modalReference: {
    color: AppTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'right',
  },
  modalDetailsCard: {
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.95)',
    borderRadius: AppTheme.radius.lg,
    backgroundColor: AppTheme.colors.surface,
    paddingHorizontal: AppTheme.spacing[3],
    paddingVertical: AppTheme.spacing[2],
  },
  modalDetailRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppTheme.spacing[3],
  },
  modalLabelWithIcon: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  modalDetailLabel: {
    color: AppTheme.colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'right',
  },
  modalDetailValue: {
    flex: 1,
    color: AppTheme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'left',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(229, 231, 235, 0.95)',
  },
  modalCloseCta: {
    marginTop: AppTheme.spacing[1] - 2,
  },
  modalCancelCta: {
    marginTop: AppTheme.spacing[1],
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.46)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing[5],
  },
  popupCard: {
    width: '100%',
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.95)',
    backgroundColor: AppTheme.colors.surface,
    padding: AppTheme.spacing[4],
    gap: AppTheme.spacing[3],
    ...AppTheme.shadow.soft,
  },
  popupTitle: {
    color: AppTheme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'right',
  },
  popupMessage: {
    color: AppTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
  },
  popupActions: {
    flexDirection: 'row-reverse',
    gap: AppTheme.spacing[2],
  },
  popupPrimaryButton: {
    flex: 1,
    minHeight: 44,
  },
  popupSecondaryButton: {
    flex: 1,
    minHeight: 44,
  },
  noticeCard: {
    width: '100%',
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    padding: AppTheme.spacing[4],
    gap: AppTheme.spacing[2],
    ...AppTheme.shadow.soft,
  },
  noticeCardSuccess: {
    borderColor: 'rgba(34, 197, 94, 0.35)',
    backgroundColor: 'rgba(240, 253, 244, 0.98)',
  },
  noticeCardError: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(254, 242, 242, 0.98)',
  },
  noticeTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'right',
  },
  noticeMessage: {
    color: AppTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
  },
  emptyCard: {
    marginTop: AppTheme.spacing[3],
    borderColor: 'rgba(253, 186, 116, 0.36)',
    alignItems: 'flex-end',
  },
  emptyTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
  },
  emptyText: {
    color: AppTheme.colors.textSecondary,
    textAlign: 'right',
  },
  error: {
    color: AppTheme.colors.error,
    fontWeight: '700',
    textAlign: 'right',
  },
});

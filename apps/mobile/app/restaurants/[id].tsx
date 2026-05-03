import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppBadge } from '@/components/ui/app-badge';
import { AppButton } from '@/components/ui/app-button';
import { AppCard, AppPressableCard } from '@/components/ui/app-card';
import { AppInput } from '@/components/ui/app-input';
import { AppScreen } from '@/components/ui/app-screen';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { createReservation, getAvailability, getRestaurant } from '@/lib/api';
import type { AvailabilityTable, Restaurant } from '@/lib/types';

function getTomorrowDateValue() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function buildReservationDate(dateValue: string, timeValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{2}:\d{2}$/.test(timeValue)) {
    return null;
  }

  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);

  if (
    !year ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const reservationDate = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    Number.isNaN(reservationDate.getTime()) ||
    reservationDate.getFullYear() !== year ||
    reservationDate.getMonth() !== month - 1 ||
    reservationDate.getDate() !== day
  ) {
    return null;
  }

  return reservationDate;
}

export default function RestaurantScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const restaurantId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<AvailabilityTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [dateValue, setDateValue] = useState(getTomorrowDateValue);
  const [timeValue, setTimeValue] = useState('19:00');
  const [guestsCount, setGuestsCount] = useState('2');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId),
    [selectedTableId, tables]
  );
  const hasAvailableTables = tables.some((table) => table.isAvailable && table.isActive);
  const canSubmit = Boolean(selectedTable?.isAvailable && selectedTable.isActive) && !isSubmitting;
  const parsedGuestsCount = Number(guestsCount);
  const safeGuestsCount = Number.isInteger(parsedGuestsCount) && parsedGuestsCount > 0 ? parsedGuestsCount : 1;

  function clearAvailability() {
    setTables([]);
    setSelectedTableId(null);
    setHasCheckedAvailability(false);
  }

  function updateGuestsCount(nextValue: number) {
    const safeNextValue = Math.max(1, Math.min(20, nextValue));
    setGuestsCount(String(safeNextValue));
    clearAvailability();
  }

  const loadRestaurant = useCallback(async () => {
    if (!restaurantId) {
      setError('المطعم غير معروف');
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      const response = await getRestaurant(restaurantId);
      setRestaurant(response);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'تعذر تحميل المطعم');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  function getReservationDateOrShowError() {
    const reservationDate = buildReservationDate(dateValue.trim(), timeValue.trim());

    if (!reservationDate) {
      setError('اكتب التاريخ والوقت بصيغة صحيحة.');
      return null;
    }

    if (reservationDate <= new Date()) {
      setError('وقت الحجز يجب أن يكون في المستقبل.');
      return null;
    }

    return reservationDate;
  }

  async function handleCheckAvailability() {
    if (!restaurantId) {
      return;
    }

    const parsedGuestsCount = Number(guestsCount);

    if (!Number.isInteger(parsedGuestsCount) || parsedGuestsCount < 1) {
      setError('عدد الضيوف يجب أن يكون رقما أكبر من صفر.');
      return;
    }

    const reservationDate = getReservationDateOrShowError();

    if (!reservationDate) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setSelectedTableId(null);
    setTables([]);
    setHasCheckedAvailability(false);
    setIsChecking(true);

    try {
      const response = await getAvailability(
        restaurantId,
        reservationDate.toISOString(),
        parsedGuestsCount
      );
      setTables(response);
      setHasCheckedAvailability(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'تعذر فحص التوفر');
    } finally {
      setIsChecking(false);
    }
  }

  async function handleCreateReservation() {
    if (!restaurantId) {
      return;
    }

    if (isAuthLoading) {
      return;
    }

    if (!accessToken) {
      router.push({
        pathname: '/login',
        params: { redirectTo: `/restaurants/${restaurantId}` },
      });
      return;
    }

    if (!selectedTableId) {
      setError('اختر طاولة متاحة أولا.');
      return;
    }

    const parsedGuestsCount = Number(guestsCount);

    if (!Number.isInteger(parsedGuestsCount) || parsedGuestsCount < 1) {
      setError('عدد الضيوف يجب أن يكون رقما أكبر من صفر.');
      return;
    }

    const reservationDate = getReservationDateOrShowError();

    if (!reservationDate) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await createReservation(
        {
          restaurantId,
          tableId: selectedTableId,
          reservationDate: reservationDate.toISOString(),
          guestsCount: parsedGuestsCount,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
        accessToken
      );
      setSuccessMessage('تم إرسال حجزك بنجاح. بانتظار تأكيد المطعم.');
      setIsSuccessModalVisible(true);
      setTables([]);
      setSelectedTableId(null);
      setHasCheckedAvailability(false);
      return;
    } catch (caughtError) {
      setSelectedTableId(null);
      const message = caughtError instanceof Error ? caughtError.message : 'تعذر إنشاء الحجز';
      setError(`${message} يرجى فحص التوفر مرة أخرى قبل إتمام الحجز.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || isAuthLoading) {
    return (
      <AppScreen style={styles.center}>
        <ActivityIndicator color={AppTheme.colors.primary} />
      </AppScreen>
    );
  }

  if (error && !restaurant) {
    return (
      <AppScreen style={styles.center}>
        <AppCard style={styles.stateCard}>
          <ThemedText style={styles.error}>{error}</ThemedText>
          <AppButton variant="secondary" onPress={loadRestaurant}>
            إعادة المحاولة
          </AppButton>
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {restaurant ? (
          <AppCard style={styles.heroCard}>
            <View style={styles.heroMainRow}>
              <View style={styles.heroImageWrap}>
                {restaurant.image ? (
                  <Image source={{ uri: restaurant.image }} style={styles.heroImage} />
                ) : (
                  <View style={styles.heroImageFallback}>
                    <MaterialIcons name="restaurant" size={26} color={AppTheme.colors.primary} />
                  </View>
                )}
              </View>

              <View style={styles.heroTextWrap}>
                <View style={styles.heroTop}>
                  <View style={styles.heroTinyIcon}>
                    <MaterialIcons name="favorite-border" size={14} color={AppTheme.colors.textSecondary} />
                  </View>
                  <AppBadge style={styles.heroPill}>وجهة مميزة</AppBadge>
                </View>
                <ThemedText style={styles.heroTitle}>{restaurant.name}</ThemedText>
                <ThemedText numberOfLines={1} style={styles.heroAddress}>{restaurant.address}</ThemedText>
                {restaurant.description ? (
                  <ThemedText numberOfLines={2} style={styles.description}>{restaurant.description}</ThemedText>
                ) : null}
                <View style={styles.hoursRow}>
                  {restaurant.openTime ? (
                    <AppBadge tone="neutral" style={styles.hoursBadge}>
                      يفتح {restaurant.openTime}
                    </AppBadge>
                  ) : null}
                  {restaurant.closeTime ? (
                    <AppBadge tone="neutral" style={styles.hoursBadge}>
                      يغلق {restaurant.closeTime}
                    </AppBadge>
                  ) : null}
                </View>
              </View>
            </View>
          </AppCard>
        ) : null}

        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <MaterialIcons name="event" size={18} color={AppTheme.colors.primary} />
            <ThemedText style={styles.stepTitle}>الموعد</ThemedText>
          </View>
          <View style={styles.row}>
            <View style={styles.compactFieldChip}>
              <MaterialIcons name="schedule" size={18} color={AppTheme.colors.textSecondary} />
              <TextInput
                onChangeText={(value) => {
                  setTimeValue(value);
                  clearAvailability();
                }}
                placeholder="19:00"
                placeholderTextColor={AppTheme.colors.placeholder}
                style={styles.compactFieldInput}
                textAlign="right"
                value={timeValue}
              />
            </View>
            <View style={styles.compactFieldChip}>
              <MaterialIcons name="calendar-month" size={18} color={AppTheme.colors.textSecondary} />
              <TextInput
                onChangeText={(value) => {
                  setDateValue(value);
                  clearAvailability();
                }}
                placeholder="2026-04-26"
                placeholderTextColor={AppTheme.colors.placeholder}
                style={styles.compactFieldInput}
                textAlign="right"
                value={dateValue}
              />
            </View>
          </View>
        </View>

        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <MaterialIcons name="groups-2" size={18} color={AppTheme.colors.primary} />
            <ThemedText style={styles.stepTitle}>عدد الضيوف</ThemedText>
          </View>
          <View style={styles.stepperWrap}>
            <Pressable
              onPress={() => updateGuestsCount(safeGuestsCount - 1)}
              style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressedBtn]}>
              <ThemedText style={styles.stepperSymbol}>-</ThemedText>
            </Pressable>
            <ThemedText style={styles.stepperValue}>{safeGuestsCount} ضيوف</ThemedText>
            <Pressable
              onPress={() => updateGuestsCount(safeGuestsCount + 1)}
              style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressedBtn]}>
              <ThemedText style={styles.stepperSymbol}>+</ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <MaterialIcons name="manage-search" size={18} color={AppTheme.colors.primary} />
            <ThemedText style={styles.stepTitle}>فحص التوفر</ThemedText>
          </View>

          <Pressable
            onPress={() => setIsNotesExpanded((prev) => !prev)}
            style={({ pressed }) => [styles.notesToggle, pressed && styles.pressedBtn]}>
            <MaterialIcons
              name={isNotesExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={18}
              color={AppTheme.colors.textSecondary}
            />
            <ThemedText style={styles.notesToggleText}>ملاحظات اختيارية</ThemedText>
          </Pressable>

          {isNotesExpanded ? (
            <View style={styles.inputGroup}>
              <AppInput
                multiline
                onChangeText={setNotes}
                placeholder="مثال: قرب النافذة"
                style={[styles.compactInput, styles.notesInput]}
                textAlignVertical="top"
                value={notes}
              />
            </View>
          ) : null}

          <AppButton
            variant="secondary"
            disabled={isChecking}
            onPress={handleCheckAvailability}
            style={styles.checkButton}
          >
            {isChecking ? 'جاري الفحص...' : 'فحص التوفر'}
          </AppButton>
        </View>

        {hasCheckedAvailability && tables.length === 0 ? (
          <ThemedText style={styles.notice}>لا توجد طاولات مناسبة لهذا الوقت وعدد الضيوف.</ThemedText>
        ) : null}

        {tables.length > 0 && !hasAvailableTables ? (
          <ThemedText style={styles.notice}>كل الطاولات المناسبة غير متاحة في هذا الوقت.</ThemedText>
        ) : null}

        {tables.length > 0 ? (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <MaterialIcons name="event-seat" size={18} color={AppTheme.colors.primary} />
              <ThemedText style={styles.stepTitle}>اختر الطاولة</ThemedText>
            </View>

            <View style={styles.tablesGrid}>
              {tables.map((table) => {
                const canSelect = table.isAvailable && table.isActive;
                const isSelected = table.id === selectedTableId;

                return (
                  <AppPressableCard
                    disabled={!canSelect}
                    key={table.id}
                    onPress={() => setSelectedTableId(table.id)}
                    style={[
                      styles.tableChip,
                      isSelected && styles.tableChipSelected,
                      !canSelect && styles.tableChipDisabled,
                    ]}>
                    <View style={styles.tableChipTop}>
                      <MaterialIcons
                        name={isSelected ? 'check-circle' : 'event-seat'}
                        size={18}
                        color={isSelected ? AppTheme.colors.primary : AppTheme.colors.textSecondary}
                      />
                      <ThemedText numberOfLines={1} style={styles.tableChipName}>{table.name}</ThemedText>
                    </View>

                    <ThemedText style={styles.tableChipMeta}>{table.capacity} ضيوف</ThemedText>

                    <View style={[styles.tableStatusPill, canSelect ? styles.tableStatusAvailable : styles.tableStatusMuted]}>
                      <ThemedText style={[styles.tableStatusText, canSelect ? styles.tableStatusTextAvailable : styles.tableStatusTextMuted]}>
                        {isSelected ? 'مختارة' : canSelect ? 'متاحة' : 'غير متاحة'}
                      </ThemedText>
                    </View>
                  </AppPressableCard>
                );
              })}
            </View>
          </View>
        ) : null}

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      </ScrollView>

      <View style={styles.ctaBar}>
        <View style={styles.ctaTopRow}>
          <View style={styles.ctaSummaryBox}>
            <ThemedText style={styles.ctaSummaryLabel}>الطاولة المختارة</ThemedText>
            <ThemedText style={styles.ctaSummaryValue}>
              {selectedTable ? `${selectedTable.name} · ${safeGuestsCount} ضيوف` : '—'}
            </ThemedText>
          </View>
          <View style={styles.ctaSummaryBox}>
            <ThemedText style={styles.ctaSummaryLabel}>الموعد</ThemedText>
            <ThemedText style={styles.ctaSummaryValue}>{`${dateValue} · ${timeValue}`}</ThemedText>
          </View>
        </View>

        <AppButton
          disabled={!canSubmit}
          onPress={handleCreateReservation}
          style={[styles.ctaButton, !canSubmit && styles.disabledButton]}>
          {isSubmitting ? 'جاري الحجز...' : 'إتمام الحجز'}
        </AppButton>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isSuccessModalVisible}
        onRequestClose={() => {
          setIsSuccessModalVisible(false);
          setSuccessMessage(null);
        }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              تم الحجز بنجاح
            </ThemedText>
            <ThemedText style={styles.modalText}>
              {successMessage ?? 'تم إرسال حجزك بنجاح. بانتظار تأكيد المطعم.'}
            </ThemedText>
            <AppButton
              style={styles.modalButton}
              onPress={() => {
                setIsSuccessModalVisible(false);
                setSuccessMessage(null);
                router.replace('/(tabs)/reservations');
              }}>
              عرض حجوزاتي
            </AppButton>
            <Pressable
              onPress={() => {
                setIsSuccessModalVisible(false);
                setSuccessMessage(null);
              }}>
              <ThemedText style={styles.modalSecondaryAction}>إغلاق</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  stateCard: {
    alignItems: 'flex-end',
  },
  content: {
    padding: AppTheme.spacing[3],
    paddingBottom: 144,
    gap: AppTheme.spacing[2],
  },
  heroCard: {
    borderRadius: AppTheme.radius.lg,
    borderColor: 'rgba(229, 231, 235, 0.92)',
    backgroundColor: AppTheme.colors.surface,
    padding: AppTheme.spacing[3],
  },
  heroMainRow: {
    flexDirection: 'row-reverse',
    gap: AppTheme.spacing[3],
    alignItems: 'center',
  },
  heroImageWrap: {
    width: 108,
    height: 108,
    borderRadius: AppTheme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.95)',
    backgroundColor: 'rgba(255, 244, 230, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageFallback: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 5,
  },
  heroTop: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTinyIcon: {
    width: 24,
    height: 24,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.surface,
  },
  heroPill: {
    minHeight: 24,
    fontSize: 11,
    lineHeight: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroTitle: {
    color: AppTheme.colors.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'right',
  },
  heroAddress: {
    color: AppTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'right',
  },
  description: {
    color: AppTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
  },
  hoursRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: AppTheme.spacing[1],
  },
  hoursBadge: {
    minHeight: 24,
    fontSize: 11,
    lineHeight: 13,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 244, 230, 0.92)',
    color: AppTheme.colors.primaryHover,
  },
  stepCard: {
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.92)',
    backgroundColor: AppTheme.colors.surface,
    padding: AppTheme.spacing[3],
    gap: AppTheme.spacing[2],
  },
  stepHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  stepTitle: {
    color: AppTheme.colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    gap: AppTheme.spacing[2],
  },
  compactFieldChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.95)',
    borderRadius: AppTheme.radius.md,
    backgroundColor: AppTheme.colors.surface,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    minHeight: 46,
  },
  compactFieldInput: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 16,
    textAlign: 'right',
    paddingVertical: 8,
  },
  inputGroup: {
    flex: 1,
  },
  compactInput: {
    paddingVertical: 9,
    fontSize: 15,
    borderRadius: AppTheme.radius.md,
  },
  stepperWrap: {
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.95)',
    backgroundColor: AppTheme.colors.surface,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppTheme.spacing[2],
    paddingVertical: AppTheme.spacing[2],
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: AppTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 244, 230, 0.92)',
  },
  stepperSymbol: {
    color: AppTheme.colors.primaryHover,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepperValue: {
    color: AppTheme.colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  notesToggle: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    paddingVertical: 2,
  },
  notesToggleText: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'right',
  },
  notesInput: {
    minHeight: 68,
  },
  checkButton: {
    minHeight: 42,
    borderRadius: AppTheme.radius.pill,
  },
  tablesGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: AppTheme.spacing[2],
  },
  tableChip: {
    width: '48.6%',
    borderRadius: AppTheme.radius.md,
    borderColor: 'rgba(229, 231, 235, 0.95)',
    backgroundColor: AppTheme.colors.surface,
    padding: AppTheme.spacing[2],
    gap: AppTheme.spacing[1],
    minHeight: 112,
  },
  tableChipSelected: {
    borderColor: AppTheme.colors.primary,
    backgroundColor: 'rgba(255, 244, 230, 0.76)',
    borderWidth: 2,
  },
  tableChipDisabled: {
    opacity: 0.54,
  },
  tableChipTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  tableChipName: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'right',
  },
  tableChipMeta: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'right',
  },
  tableStatusPill: {
    alignSelf: 'flex-end',
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tableStatusAvailable: {
    backgroundColor: 'rgba(22, 163, 74, 0.11)',
  },
  tableStatusMuted: {
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
  },
  tableStatusText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableStatusTextAvailable: {
    color: AppTheme.colors.success,
  },
  tableStatusTextMuted: {
    color: AppTheme.colors.textSecondary,
  },
  error: {
    color: AppTheme.colors.error,
    fontWeight: '700',
    textAlign: 'right',
  },
  notice: {
    color: AppTheme.colors.primaryHover,
    fontWeight: '700',
    textAlign: 'right',
    fontSize: 13,
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(253, 186, 116, 0.44)',
    paddingHorizontal: AppTheme.spacing[3],
    paddingTop: AppTheme.spacing[2],
    paddingBottom: AppTheme.spacing[3],
    gap: AppTheme.spacing[2],
    backgroundColor: AppTheme.colors.surface,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 8,
  },
  ctaTopRow: {
    flexDirection: 'row-reverse',
    gap: AppTheme.spacing[2],
  },
  ctaSummaryBox: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 1,
  },
  ctaSummaryLabel: {
    color: AppTheme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'right',
  },
  ctaSummaryValue: {
    color: AppTheme.colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'right',
  },
  ctaButton: {
    minHeight: 46,
    borderRadius: AppTheme.radius.pill,
    shadowColor: AppTheme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: AppTheme.colors.borderStrong,
    opacity: 0.78,
    shadowOpacity: 0,
  },
  pressedBtn: {
    opacity: 0.72,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppTheme.spacing[5],
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing[5],
    gap: AppTheme.spacing[3],
    alignItems: 'stretch',
  },
  modalTitle: {
    textAlign: 'right',
    color: AppTheme.colors.text,
  },
  modalText: {
    textAlign: 'right',
    color: AppTheme.colors.textSecondary,
    lineHeight: 24,
  },
  modalButton: {
    marginTop: AppTheme.spacing[1],
  },
  modalSecondaryAction: {
    textAlign: 'center',
    color: AppTheme.colors.textSecondary,
    fontWeight: '700',
    paddingVertical: AppTheme.spacing[1],
  },
});

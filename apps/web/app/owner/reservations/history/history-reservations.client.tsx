"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getReservationStatusLabel, type ReservationStatus } from "../../reservation-utils";
import styles from "../../page.module.css";

type OwnedRestaurant = {
    id: string;
    name: string;
};

type HistoryReservation = {
    id: string;
    restaurantId: string;
    restaurantName: string;
    reservationDate: string;
    guestsCount: number;
    notes: string | null;
    status: ReservationStatus;
};

type HistoryFilter = "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED";
const TARGET_HISTORY_STATUSES: Array<"PENDING" | "CONFIRMED" | "CANCELLED"> = [
    "PENDING",
    "CONFIRMED",
    "CANCELLED",
];

type Props = {
    restaurants: OwnedRestaurant[];
};

function getStatusPresentation(status: ReservationStatus) {
    if (status === "PENDING") {
        return {
            badgeClass: styles.historyStatusPending,
            dotClass: styles.historyEventDotPending,
            icon: "⏱",
        };
    }

    if (status === "CONFIRMED") {
        return {
            badgeClass: styles.historyStatusConfirmed,
            dotClass: styles.historyEventDotConfirmed,
            icon: "✓",
        };
    }

    return {
        badgeClass: styles.historyStatusCancelled,
        dotClass: styles.historyEventDotCancelled,
        icon: "✕",
    };
}

function formatReservationDateTime(value: string) {
    return new Intl.DateTimeFormat("ar-SY-u-nu-latn", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

async function fetchReservationsByStatus(
    restaurantId: string,
    status: "PENDING" | "CONFIRMED" | "CANCELLED",
): Promise<HistoryReservation[]> {
    const response = await fetch(
        `/api/owner/restaurants/${restaurantId}/reservations?status=${status}`,
        {
            method: "GET",
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        },
    );

    const data = (await response.json().catch(() => null)) as
        | {
              message?: string;
          }
        | Array<{
              id: string;
              restaurantId: string;
              reservationDate: string;
              guestsCount: number;
              notes: string | null;
              status: ReservationStatus;
          }>
        | null;

    if (!response.ok) {
        const message =
            (data as { message?: string } | null)?.message ??
            "تعذر تحميل سجل الحجوزات حالياً.";
        throw new Error(message);
    }

    if (!Array.isArray(data)) {
        return [];
    }

    return data as HistoryReservation[];
}

function isHistoricalStatus(status: ReservationStatus) {
    return status === "PENDING" || status === "CONFIRMED" || status === "CANCELLED";
}

export function HistoryReservationsClient({ restaurants }: Props) {
    const router = useRouter();
    const [filter, setFilter] = useState<HistoryFilter>("ALL");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reservations, setReservations] = useState<HistoryReservation[]>([]);

    useEffect(() => {
        let isCancelled = false;

        async function loadHistoryReservations() {
            if (restaurants.length === 0) {
                setReservations([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const entries = await Promise.all(
                    restaurants.map(async (restaurant) => {
                        const settledResults = await Promise.allSettled(
                            TARGET_HISTORY_STATUSES.map((status) =>
                                fetchReservationsByStatus(restaurant.id, status),
                            ),
                        );

                        return settledResults
                            .flatMap((result) =>
                                result.status === "fulfilled" ? result.value : [],
                            )
                            .filter((reservation) => isHistoricalStatus(reservation.status))
                            .map((reservation) => ({
                                ...reservation,
                                restaurantName: restaurant.name,
                            }));
                    }),
                );

                if (isCancelled) {
                    return;
                }

                const merged = entries
                    .flat()
                    .filter((reservation) => isHistoricalStatus(reservation.status))
                    .sort(
                        (left, right) =>
                            new Date(right.reservationDate).getTime() -
                            new Date(left.reservationDate).getTime(),
                    );

                setReservations(merged);
            } catch (caughtError) {
                if (isCancelled) {
                    return;
                }

                const message =
                    caughtError instanceof Error
                        ? caughtError.message
                        : "تعذر تحميل سجل الحجوزات حالياً.";

                if (message.includes("انتهت صلاحية الجلسة")) {
                    router.replace("/login?next=/owner/reservations/history");
                    router.refresh();
                    return;
                }

                setError(message);
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadHistoryReservations();

        return () => {
            isCancelled = true;
        };
    }, [restaurants, router]);

    const cancelledCount = useMemo(
        () => reservations.filter((reservation) => reservation.status === "CANCELLED").length,
        [reservations],
    );
    const pendingCount = useMemo(
        () => reservations.filter((reservation) => reservation.status === "PENDING").length,
        [reservations],
    );
    const confirmedCount = useMemo(
        () => reservations.filter((reservation) => reservation.status === "CONFIRMED").length,
        [reservations],
    );
    const filteredReservations = useMemo(() => {
        if (filter === "ALL") {
            return reservations.filter((reservation) => isHistoricalStatus(reservation.status));
        }

        return reservations.filter((reservation) => reservation.status === filter);
    }, [filter, reservations]);

    const emptyStateMessage = useMemo(() => {
        if (filter === "CANCELLED") {
            return "لا توجد حجوزات ملغاة ضمن السجل حالياً.";
        }

        if (filter === "CONFIRMED") {
            return "لا توجد حجوزات مؤكدة ضمن السجل حالياً.";
        }

        if (filter === "PENDING") {
            return "لا توجد حجوزات قيد الانتظار ضمن السجل حالياً.";
        }

        return "لا توجد حجوزات تاريخية حالياً.";
    }, [filter]);

    return (
        <section className={styles.reservationsFullPage}>
            <section className={styles.metricsRow}>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>السجل</span>
                    <strong className={styles.metricValue}>{reservations.length}</strong>
                    <p className={styles.metricLabel}>إجمالي الحجوزات التاريخية</p>
                </article>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>ملغاة</span>
                    <strong className={styles.metricValue}>{cancelledCount}</strong>
                    <p className={styles.metricLabel}>حجوزات تم إلغاؤها</p>
                </article>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>قيد الانتظار</span>
                    <strong className={styles.metricValue}>{pendingCount}</strong>
                    <p className={styles.metricLabel}>حجوزات تنتظر المعالجة</p>
                </article>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>مؤكدة</span>
                    <strong className={styles.metricValue}>{confirmedCount}</strong>
                    <p className={styles.metricLabel}>حجوزات تم تأكيدها</p>
                </article>
            </section>

            <section className={`${styles.sectionCard} surface`}>
                <div className={styles.historyFilterTabs}>
                    <button
                        type="button"
                        className={`${styles.historyFilterTab} ${filter === "ALL" ? styles.historyFilterTabActive : ""}`}
                        onClick={() => setFilter("ALL")}
                    >
                        الكل
                    </button>
                    <button
                        type="button"
                        className={`${styles.historyFilterTab} ${filter === "PENDING" ? styles.historyFilterTabActive : ""}`}
                        onClick={() => setFilter("PENDING")}
                    >
                        قيد الانتظار
                    </button>
                    <button
                        type="button"
                        className={`${styles.historyFilterTab} ${filter === "CONFIRMED" ? styles.historyFilterTabActive : ""}`}
                        onClick={() => setFilter("CONFIRMED")}
                    >
                        المؤكدة
                    </button>
                    <button
                        type="button"
                        className={`${styles.historyFilterTab} ${filter === "CANCELLED" ? styles.historyFilterTabActive : ""}`}
                        onClick={() => setFilter("CANCELLED")}
                    >
                        الملغاة
                    </button>
                </div>

                {isLoading ? (
                    <section className={`${styles.stateCard} surface-alt`}>
                        <span className={styles.stateEyebrow}>جاري التحميل</span>
                        <p>يتم جلب سجل الحجوزات...</p>
                    </section>
                ) : error ? (
                    <section className={`${styles.stateCard} surface-alt`}>
                        <span className={styles.stateEyebrow}>تعذر تحميل السجل</span>
                        <p>{error}</p>
                    </section>
                ) : filteredReservations.length === 0 ? (
                    <section className={`${styles.stateCard} surface-alt`}>
                        <span className={styles.stateEyebrow}>لا توجد بيانات</span>
                        <p>{emptyStateMessage}</p>
                    </section>
                ) : (
                    <div className={styles.historyList}>
                        {filteredReservations.map((reservation) => {
                            const statusPresentation = getStatusPresentation(reservation.status);

                            return (
                                <article key={reservation.id} className={styles.historyEvent}>
                                    <div className={styles.historyEventRail}>
                                        <span
                                            className={`${styles.historyEventDot} ${statusPresentation.dotClass}`}
                                            aria-hidden="true"
                                        />
                                        <span className={styles.historyEventLine} aria-hidden="true" />
                                    </div>

                                    <div className={styles.historyRow}>
                                        <div className={styles.historyRowTop}>
                                            <p className={styles.historyRestaurantName}>{reservation.restaurantName}</p>
                                            <span
                                                className={`${styles.historyStatusChip} ${statusPresentation.badgeClass}`}
                                            >
                                                <span className={styles.historyStatusIcon} aria-hidden="true">
                                                    {statusPresentation.icon}
                                                </span>
                                                {getReservationStatusLabel(reservation.status)}
                                            </span>
                                        </div>

                                        <div className={styles.historyRowInfo}>
                                            <p className={styles.historyDateTime}>
                                                {formatReservationDateTime(reservation.reservationDate)}
                                            </p>
                                            <span className={styles.historyGuestsChip}>
                                                {reservation.guestsCount} ضيوف
                                            </span>
                                        </div>

                                        <p className={styles.historyReservationRef}>مرجع الحجز: {reservation.id.slice(-8)}</p>

                                        {reservation.notes?.trim() ? (
                                            <p className={styles.historyNotes}>ملاحظات: {reservation.notes}</p>
                                        ) : null}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </section>
    );
}

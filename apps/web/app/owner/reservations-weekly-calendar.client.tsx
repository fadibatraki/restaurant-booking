"use client";

import { useRouter } from "next/navigation";
import { FormEvent, Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { ReservationActions } from "./reservation-actions";
import { getReservationStatusLabel } from "./reservation-utils";
import type { ReservationStatus } from "./reservation-utils";
import styles from "./page.module.css";

type Reservation = {
    id: string;
    userId: string;
    restaurantId: string;
    tableId: string;
    reservationDate: string;
    guestsCount: number;
    notes: string | null;
    status: ReservationStatus;
    createdAt: string;
};

type TableOption = {
    id: string;
    name: string;
    capacity: number;
    isActive: boolean;
    status: string;
};

type Props = {
    reservations: Reservation[];
    restaurantId: string;
    restaurantName: string;
    openTime?: string | null;
    closeTime?: string | null;
    selectedStatus?: ReservationStatus;
    isScopedToRestaurant?: boolean;
    tables: TableOption[];
};
type LiveNotice = {
    title: string;
    message: string;
    tone: "success" | "warning";
};

const locale = "ar-SY-u-nu-latn";

function getWeekStart(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseHour(value?: string | null, fallback = 9) {
    if (!value) return fallback;
    const [hour] = value.split(":");
    const parsed = Number(hour);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function buildCalendarHours(openTime?: string | null, closeTime?: string | null) {
    const startHour = parseHour(openTime, 9);
    const rawEndHour = parseHour(closeTime, 23);
    const spansPastMidnight = rawEndHour <= startHour;
    const endHour = spansPastMidnight ? rawEndHour + 24 : rawEndHour;

    return Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
}

function normalizeCalendarHour(hour: number, visibleStartHour: number) {
    return hour < visibleStartHour ? hour + 24 : hour;
}

function formatCalendarHourLabel(hour: number) {
    return `${(hour % 24).toString().padStart(2, "0")}:00`;
}

function formatWeekRange(weekStart: Date) {
    const weekEnd = addDays(weekStart, 6);
    const start = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(weekStart);
    const end = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(weekEnd);
    return `${start} - ${end}`;
}

function formatDay(date: Date) {
    return {
        name: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date),
        date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric" }).format(date),
    };
}

function formatTime(value: string) {
    return new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatTimeRange(value: string, durationMinutes = 90) {
    const start = new Date(value);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return `${formatTime(start.toISOString())} - ${formatTime(end.toISOString())}`;
}

function formatReservationDateTime(value: string) {
    return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatPeakHourLabel(hour: number | null) {
    if (hour === null) {
        return "لا توجد ذروة";
    }

    return `${hour.toString().padStart(2, "0")}:00`;
}

function toDateInputValue(date: Date) {
    return date.toISOString().slice(0, 10);
}

function roundToNextHour(date: Date) {
    const rounded = new Date(date);
    rounded.setMinutes(0, 0, 0);
    rounded.setHours(rounded.getHours() + 1);
    return rounded;
}

function buildInitialTime(openTime?: string | null) {
    if (openTime) {
        return openTime.slice(0, 5);
    }

    const rounded = roundToNextHour(new Date());
    return `${rounded.getHours().toString().padStart(2, "0")}:00`;
}

function combineDateTime(date: string, time: string) {
    return new Date(`${date}T${time}:00`);
}

function buildSlotDateTime(day: Date, hour: number) {
    const slotDate = new Date(day);
    slotDate.setHours(hour % 24, 0, 0, 0);
    return slotDate;
}

function isBlockingReservation(reservation: Reservation, reservationDateTime: Date) {
    if (reservation.status !== "PENDING" && reservation.status !== "CONFIRMED") {
        return false;
    }

    return new Date(reservation.reservationDate).getTime() === reservationDateTime.getTime();
}

function getStatusDotClass(status: ReservationStatus) {
    if (status === "PENDING") return styles.calendarDotPending;
    if (status === "CONFIRMED") return styles.calendarDotConfirmed;
    return styles.calendarDotCancelled;
}

function hasReservationsSnapshotChanged(current: Reservation[], next: Reservation[]) {
    if (current.length !== next.length) {
        return true;
    }

    return current.some((reservation, index) => {
        const nextReservation = next[index];

        if (!nextReservation) {
            return true;
        }

        return (
            reservation.id !== nextReservation.id ||
            reservation.status !== nextReservation.status ||
            reservation.reservationDate !== nextReservation.reservationDate ||
            reservation.tableId !== nextReservation.tableId ||
            reservation.guestsCount !== nextReservation.guestsCount ||
            reservation.notes !== nextReservation.notes
        );
    });
}

function buildOwnerLiveNotice(current: Reservation[], next: Reservation[]): LiveNotice | null {
    const currentById = new Map(current.map((reservation) => [reservation.id, reservation]));
    const nextById = new Map(next.map((reservation) => [reservation.id, reservation]));

    const addedReservation = next.find((reservation) => !currentById.has(reservation.id));
    if (addedReservation) {
        return {
            title: "حجز جديد",
            message: "وصل طلب حجز جديد من أحد الزبائن.",
            tone: "success",
        };
    }

    const removedReservation = current.find((reservation) => !nextById.has(reservation.id));
    if (removedReservation) {
        return {
            title: "إلغاء من الزبون",
            message: "تم حذف أو إلغاء حجز من جهة الزبون.",
            tone: "warning",
        };
    }

    const changedReservation = next.find((reservation) => {
        const previous = currentById.get(reservation.id);
        return previous && previous.status !== reservation.status;
    });

    if (!changedReservation) {
        return null;
    }

    if (changedReservation.status === "CONFIRMED") {
        return {
            title: "تمت الموافقة",
            message: "تمت الموافقة على أحد الحجوزات.",
            tone: "success",
        };
    }

    if (changedReservation.status === "CANCELLED") {
        return {
            title: "تم الإلغاء",
            message: "تم إلغاء أحد الحجوزات.",
            tone: "warning",
        };
    }

    return null;
}

export function ReservationsWeeklyCalendar({
    reservations,
    restaurantId,
    restaurantName,
    openTime,
    closeTime,
    selectedStatus: _selectedStatus,
    isScopedToRestaurant = false,
    tables,
}: Props) {
    const router = useRouter();
    const [isSubmitting, startTransition] = useTransition();
    const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const availableTables = tables.filter((table) => table.isActive && table.status === "AVAILABLE");
    const [selectedTableId, setSelectedTableId] = useState(() => availableTables[0]?.id ?? "");
    const [reservationDate, setReservationDate] = useState(() => toDateInputValue(new Date()));
    const [reservationTime, setReservationTime] = useState(() => buildInitialTime(openTime));
    const [guestsCount, setGuestsCount] = useState("2");
    const [notes, setNotes] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [liveReservations, setLiveReservations] = useState(reservations);
    const [liveNotice, setLiveNotice] = useState<LiveNotice | null>(null);

    useEffect(() => {
        setLiveReservations(reservations);
    }, [reservations]);

    useEffect(() => {
        if (!liveNotice) {
            return;
        }

        const timer = setTimeout(() => {
            setLiveNotice(null);
        }, 2800);

        return () => {
            clearTimeout(timer);
        };
    }, [liveNotice]);

    useEffect(() => {
        let isDisposed = false;
        let refreshTimer: ReturnType<typeof setTimeout> | undefined;

        async function pollReservations() {
            try {
                const response = await fetch(`/api/owner/restaurants/${restaurantId}/reservations`, {
                    method: "GET",
                    cache: "no-store",
                });

                if (response.status === 401) {
                    router.replace("/login?next=/owner/reservations");
                    router.refresh();
                    return;
                }

                if (!response.ok) {
                    return;
                }

                const data = (await response.json().catch(() => null)) as Reservation[] | null;

                if (!isDisposed && Array.isArray(data)) {
                    setLiveReservations((current) => {
                        if (!hasReservationsSnapshotChanged(current, data)) {
                            return current;
                        }

                        const nextNotice = buildOwnerLiveNotice(current, data);
                        if (nextNotice) {
                            setLiveNotice(nextNotice);
                        }

                        return data;
                    });
                }
            } catch {
                // Polling is best-effort; UI remains usable if one cycle fails.
            } finally {
                if (!isDisposed) {
                    refreshTimer = setTimeout(pollReservations, 2500);
                }
            }
        }

        void pollReservations();

        return () => {
            isDisposed = true;
            if (refreshTimer) {
                clearTimeout(refreshTimer);
            }
        };
    }, [restaurantId, router]);

    useEffect(() => {
        if (!selectedReservation) {
            return;
        }

        const updatedReservation = liveReservations.find(
            (reservation) => reservation.id === selectedReservation.id,
        );

        if (!updatedReservation) {
            setSelectedReservation(null);
            return;
        }

        if (
            updatedReservation.status !== selectedReservation.status ||
            updatedReservation.reservationDate !== selectedReservation.reservationDate ||
            updatedReservation.tableId !== selectedReservation.tableId ||
            updatedReservation.guestsCount !== selectedReservation.guestsCount ||
            updatedReservation.notes !== selectedReservation.notes
        ) {
            setSelectedReservation(updatedReservation);
        }
    }, [liveReservations, selectedReservation]);

    const hours = useMemo(() => buildCalendarHours(openTime, closeTime), [openTime, closeTime]);
    const visibleStartHour = hours[0] ?? 9;
    const selectedReservationDateTime = useMemo(
        () => combineDateTime(reservationDate, reservationTime),
        [reservationDate, reservationTime],
    );
    const selectableTables = useMemo(() => {
        if (Number.isNaN(selectedReservationDateTime.getTime())) {
            return tables.filter((table) => table.isActive);
        }

        return tables.filter((table) => {
            if (!table.isActive) {
                return false;
            }

            return !liveReservations.some(
                (reservation) =>
                    reservation.tableId === table.id &&
                    isBlockingReservation(reservation, selectedReservationDateTime),
            );
        });
    }, [liveReservations, selectedReservationDateTime, tables]);

    useEffect(() => {
        if (!selectableTables.some((table) => table.id === selectedTableId)) {
            setSelectedTableId(selectableTables[0]?.id ?? "");
        }
    }, [selectableTables, selectedTableId]);

    const weekDays = useMemo(
        () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
        [weekStart],
    );

    const reservationsByCell = useMemo(() => {
        const map = new Map<string, Reservation[]>();

        for (const reservation of liveReservations) {
            const reservationDate = new Date(reservation.reservationDate);
            const dayIndex = weekDays.findIndex((day) => isSameDay(day, reservationDate));
            if (dayIndex === -1) continue;

            const hour = normalizeCalendarHour(reservationDate.getHours(), visibleStartHour);
            const key = `${dayIndex}-${hour}`;
            const current = map.get(key) ?? [];

            current.push(reservation);
            map.set(
                key,
                current.sort(
                    (a, b) =>
                        new Date(a.reservationDate).getTime() -
                        new Date(b.reservationDate).getTime(),
                ),
            );
        }

        return map;
    }, [liveReservations, visibleStartHour, weekDays]);

    const tableNameById = useMemo(
        () => new Map(tables.map((table) => [table.id, table.name])),
        [tables],
    );

    const todayReservationsCount = useMemo(
        () => liveReservations.filter((reservation) => isSameDay(new Date(reservation.reservationDate), new Date())).length,
        [liveReservations],
    );

    const pendingReservationsCount = useMemo(
        () => liveReservations.filter((reservation) => reservation.status === "PENDING").length,
        [liveReservations],
    );

    const availableTablesCount = useMemo(
        () => tables.filter((table) => table.isActive && table.status === "AVAILABLE").length,
        [tables],
    );

    const peakHour = useMemo(() => {
        if (liveReservations.length === 0) {
            return null;
        }

        const counts = new Map<number, number>();

        for (const reservation of liveReservations) {
            const hour = new Date(reservation.reservationDate).getHours();
            counts.set(hour, (counts.get(hour) ?? 0) + 1);
        }

        let busiestHour: number | null = null;
        let busiestCount = -1;

        for (const [hour, count] of counts.entries()) {
            if (count > busiestCount) {
                busiestHour = hour;
                busiestCount = count;
            }
        }

        return busiestHour;
    }, [liveReservations]);

    function handleCreateFromSlot(day: Date, hour: number) {
        const slotDateTime = buildSlotDateTime(day, hour);

        setReservationDate(toDateInputValue(slotDateTime));
        setReservationTime(`${(hour % 24).toString().padStart(2, "0")}:00`);
        setFormError(null);
        setFormSuccess(null);
        setSelectedReservation(null);
        setIsCreateModalOpen(true);
    }

    async function handleCreateReservation(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);
        setFormSuccess(null);

        const parsedGuestsCount = Number(guestsCount);

        if (!selectedTableId) {
            setFormError("اختر طاولة صالحة قبل إنشاء الحجز.");
            return;
        }

        if (!Number.isInteger(parsedGuestsCount) || parsedGuestsCount < 1) {
            setFormError("عدد الضيوف يجب أن يكون رقماً صحيحاً أكبر من صفر.");
            return;
        }

        const reservationDateTime = combineDateTime(reservationDate, reservationTime);

        if (Number.isNaN(reservationDateTime.getTime()) || reservationDateTime <= new Date()) {
            setFormError("اختر وقتاً مستقبلياً صالحاً للحجز.");
            return;
        }

        startTransition(async () => {
            try {
                const response = await fetch("/api/reservations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        restaurantId,
                        tableId: selectedTableId,
                        reservationDate: reservationDateTime.toISOString(),
                        guestsCount: parsedGuestsCount,
                        notes: notes.trim() || undefined,
                    }),
                });

                const data = (await response.json().catch(() => null)) as { message?: string } | null;

                if (response.status === 401) {
                    router.replace("/login?next=/owner/reservations");
                    router.refresh();
                    return;
                }

                if (!response.ok) {
                    setFormError(data?.message || "تعذر إنشاء الحجز حالياً.");
                    return;
                }

                setFormSuccess("تم إنشاء الحجز بنجاح. جارٍ تحديث الصفحة...");
                setTimeout(() => {
                    setIsCreateModalOpen(false);
                    setFormSuccess(null);
                    setNotes("");
                    router.refresh();
                }, 700);
            } catch {
                setFormError("خدمة الحجوزات غير متاحة حالياً. حاول مرة أخرى بعد قليل.");
            }
        });
    }

    return (
        <>
            {liveNotice ? (
                <div
                    className={`${styles.liveNotice} ${liveNotice.tone === "warning" ? styles.liveNoticeWarning : styles.liveNoticeSuccess}`}
                    role="status"
                    aria-live="polite"
                >
                    <strong>{liveNotice.title}</strong>
                    <span>{liveNotice.message}</span>
                </div>
            ) : null}
            <section className={styles.reservationsWorkspace}>
                <div className={styles.reservationsMainPanel}>
                    <div className={styles.reservationsHero}>

                    </div>

                    <section className={styles.reservationsSummaryGrid} aria-label="ملخص الإحصاءات">
                        <article className={styles.reservationsSummaryTile}>
                            <div className={styles.reservationsSummaryIcon} aria-hidden="true">◷</div>
                            <div>
                                <span>حجوزات اليوم</span>
                                <strong>{todayReservationsCount}</strong>
                                <small>إجمالي الحجوزات لهذا اليوم</small>
                            </div>
                        </article>
                        <article className={styles.reservationsSummaryTile}>
                            <div className={styles.reservationsSummaryIcon} aria-hidden="true">!</div>
                            <div>
                                <span>الحجوزات المعلقة</span>
                                <strong>{pendingReservationsCount}</strong>
                                <small>بانتظار التأكيد أو المتابعة</small>
                            </div>
                        </article>
                        <article className={styles.reservationsSummaryTile}>
                            <div className={styles.reservationsSummaryIcon} aria-hidden="true">□</div>
                            <div>
                                <span>الطاولات المتاحة</span>
                                <strong>{availableTablesCount}</strong>
                                <small>صالحة للحجز حالياً</small>
                            </div>
                        </article>
                        <article className={styles.reservationsSummaryTile}>
                            <div className={styles.reservationsSummaryIcon} aria-hidden="true">↟</div>
                            <div>
                                <span>ساعة الذروة</span>
                                <strong>{formatPeakHourLabel(peakHour)}</strong>
                                <small>الأكثر ازدحاماً بين الحجوزات</small>
                            </div>
                        </article>
                    </section>

                    <div className={styles.reservationsCalendarCard}>
                        <div className={styles.reservationsCalendarToolbar}>
                            <div className={styles.reservationsCalendarToolbarRight}>

                                <button type="button" className={styles.reservationsToolbarIcon} onClick={() => setWeekStart(addDays(weekStart, -7))}>
                                    ‹
                                </button>
                                <button type="button" className={styles.reservationsToolbarIcon} onClick={() => setWeekStart(addDays(weekStart, 7))}>
                                    ›
                                </button>
                                <button type="button" className={styles.reservationsToolbarChip} onClick={() => setWeekStart(getWeekStart(new Date()))}>
                                    اليوم
                                </button>

                            </div>

                            <div className={styles.reservationsCalendarToolbarCenter}>
                                <strong>{formatWeekRange(weekStart)}</strong>
                            </div>

                            <div className={styles.reservationsCalendarToolbarLeft}>

                                <button type="button" className={styles.reservationsCreateMain} onClick={() => setIsCreateModalOpen(true)} disabled={selectableTables.length === 0 || isSubmitting}>
                                    + حجز جديد
                                </button>
                            </div>
                        </div>

                        <div className={styles.reservationsCalendarScroll}>
                            <div
                                className={styles.reservationsCalendarGrid}
                                style={{ "--calendar-hours": hours.length } as React.CSSProperties}
                            >
                                <div className={styles.reservationsCalendarCorner}>الوقت</div>

                                {weekDays.map((day) => {
                                    const formatted = formatDay(day);
                                    const today = isSameDay(day, new Date());

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={`${styles.reservationsDayHeader} ${today ? styles.reservationsDayHeaderToday : ""}`}
                                        >
                                            <strong>{formatted.name}</strong>
                                            <span>{formatted.date}</span>
                                        </div>
                                    );
                                })}

                                {hours.map((hour) => (
                                    <Fragment key={`row-${hour}`}>
                                        <div key={`time-${hour}`} className={styles.reservationsTimeCell}>
                                            {formatCalendarHourLabel(hour)}
                                        </div>

                                        {weekDays.map((day, dayIndex) => {
                                            const key = `${dayIndex}-${hour}`;
                                            const cellReservations = reservationsByCell.get(key) ?? [];

                                            return (
                                                <div
                                                    key={`${day.toISOString()}-${hour}`}
                                                    className={`${styles.reservationsSlot} ${isSameDay(day, new Date()) ? styles.reservationsSlotToday : ""} ${cellReservations.length === 0 ? styles.reservationsSlotEmpty : ""}`}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`إنشاء حجز يوم ${formatDay(day).name} ${formatDay(day).date} الساعة ${formatCalendarHourLabel(hour)}`}
                                                    data-slot-hint={cellReservations.length === 0 ? "انقر لإضافة حجز" : undefined}
                                                    onClick={() => handleCreateFromSlot(day, hour)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter" || event.key === " ") {
                                                            event.preventDefault();
                                                            handleCreateFromSlot(day, hour);
                                                        }
                                                    }}
                                                >
                                                    {cellReservations.length > 0 ? (
                                                        <div className={styles.reservationsSlotStack}>
                                                            {cellReservations.map((reservation) => (
                                                                <article
                                                                    key={reservation.id}
                                                                    className={`${styles.reservationsEventCard} ${styles[`reservationsEvent${reservation.status}`]}`}
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        setSelectedReservation(reservation);
                                                                    }}
                                                                    onKeyDown={(event) => {
                                                                        if (event.key === "Enter" || event.key === " ") {
                                                                            event.preventDefault();
                                                                            event.stopPropagation();
                                                                            setSelectedReservation(reservation);
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className={styles.reservationsEventHead}>
                                                                        <span className={`${styles.reservationsEventDot} ${getStatusDotClass(reservation.status)}`} />
                                                                        <strong>{formatTimeRange(reservation.reservationDate)}</strong>
                                                                    </div>
                                                                    <div className={styles.reservationsEventBody}>
                                                                        <b>{getReservationStatusLabel(reservation.status)}</b>
                                                                        <div className={styles.reservationsEventMetaLine}>
                                                                            <span>{reservation.guestsCount} أشخاص</span>
                                                                            <small>{tableNameById.get(reservation.tableId) ?? `طاولة ${reservation.tableId.slice(-4)}`}</small>
                                                                        </div>
                                                                    </div>
                                                                </article>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {isCreateModalOpen ? (
                <div className={styles.reservationsModalBackdrop} onClick={() => setIsCreateModalOpen(false)}>
                    <section className={`${styles.reservationsModalCard} surface`} onClick={(event) => event.stopPropagation()}>
                   

                        <form className={styles.reservationsCreateForm} onSubmit={handleCreateReservation}>
                            <div className={styles.reservationsCreateGrid}>
                                <div className="input-shell">
                                    <label htmlFor="reservation-table" className="input-label">الطاولة</label>
                                    <select id="reservation-table" value={selectedTableId} onChange={(event) => setSelectedTableId(event.target.value)}>
                                        {selectableTables.map((table) => (
                                            <option key={table.id} value={table.id}>
                                                {table.name} · {table.capacity} أشخاص
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-shell">
                                    <label htmlFor="reservation-guests" className="input-label">عدد الضيوف</label>
                                    <input id="reservation-guests" type="number" min="1" value={guestsCount} onChange={(event) => setGuestsCount(event.target.value)} />
                                </div>

                                <div className="input-shell">
                                    <label htmlFor="reservation-date" className="input-label">التاريخ</label>
                                    <input id="reservation-date" type="date" value={reservationDate} onChange={(event) => setReservationDate(event.target.value)} />
                                </div>

                                <div className="input-shell">
                                    <label htmlFor="reservation-time" className="input-label">الوقت</label>
                                    <input id="reservation-time" type="time" value={reservationTime} onChange={(event) => setReservationTime(event.target.value)} />
                                </div>
                            </div>

                            <div className="input-shell">
                                <label htmlFor="reservation-notes" className="input-label">ملاحظات</label>
                                <textarea id="reservation-notes" className={styles.reservationsNotesInput} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="أي ملاحظات إضافية على الحجز" rows={4} />
                            </div>

                            {selectableTables.length === 0 ? <p className={styles.actionFeedbackError}>لا توجد طاولات متاحة في هذا الوقت المحدد. اختر وقتاً آخر.</p> : null}

                            {formError ? <p className={styles.actionFeedbackError}>{formError}</p> : null}
                            {formSuccess ? <p className={styles.actionFeedbackSuccess}>{formSuccess}</p> : null}

                            <div className={styles.reservationsCreateActions}>
                                <button type="submit" className="button-primary" disabled={isSubmitting || selectableTables.length === 0}>
                                    {isSubmitting ? "جارٍ الحفظ..." : "حفظ الحجز"}
                                </button>
                                <button type="button" className="button-ghost" onClick={() => setIsCreateModalOpen(false)}>
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            ) : null}
            {selectedReservation ? (
                <div className={styles.reservationsModalBackdrop} onClick={() => setSelectedReservation(null)}>
                    <section className={`${styles.reservationsModalCard} surface`} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.reservationsModalHeader}>
                            <div>
                                <p className={styles.cardEyebrow}>تفاصيل الحجز</p>
                                <h3>التحكم بالحجز</h3>
                                <p>يمكنك مراجعة بيانات الحجز ثم الموافقة عليه أو إلغاؤه من هذه النافذة.</p>
                            </div>
                            <button type="button" className={styles.reservationsModalClose} onClick={() => setSelectedReservation(null)} aria-label="إغلاق">
                                ×
                            </button>
                        </div>

                        <div className={styles.reservationsDetailGrid}>
                            <div className={styles.reservationsDetailItem}>
                                <span>الحالة</span>
                                <strong>{getReservationStatusLabel(selectedReservation.status)}</strong>
                            </div>
                            <div className={styles.reservationsDetailItem}>
                                <span>الوقت</span>
                                <strong>{formatTimeRange(selectedReservation.reservationDate)}</strong>
                            </div>
                            <div className={styles.reservationsDetailItem}>
                                <span>التاريخ</span>
                                <strong>{formatReservationDateTime(selectedReservation.reservationDate)}</strong>
                            </div>
                            <div className={styles.reservationsDetailItem}>
                                <span>الطاولة</span>
                                <strong>{tableNameById.get(selectedReservation.tableId) ?? `طاولة ${selectedReservation.tableId.slice(-4)}`}</strong>
                            </div>
                            <div className={styles.reservationsDetailItem}>
                                <span>عدد الضيوف</span>
                                <strong>{selectedReservation.guestsCount} أشخاص</strong>
                            </div>
                            <div className={styles.reservationsDetailItem}>
                                <span>الملاحظات</span>
                                <strong>{selectedReservation.notes?.trim() || "لا توجد ملاحظات"}</strong>
                            </div>
                        </div>

                        {selectedReservation.status === "PENDING" || selectedReservation.status === "CONFIRMED" || selectedReservation.status === "CANCELLED" ? (
                            <ReservationActions
                                reservation={selectedReservation}
                                onSuccess={() => setSelectedReservation(null)}
                            />
                        ) : (
                            <p className={styles.reservationsDetailNotice}>
                                تمت معالجة هذا الحجز مسبقًا.
                            </p>
                        )}
                    </section>
                </div>
            ) : null}
        </>
    );
}

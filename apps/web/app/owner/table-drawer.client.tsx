"use client";

import { useEffect, useState, useTransition } from "react";
import type { RestaurantTable, RestaurantReservation } from "./owner-dashboard";
import { updateTableStatus } from "./table-actions";
import styles from "./page.module.css";

type TableStatus = "available" | "reserved" | "full";

type TableDrawerProps = {
    table: RestaurantTable | null;
    status: TableStatus;
    nextReservation?: RestaurantReservation;
    upcomingReservations: RestaurantReservation[];
    onClose: () => void;
};

function formatReservationDate(value: string) {
    return new Intl.DateTimeFormat("ar-SY-u-nu-latn", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

function getStatusLabel(status: TableStatus): string {
    switch (status) {
        case "available":
            return "فارغة";
        case "reserved":
            return "محجوزة";
        case "full":
            return "ممتلئة";
        default:
            return "غير معروف";
    }
}

function getStatusColor(status: TableStatus): string {
    switch (status) {
        case "available":
            return styles.statusAvailable || "";
        case "reserved":
            return styles.statusReserved || "";
        case "full":
            return styles.statusFull || "";
        default:
            return "";
    }
}

export function TableDrawer({ table, status, nextReservation: _nextReservation, upcomingReservations, onClose }: TableDrawerProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const reservationItems = upcomingReservations.length > 0
        ? upcomingReservations
        : _nextReservation
            ? [_nextReservation]
            : [];

    const handleStatusUpdate = (newStatus: "AVAILABLE" | "RESERVED" | "OCCUPIED") => {
        if (!table) return;

        setError(null);
        setSuccessMessage(null);

        startTransition(async () => {
            const result = await updateTableStatus(table.id, newStatus);

            if (result.success) {
                setSuccessMessage("تم تحديث حالة الطاولة بنجاح");
                setTimeout(() => {
                    setSuccessMessage(null);
                    onClose();
                }, 1500);
            } else {
                setError(result.error || "حدث خطأ غير متوقع");
            }
        });
    };

    useEffect(() => {
        if (table) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [table]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        if (table) {
            window.addEventListener("keydown", handleEscape);
        }

        return () => {
            window.removeEventListener("keydown", handleEscape);
        };
    }, [table, onClose]);

    if (!table) {
        return null;
    }

    return (
        <>
            {/* Backdrop */}
            <div className={styles.drawerBackdrop} onClick={onClose} />

            {/* Popup */}
            <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="table-popup-title">
                <div className={styles.drawerHeader}>
                    <div>
                        <h2 id="table-popup-title" className={styles.drawerTitle}>{table.name}</h2>
                        <p className={styles.drawerSubtitle}>إدارة الطاولة</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={styles.drawerCloseButton}
                        aria-label="إغلاق"
                    >
                        ✕
                    </button>
                </div>

                <div className={styles.drawerContent}>
                    {/* Table Info Card */}
                    <section className={`${styles.drawerCard} surface`}>
                        <h3 className={styles.drawerCardTitle}>معلومات الطاولة</h3>
                        <dl className={styles.drawerInfoGrid}>
                            <div className={styles.drawerInfoItem}>
                                <dt>السعة</dt>
                                <dd>{table.capacity} ضيوف</dd>
                            </div>
                            <div className={styles.drawerInfoItem}>
                                <dt>الحالة الحالية</dt>
                                <dd>
                                    <span className={`${styles.drawerStatusBadge} ${getStatusColor(status)}`}>
                                        {getStatusLabel(status)}
                                    </span>
                                </dd>
                            </div>
                            <div className={styles.drawerInfoItem}>
                                <dt>معرّف الطاولة</dt>
                                <dd className={styles.drawerMonoText}>{table.id}</dd>
                            </div>
                            <div className={styles.drawerInfoItem}>
                                <dt>التفعيل</dt>
                                <dd>{table.isActive ? "مفعلة" : "غير مفعلة"}</dd>
                            </div>
                        </dl>
                    </section>

                    {/* Upcoming Reservations Card */}
                    <section className={`${styles.drawerCard} ${styles.drawerReservationCard} surface`}>
                        <h3 className={styles.drawerCardTitle}>الحجوزات القادمة</h3>
                        {reservationItems.length > 0 ? (
                            <div className={styles.drawerReservationList}>
                                {reservationItems.map((reservation) => (
                                    <article key={reservation.id} className={styles.drawerReservationInfo}>
                                        <div className={styles.drawerReservationRow}>
                                            <span className={styles.drawerReservationLabel}>الموعد</span>
                                            <span className={styles.drawerReservationValue}>
                                                {formatReservationDate(reservation.reservationDate)}
                                            </span>
                                        </div>
                                        <div className={styles.drawerReservationRow}>
                                            <span className={styles.drawerReservationLabel}>عدد الضيوف</span>
                                            <span className={styles.drawerReservationValue}>
                                                {reservation.guestsCount} ضيوف
                                            </span>
                                        </div>
                                        <div className={styles.drawerReservationRow}>
                                            <span className={styles.drawerReservationLabel}>الحالة</span>
                                            <span className={`${styles.drawerReservationValue} ${styles.drawerReservationStatus}`}>
                                                {reservation.status === "PENDING" ? "قيد الانتظار" : "مؤكد"}
                                            </span>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.drawerReservationEmpty}>
                                <p>لا توجد حجوزات قادمة لهذه الطاولة حالياً.</p>
                            </div>
                        )}
                    </section>

                    {/* Quick Actions */}
                    <section className={styles.drawerActions}>
                        <h3 className={styles.drawerCardTitle}>إجراءات سريعة</h3>

                        {/* Success/Error Messages */}
                        {successMessage && (
                            <div className={styles.drawerSuccessMessage}>
                                <p>✓ {successMessage}</p>
                            </div>
                        )}
                        {error && (
                            <div className={styles.drawerErrorMessage}>
                                <p>✗ {error}</p>
                            </div>
                        )}

                        <div className={styles.drawerActionsGrid}>
                            <button
                                type="button"
                                className={`${styles.drawerActionButton} ${styles.drawerActionAvailable}`}
                                onClick={() => handleStatusUpdate("AVAILABLE")}
                                disabled={isPending}
                            >
                                <span className={styles.drawerActionIcon}>🟢</span>
                                <span>جعلها فارغة</span>
                            </button>
                            <button
                                type="button"
                                className={`${styles.drawerActionButton} ${styles.drawerActionReserved}`}
                                onClick={() => handleStatusUpdate("RESERVED")}
                                disabled={isPending}
                            >
                                <span className={styles.drawerActionIcon}>🟡</span>
                                <span>جعلها محجوزة</span>
                            </button>
                            <button
                                type="button"
                                className={`${styles.drawerActionButton} ${styles.drawerActionOccupied}`}
                                onClick={() => handleStatusUpdate("OCCUPIED")}
                                disabled={isPending}
                            >
                                <span className={styles.drawerActionIcon}>🔴</span>
                                <span>جعلها ممتلئة</span>
                            </button>
                        </div>
                    </section>

                    {/* Coming Soon Notice */}
                    {isPending && (
                        <div className={styles.drawerNotice}>
                            <p className={styles.drawerNoticeText}>
                                ⏳ جاري تحديث الحالة...
                            </p>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}

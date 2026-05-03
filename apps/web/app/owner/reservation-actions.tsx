"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "./page.module.css";

type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

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

type ReservationAction = "confirm" | "reject" | "cancel" | "delete";

type ReservationActionsProps = {
    reservation: Reservation;
    onSuccess?: (action: ReservationAction) => void;
};

function getSuccessMessage(action: ReservationAction) {
    if (action === "confirm") {
        return "تمت الموافقة على الحجز. جارٍ تحديث اللوحة...";
    }

    if (action === "reject") {
        return "تم إلغاء الحجز. جارٍ تحديث اللوحة...";
    }

    if (action === "cancel") {
        return "تم إلغاء الحجز المؤكد. جارٍ تحديث اللوحة...";
    }

    return "تم حذف الحجز. جارٍ تحديث اللوحة...";
}

export function ReservationActions({ reservation, onSuccess }: ReservationActionsProps) {
    const router = useRouter();
    const [currentReservation, setCurrentReservation] = useState(reservation);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);
    const [pendingAction, setPendingAction] = useState<ReservationAction | null>(null);
    const [isRefreshing, startTransition] = useTransition();

    const canReview = currentReservation.status === "PENDING";
    const canCancelConfirmed = currentReservation.status === "CONFIRMED";
    const canDeleteCancelled = currentReservation.status === "CANCELLED";
    const isBusy = pendingAction !== null || isRefreshing;

    async function handleAction(action: ReservationAction) {
        setPendingAction(action);
        setFeedback(null);
        setFeedbackType(null);

        try {
            const response = await fetch(
                `/api/owner/restaurants/${currentReservation.restaurantId}/reservations/${currentReservation.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ action }),
                },
            );

            const data = (await response.json().catch(() => null)) as
                | Reservation
                | { message?: string }
                | null;

            if (response.status === 401) {
                router.replace("/login?next=/owner");
                router.refresh();
                return;
            }

            if (!response.ok) {
                setFeedback(
                    (data as { message?: string } | null)?.message ||
                    "تعذر تحديث هذا الحجز حالياً.",
                );
                setFeedbackType("error");
                return;
            }

            if (action !== "delete") {
                setCurrentReservation(data as Reservation);
            }
            setFeedback(getSuccessMessage(action));
            setFeedbackType("success");
            onSuccess?.(action);

            startTransition(() => {
                router.refresh();
            });
        } catch {
            setFeedback("خدمة الحجوزات غير متاحة حالياً. حاول مرة أخرى بعد قليل.");
            setFeedbackType("error");
        } finally {
            setPendingAction(null);
        }
    }

    return (
        <div className={styles.reservationActionsBlock}>
            <div className={styles.reservationActions}>
                {canReview ? (
                    <>
                        <button
                            type="button"
                            className="button-secondary"
                            disabled={isBusy}
                            onClick={() => handleAction("confirm")}
                        >
                            {pendingAction === "confirm" ? "جارٍ الموافقة..." : "موافقة"}
                        </button>
                        <button
                            type="button"
                            className="button-ghost"
                            disabled={isBusy}
                            onClick={() => handleAction("reject")}
                        >
                            {pendingAction === "reject" ? "جارٍ الإلغاء..." : "إلغاء"}
                        </button>
                    </>
                ) : null}

                {canCancelConfirmed ? (
                    <button
                        type="button"
                        className="button-ghost"
                        disabled={isBusy}
                        onClick={() => handleAction("cancel")}
                    >
                        {pendingAction === "cancel" ? "جارٍ إلغاء الحجز..." : "إلغاء بعد الموافقة"}
                    </button>
                ) : null}

                {canDeleteCancelled ? (
                    <button
                        type="button"
                        className="button-ghost"
                        disabled={isBusy}
                        onClick={() => handleAction("delete")}
                    >
                        {pendingAction === "delete" ? "جارٍ الحذف..." : "حذف الحجز"}
                    </button>
                ) : null}
            </div>

            {feedback ? (
                <p
                    className={`${styles.actionFeedback} ${feedbackType === "success" ? styles.actionFeedbackSuccess : styles.actionFeedbackError
                        }`}
                >
                    {feedback}
                </p>
            ) : null}
        </div>
    );
}

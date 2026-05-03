"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./area-shells.module.css";

type NotificationType =
    | "RESERVATION_CREATED"
    | "RESERVATION_CANCELLED_BY_CUSTOMER"
    | "RESERVATION_CONFIRMED_BY_OWNER"
    | "RESERVATION_COMPLETED_BY_OWNER"
    | "RESERVATION_REJECTED_BY_OWNER"
    | "RESERVATION_CANCELLED_BY_OWNER";

type OwnerNotification = {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
    reservationId: string | null;
    restaurantId: string | null;
    actorUserId: string | null;
};

function shouldShowNotification(notification: OwnerNotification) {
    return notification.type !== "RESERVATION_COMPLETED_BY_OWNER";
}

function formatNotificationDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("ar-SY", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function getNotificationToneClass(type: NotificationType) {
    if (type === "RESERVATION_CONFIRMED_BY_OWNER") {
        return styles.notificationToneSuccess;
    }

    if (type === "RESERVATION_CANCELLED_BY_CUSTOMER") {
        return styles.notificationToneWarning;
    }

    if (type === "RESERVATION_REJECTED_BY_OWNER" || type === "RESERVATION_CANCELLED_BY_OWNER") {
        return styles.notificationToneError;
    }

    return styles.notificationTonePrimary;
}

let webNotificationAudioContext: AudioContext | null = null;

async function playOwnerNotificationSound() {
    if (typeof window === "undefined") {
        return;
    }

    const AudioContextCtor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
        return;
    }

    if (!webNotificationAudioContext) {
        webNotificationAudioContext = new AudioContextCtor();
    }

    if (webNotificationAudioContext.state === "suspended") {
        await webNotificationAudioContext.resume();
    }

    const startTime = webNotificationAudioContext.currentTime;
    const oscillator = webNotificationAudioContext.createOscillator();
    const gain = webNotificationAudioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(860, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.026, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);

    oscillator.connect(gain);
    gain.connect(webNotificationAudioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.15);
}

export function OwnerNotificationCenter() {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const hasInitializedUnreadRef = useRef(false);
    const knownUnreadIdsRef = useRef<Set<string>>(new Set());
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [notifications, setNotifications] = useState<OwnerNotification[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isMarkingAll, setIsMarkingAll] = useState(false);

    const loadNotifications = useCallback(async (silent = false) => {
        if (!silent) {
            setErrorMessage(null);
        }

        try {
            const response = await fetch("/api/notifications", {
                method: "GET",
                cache: "no-store",
                headers: {
                    Accept: "application/json",
                },
            });

            const data = (await response.json().catch(() => null)) as
                | OwnerNotification[]
                | { message?: string }
                | null;

            if (!response.ok) {
                if (!silent) {
                    setErrorMessage(
                        (data as { message?: string } | null)?.message ?? "تعذر تحميل الإشعارات حالياً.",
                    );
                }
                return;
            }

            setNotifications(Array.isArray(data) ? data.filter(shouldShowNotification) : []);
        } catch {
            if (!silent) {
                setErrorMessage("تعذر تحميل الإشعارات حالياً.");
            }
        } finally {
            if (!silent) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    useEffect(() => {
        const interval = setInterval(() => {
            loadNotifications(true);
        }, 9000);

        return () => {
            clearInterval(interval);
        };
    }, [loadNotifications]);

    useEffect(() => {
        function onPointerDown(event: MouseEvent) {
            if (!isOpen) {
                return;
            }

            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", onPointerDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
        };
    }, [isOpen]);

    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification.isRead).length,
        [notifications],
    );

    useEffect(() => {
        const unreadIds = new Set(
            notifications.filter((notification) => !notification.isRead).map((notification) => notification.id),
        );

        if (!hasInitializedUnreadRef.current) {
            hasInitializedUnreadRef.current = true;
            knownUnreadIdsRef.current = unreadIds;
            return;
        }

        const hasNewUnread = Array.from(unreadIds).some((id) => !knownUnreadIdsRef.current.has(id));
        knownUnreadIdsRef.current = unreadIds;

        if (hasNewUnread) {
            void playOwnerNotificationSound().catch(() => {
                // Fail silently for autoplay restrictions.
            });
        }
    }, [notifications]);

    const handleMarkRead = useCallback(async (notification: OwnerNotification) => {
        if (notification.isRead) {
            return;
        }

        setNotifications((current) =>
            current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
        );

        try {
            const response = await fetch(`/api/notifications/${notification.id}/read`, {
                method: "PATCH",
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                setNotifications((current) =>
                    current.map((item) => (item.id === notification.id ? { ...item, isRead: false } : item)),
                );
            }
        } catch {
            setNotifications((current) =>
                current.map((item) => (item.id === notification.id ? { ...item, isRead: false } : item)),
            );
        }
    }, []);

    const handleMarkAllRead = useCallback(async () => {
        if (unreadCount === 0 || isMarkingAll) {
            return;
        }

        setIsMarkingAll(true);
        const previous = notifications;
        setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));

        try {
            const response = await fetch("/api/notifications/read-all", {
                method: "PATCH",
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                setNotifications(previous);
            }
        } catch {
            setNotifications(previous);
        } finally {
            setIsMarkingAll(false);
        }
    }, [isMarkingAll, notifications, unreadCount]);

    return (
        <div className={styles.ownerNotificationsWrap} ref={panelRef}>
            <button
                type="button"
                className={styles.ownerNotificationBell}
                aria-label="الإشعارات"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((value) => !value)}
            >
                <span className={styles.ownerNotificationBellIcon} aria-hidden="true">
                    🔔
                </span>
                {unreadCount > 0 ? (
                    <span className={styles.ownerNotificationBadge}>
                        {unreadCount > 99 ? "+99" : unreadCount}
                    </span>
                ) : null}
            </button>

            {isOpen ? (
                <div className={styles.ownerNotificationsPanel} role="dialog" aria-label="قائمة الإشعارات">
                    <div className={styles.ownerNotificationsPanelHeader}>
                        <div>
                            <p className={styles.ownerNotificationsPanelTitle}>الإشعارات</p>
                            <p className={styles.ownerNotificationsPanelHint}>
                                {unreadCount > 0 ? `${unreadCount} غير مقروء` : "لا توجد إشعارات غير مقروءة"}
                            </p>
                        </div>
                        <button
                            type="button"
                            className={styles.ownerNotificationsReadAllButton}
                            disabled={unreadCount === 0 || isMarkingAll}
                            onClick={handleMarkAllRead}
                        >
                            {isMarkingAll ? "جارٍ التعليم..." : "تعيين الكل كمقروء"}
                        </button>
                    </div>

                    <div className={styles.ownerNotificationsList}>
                        {isLoading ? (
                            <p className={styles.ownerNotificationsState}>جارٍ تحميل الإشعارات...</p>
                        ) : errorMessage ? (
                            <p className={styles.ownerNotificationsStateError}>{errorMessage}</p>
                        ) : notifications.length === 0 ? (
                            <p className={styles.ownerNotificationsState}>لا توجد إشعارات حالياً.</p>
                        ) : (
                            notifications.map((notification) => (
                                <button
                                    type="button"
                                    key={notification.id}
                                    className={`${styles.ownerNotificationItem} ${notification.isRead ? "" : styles.ownerNotificationItemUnread}`}
                                    onClick={() => handleMarkRead(notification)}
                                >
                                    <span
                                        className={`${styles.ownerNotificationToneDot} ${getNotificationToneClass(notification.type)}`}
                                        aria-hidden="true"
                                    />
                                    <span className={styles.ownerNotificationItemContent}>
                                        <strong>{notification.title}</strong>
                                        <span>{notification.body}</span>
                                        <small>{formatNotificationDate(notification.createdAt)}</small>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

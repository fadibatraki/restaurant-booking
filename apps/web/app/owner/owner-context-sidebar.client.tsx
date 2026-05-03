"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css";

type SidebarIconName = "dashboard" | "tables" | "reservations" | "history" | "settings" | "logout" | "collapse";

type OwnerContextSidebarClientProps = {
    restaurantName: string;
    currentViewLabel?: string;
    sections?: unknown[];
    userName?: string;
    userRoleLabel?: string;
};

type SidebarNavItem = {
    href: string;
    icon: SidebarIconName;
    label: string;
    isActive: (pathname: string) => boolean;
};

type SidebarNavGroup = {
    label: string;
    items: SidebarNavItem[];
};

const sidebarNavGroups: SidebarNavGroup[] = [
    {
        label: "قسم رئيسي",
        items: [
            {
                href: "/owner",
                icon: "dashboard",
                label: "لوحة التحكم",
                isActive: (pathname) => pathname === "/owner",
            },
        ],
    },
    {
        label: "قسم الإدارة",
        items: [
            {
                href: "/owner/tables",
                icon: "tables",
                label: "إدارة الطاولات",
                isActive: (pathname) => pathname === "/owner/tables" || pathname.includes("/tables"),
            },
            {
                href: "/owner/reservations",
                icon: "reservations",
                label: "إدارة الحجوزات",
                isActive: (pathname) =>
                    pathname === "/owner/reservations" ||
                    (pathname.includes("/reservations") && !pathname.startsWith("/owner/reservations/history")),
            },
            {
                href: "/owner/reservations/history",
                icon: "history",
                label: "سجل الحجوزات",
                isActive: (pathname) => pathname.startsWith("/owner/reservations/history"),
            },
        ],
    },
    {
        label: "قسم النظام",
        items: [
            {
                href: "/owner/settings",
                icon: "settings",
                label: "معلومات المطعم",
                isActive: (pathname) => pathname.startsWith("/owner/settings"),
            },
        ],
    },
];

function SidebarIcon({ name, className }: { name: SidebarIconName; className?: string }) {
    if (name === "dashboard") {
        return (
            <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
                <path d="M4.75 10.25 12 4.5l7.25 5.75v8.25a1.75 1.75 0 0 1-1.75 1.75H6.5a1.75 1.75 0 0 1-1.75-1.75v-8.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.5 20.25v-6h5v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (name === "tables") {
        return (
            <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
                <path d="M5 8h14M7 8v11M17 8v11M5.75 19h12.5M7 5h10v3H7V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (name === "reservations") {
        return (
            <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
                <rect x="4.75" y="5.75" width="14.5" height="14" rx="2.25" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 4v3.5M16 4v3.5M4.75 10h14.5M8.5 14h3.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        );
    }

    if (name === "history") {
        return (
            <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
                <path d="M7.25 4.75h7.5L18.75 8.8v10.45H7.25V4.75Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14.75 4.75V9h4M10 13h5.25M10 16.25h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (name === "settings") {
        return (
            <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
                <path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M18.35 13.55c.08-.5.08-1.1 0-1.6l1.65-1.3-1.75-3.05-1.98.8a6.8 6.8 0 0 0-1.38-.8L14.6 5.5h-5.2l-.3 2.1c-.48.2-.94.47-1.37.8l-1.98-.8L4 10.65l1.65 1.3a6.2 6.2 0 0 0 0 1.6L4 14.85l1.75 3.05 1.98-.8c.43.33.89.6 1.37.8l.3 2.1h5.2l.29-2.1c.49-.2.95-.47 1.38-.8l1.98.8L20 14.85l-1.65-1.3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (name === "collapse") {
        return (
            <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
                <path d="m14.5 7-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M15.75 8.25 19.5 12m0 0-3.75 3.75M19.5 12H9.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12.5 5.25H7.25A2.25 2.25 0 0 0 5 7.5v9a2.25 2.25 0 0 0 2.25 2.25h5.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function getInitials(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
        return "A";
    }

    return trimmed.slice(0, 1).toUpperCase();
}

export function OwnerContextSidebarClient({
    restaurantName,
    userName,
    userRoleLabel = "مدير المطعم",
}: OwnerContextSidebarClientProps) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(true);
    const displayUserName = userName?.trim() || "مدير المطعم";

    return (
        <aside className={`${styles.ownerContextSidebar} ${isOpen ? styles.ownerContextSidebarExpanded : styles.ownerContextSidebarCollapsed}`}>
            <button
                type="button"
                className={styles.ownerSidebarToggleButton}
                onClick={() => setIsOpen((current) => !current)}
                aria-expanded={isOpen}
                aria-label={isOpen ? "تصغير الشريط الجانبي" : "توسيع الشريط الجانبي"}
            >
                <SidebarIcon name="collapse" className={styles.ownerSidebarToggleIcon} />
            </button>

            <div className={styles.ownerSidebarPanel}>
                <header className={styles.ownerSidebarHeader}>
                    <div className={styles.ownerSidebarHeaderIcon} aria-hidden="true">
                        <SidebarIcon name="reservations" className={styles.ownerSidebarGlyph} />
                    </div>
                    <div className={styles.ownerSidebarHeaderText}>
                        <strong>{restaurantName}</strong>
                        <span>Restaurant Admin</span>
                    </div>
                </header>

                <nav className={styles.ownerSidebarNav} aria-label="تنقل إدارة المطعم">
                    {sidebarNavGroups.map((group) => (
                        <div key={group.label} className={styles.ownerSidebarNavGroup}>
                            <p className={styles.ownerSidebarNavGroupLabel}>{group.label}</p>
                            <div className={styles.ownerSidebarNavGroupItems}>
                                {group.items.map((item) => {
                                    const isActive = item.isActive(pathname);

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`${styles.ownerSidebarNavLink} ${isActive ? styles.ownerSidebarNavLinkActive : ""}`}
                                            aria-current={isActive ? "page" : undefined}
                                            title={item.label}
                                        >
                                            <span className={styles.ownerSidebarNavIcon} aria-hidden="true">
                                                <SidebarIcon name={item.icon} className={styles.ownerSidebarGlyph} />
                                            </span>
                                            <span className={styles.ownerSidebarNavLabel}>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <footer className={styles.ownerSidebarFooter}>
                    <div className={styles.ownerSidebarUser}>
                        <span className={styles.ownerSidebarAvatar} aria-hidden="true">
                            {getInitials(displayUserName)}
                        </span>
                        <span className={styles.ownerSidebarUserText}>
                            <strong>{displayUserName}</strong>
                            <span>{userRoleLabel}</span>
                        </span>
                    </div>

                    <form action="/api/auth/logout" method="post" className={styles.ownerSidebarLogoutForm}>
                        <button type="submit" className={styles.ownerSidebarLogoutButton} aria-label="تسجيل الخروج" title="تسجيل الخروج">
                            <SidebarIcon name="logout" className={styles.ownerSidebarGlyph} />
                            <span className={styles.ownerSidebarLogoutText}>تسجيل الخروج</span>
                        </button>
                    </form>
                </footer>
            </div>
        </aside>
    );
}

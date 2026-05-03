"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./area-shells.module.css";

type AreaKind = "owner" | "admin";

type AreaLink = {
    href: string;
    label: string;
    isActive: (pathname: string) => boolean;
};

function getNavLinkClass(isActive: boolean) {
    return `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`.trim();
}

function isOwnerRestaurantsPath(pathname: string) {
    if (!pathname.startsWith("/owner/restaurants")) {
        return false;
    }

    return !pathname.includes("/tables") && !pathname.includes("/reservations");
}

function isOwnerTablesPath(pathname: string) {
    return pathname === "/owner/tables" || pathname.includes("/tables");
}

function isOwnerReservationsPath(pathname: string) {
    return (
        pathname === "/owner/reservations" ||
        (pathname.includes("/reservations") && !pathname.startsWith("/owner/reservations/history"))
    );
}

function isOwnerReservationsHistoryPath(pathname: string) {
    return pathname.startsWith("/owner/reservations/history");
}

function getAreaLinks(kind: AreaKind): AreaLink[] {
    if (kind === "owner") {
        return [
            {
                href: "/owner/tables",
                label: "إدارة الطاولات",
                isActive: isOwnerTablesPath,
            },
            {
                href: "/owner/reservations",
                label: "إدارة الحجوزات",
                isActive: isOwnerReservationsPath,
            },
            {
                href: "/owner/reservations/history",
                label: "سجل الحجوزات",
                isActive: isOwnerReservationsHistoryPath,
            },
        ];
    }

    return [
        {
            href: "/admin",
            label: "الملخص",
            isActive: (pathname) => pathname === "/admin",
        },
        {
            href: "/admin/invitations",
            label: "إدارة الدعوات",
            isActive: (pathname) => pathname.startsWith("/admin/invitations"),
        },
        {
            href: "/admin/restaurants",
            label: "إدارة المطاعم",
            isActive: (pathname) => pathname.startsWith("/admin/restaurants"),
        },
        {
            href: "/admin/users",
            label: "إدارة المستخدمين",
            isActive: (pathname) => pathname.startsWith("/admin/users"),
        },
    ];
}

export function AreaShellNav({
    kind,
    logoutLabel = "تسجيل الخروج",
    showLogout = true,
}: {
    kind: AreaKind;
    logoutLabel?: string;
    showLogout?: boolean;
}) {
    const pathname = usePathname();
    const links = getAreaLinks(kind);

    return (
        <>
            <nav className={styles.navList} aria-label={kind === "owner" ? "تنقل إدارة المطعم" : "تنقل إدارة المنصة"}>
                {links.map((link) => {
                    const isActive = link.isActive(pathname);

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={getNavLinkClass(isActive)}
                            aria-current={isActive ? "page" : undefined}
                        >
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            {showLogout ? (
                <form action="/api/auth/logout" method="post" className={styles.logoutForm}>
                    <button type="submit" className={styles.logoutButton}>
                        {logoutLabel}
                    </button>
                </form>
            ) : null}
        </>
    );
}

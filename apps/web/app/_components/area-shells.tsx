import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AreaShellNav } from "./area-shells-nav.client";
import { OwnerAreaHeader } from "./owner-area-header";
import { resolveRoleHomePath, resolveRoleScopedPath } from "./role-routing";
import styles from "./area-shells.module.css";

type LayoutProps = {
    children: React.ReactNode;
};

type PublicHeaderProps = {
    currentPath: "/" | "/restaurants" | "/login" | "/register" | "/accept-invite";
};

type SessionUser = {
    email: string;
    role: string;
};

type SessionAreaContext = {
    user: SessionUser | null;
    kind: "public" | "customer" | "owner" | "admin";
    areaHref: "/owner" | "/admin" | null;
    areaLabel: string | null;
    areaHint: string | null;
};

type PublicLayoutProps = LayoutProps &
    PublicHeaderProps & {
        internalUserBehavior?: "redirect" | "allow";
    };

const authCookieName = "restaurant_booking_access_token";
const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3000";

function getNavLinkClass(isActive: boolean) {
    return `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`.trim();
}

function isPublicSectionActive(currentPath: PublicHeaderProps["currentPath"], href: "/" | "/restaurants" | "/login") {
    if (href === "/login") {
        return currentPath === "/login" || currentPath === "/register" || currentPath === "/accept-invite";
    }

    return currentPath === href;
}

async function getCurrentSessionUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get(authCookieName)?.value;

    if (!token) {
        return null;
    }

    try {
        const response = await fetch(new URL("/auth/me", apiBaseUrl), {
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return null;
        }

        const data = (await response.json().catch(() => null)) as SessionUser | null;

        if (!data || typeof data.role !== "string") {
            return null;
        }

        return data;
    } catch {
        return null;
    }
}

export async function getSessionAreaContext(): Promise<SessionAreaContext> {
    const user = await getCurrentSessionUser();

    if (!user) {
        return {
            user: null,
            kind: "public",
            areaHref: null,
            areaLabel: null,
            areaHint: null,
        };
    }

    if (user.role === "SUPER_ADMIN") {
        return {
            user,
            kind: "admin",
            areaHref: "/admin",
            areaLabel: "منطقة إدارة المنصة",
            areaHint: "الجلسة الحالية موجهة لإدارة المنصة والدعوات والمطاعم والمستخدمين.",
        };
    }

    if (user.role === "RESTAURANT_ADMIN") {
        return {
            user,
            kind: "owner",
            areaHref: "/owner",
            areaLabel: "منطقة إدارة المطعم",
            areaHint: "الجلسة الحالية موجهة لإدارة المطاعم والطاولات والحجوزات.",
        };
    }

    return {
        user,
        kind: "customer",
        areaHref: null,
        areaLabel: null,
        areaHint: null,
    };
}

export function resolveAreaHrefForRole(role: string | undefined, nextPath?: string) {
    return nextPath ? resolveRoleScopedPath(role, nextPath) : resolveRoleHomePath(role);
}

function AreaSessionHeader({
    kind,
    areaLabel,
    areaHint,
    showLogout = true,
    hideIdentity = false,
}: {
    kind: "owner" | "admin";
    areaLabel: string;
    areaHint: string;
    showLogout?: boolean;
    hideIdentity?: boolean;
}) {
    return (
        <div className={`${styles.areaChrome} ${kind === "owner" ? styles.areaChromeOwner : ""}`}>
            <div className={`${styles.areaChromeInner} ${kind === "owner" ? styles.areaChromeInnerOwner : ""}`}>
                {!hideIdentity ? (
                    <div className={styles.areaIdentity}>
                        <p className={styles.areaLabel}>{areaLabel}</p>
                        <p className={styles.areaHint}>{areaHint}</p>
                    </div>
                ) : null}

                <div className={`${styles.areaNavGroup} ${kind === "owner" ? styles.areaNavGroupOwner : ""}`}>
                    <AreaShellNav kind={kind} showLogout={showLogout} />
                </div>
            </div>
        </div>
    );
}

export function PublicHeader({ currentPath }: PublicHeaderProps) {
    return (
        <div className={styles.publicChrome}>
            <div className={`container ${styles.publicChromeInner}`}>
                <div className={styles.brandBlock}>
                    <Link href="/" className={styles.brandLabel}>
                        حجز المطاعم
                    </Link>
                    <p className={styles.brandHint}>تجربة عربية موحّدة لاكتشاف المطاعم والوصول إلى الإدارة.</p>
                </div>

                <nav className={styles.navList} aria-label="التنقل العام">
                    <Link href="/" className={getNavLinkClass(isPublicSectionActive(currentPath, "/"))} aria-current={isPublicSectionActive(currentPath, "/") ? "page" : undefined}>
                        الرئيسية
                    </Link>
                    <Link
                        href="/restaurants"
                        className={getNavLinkClass(isPublicSectionActive(currentPath, "/restaurants"))}
                        aria-current={isPublicSectionActive(currentPath, "/restaurants") ? "page" : undefined}
                    >
                        المطاعم
                    </Link>
                    <Link href="/login?source=public" className={getNavLinkClass(isPublicSectionActive(currentPath, "/login"))} aria-current={isPublicSectionActive(currentPath, "/login") ? "page" : undefined}>
                        تسجيل الدخول
                    </Link>
                </nav>
            </div>
        </div>
    );
}

export async function PublicLayout({
    children,
    currentPath,
    internalUserBehavior = "redirect",
}: PublicLayoutProps) {
    const session = await getSessionAreaContext();

    if ((session.kind === "owner" || session.kind === "admin") && session.areaHref) {
        if (internalUserBehavior === "redirect") {
            redirect(session.areaHref);
        }

        return (
            <div className="app-shell">
                {session.kind === "owner" ? (
                    <OwnerAreaHeader />
                ) : (
                    <AreaSessionHeader
                        kind={session.kind}
                        areaLabel={session.areaLabel ?? "منطقة الإدارة"}
                        areaHint={session.areaHint ?? "الجلسة الحالية مرتبطة بمنطقة إدارية محمية."}
                    />
                )}
                <div className={`${styles.contentOffset} ${session.kind === "owner" ? styles.ownerContentOffset : ""}`}>{children}</div>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <PublicHeader currentPath={currentPath} />
            <div className={styles.contentOffset}>{children}</div>
        </div>
    );
}

export function OwnerNav() {
    return <OwnerAreaHeader />;
}

export function OwnerLayout({ children }: LayoutProps) {
    return (
        <div className="app-shell">
            <OwnerNav />
            <div className={`${styles.contentOffset} ${styles.ownerContentOffset}`}>{children}</div>
        </div>
    );
}

export function AdminNav() {
    return (
        <AreaSessionHeader
            kind="admin"
            areaLabel="منطقة إدارة المنصة"
            areaHint="تنقل واضح وثابت بين ملخص المنصة والدعوات والمطاعم والمستخدمين من شريط واحد."
        />
    );
}

export function AdminLayout({ children }: LayoutProps) {
    return (
        <div className="app-shell">
            <AdminNav />
            <div className={styles.contentOffset}>{children}</div>
        </div>
    );
}

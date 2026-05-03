import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OwnerContextSidebarClient } from "./owner-context-sidebar.client";
import { ReservationActions } from "./reservation-actions";
import { TableManagementForm } from "./table-management-form";
import { TablesKanbanBoard } from "./tables-kanban-board.client";
import { ReservationsWeeklyCalendar } from "./reservations-weekly-calendar.client";
import { resolveProtectedAreaRedirect } from "../_components/role-routing";
import { getReservationStatusLabel } from "./reservation-utils";
import type { ReservationStatus as ReservationStatusType } from "./reservation-utils";
import styles from "./page.module.css";

const authCookieName = "restaurant_booking_access_token";
const reservationStatuses = ["PENDING", "CONFIRMED", "CANCELLED"] as const;
const ownerViews = ["dashboard", "tables", "reservations", "settings"] as const;
const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "http://localhost:3000";

const displayLocale = "ar-SY-u-nu-latn";

// Re-export for backward compatibility
export type ReservationStatus = ReservationStatusType;

type AuthMeResponse = {
    id: string | number;
    email: string;
    role: string;
};

type Restaurant = {
    id: string;
    name: string;
    description: string | null;
    address: string;
    phone: string | null;
    image: string | null;
    openTime: string | null;
    closeTime: string | null;
    ownerId: string;
    createdAt: string;
};

export type OwnerView = (typeof ownerViews)[number];

export type RestaurantReservation = {
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

type RestaurantReservationsResult = {
    restaurantId: string;
    reservations: RestaurantReservation[];
    error: string | null;
};

export type RestaurantTable = {
    id: string;
    name: string;
    capacity: number;
    isActive: boolean;
    status: string;
    restaurantId: string;
    createdAt: string;
};

type OwnerNavLink = {
    key: string;
    label: string;
    href: string;
    isActive: boolean;
};

type ReservationPreview = RestaurantReservation & {
    restaurantName: string;
};

export type OwnerDashboardData = {
    user: AuthMeResponse | null;
    tablesError: string | null;
    dashboardError: string | null;
    reservationsError: string | null;
    ownedRestaurants: Restaurant[];
    tablesByRestaurant: Map<string, RestaurantTable[]>;
    reservationsByRestaurant: Map<string, RestaurantReservationsResult>;
    activeTablesCount: number;
    totalTablesCount: number;
    pendingReservationsCount: number;
    confirmedReservationsCount: number;
    activeReservationsCount: number;
    recentReservations: ReservationPreview[];
};

function formatHours(openTime: string | null, closeTime: string | null) {
    if (!openTime && !closeTime) {
        return "تُعرض ساعات العمل بعد تفعيل الحجز";
    }

    if (openTime && closeTime) {
        return `${openTime} - ${closeTime}`;
    }

    return openTime ?? closeTime ?? "تُعرض ساعات العمل بعد تفعيل الحجز";
}

function formatReservationDate(value: string) {
    return new Intl.DateTimeFormat(displayLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat(displayLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(value));
}

function getRoleLabel(role: string | undefined) {
    if (role === "SUPER_ADMIN") {
        return "مشرف عام";
    }

    if (role === "RESTAURANT_ADMIN") {
        return "مدير مطعم";
    }

    if (role === "CUSTOMER") {
        return "عميل";
    }

    return role ?? "غير متاح";
}

function buildLoginHref(nextPath: string) {
    return `/login?next=${encodeURIComponent(nextPath)}`;
}

export function isReservationStatus(value: string | string[] | undefined): value is ReservationStatus {
    return typeof value === "string" && reservationStatuses.includes(value as ReservationStatus);
}

export function buildOwnerHref(view: OwnerView, status?: ReservationStatus) {
    if (view === "dashboard") {
        return "/owner/tables";
    }

    if (view === "tables") {
        return "/owner/tables";
    }

    const params = new URLSearchParams();

    if (status) {
        params.set("status", status);
    }

    const query = params.toString();
    return query ? `/owner/reservations?${query}` : "/owner/reservations";
}

export function buildOwnerRestaurantHref(restaurantId: string) {
    return `/owner/restaurants/${restaurantId}`;
}

export function buildOwnerRestaurantTablesHref(restaurantId: string) {
    return `/owner/restaurants/${restaurantId}/tables`;
}

export function buildOwnerRestaurantReservationsHref(
    restaurantId: string,
    status?: ReservationStatus,
) {
    const params = new URLSearchParams();

    if (status) {
        params.set("status", status);
    }

    const query = params.toString();
    return query
        ? `/owner/restaurants/${restaurantId}/reservations?${query}`
        : `/owner/restaurants/${restaurantId}/reservations`;
}

function buildDefaultOwnerNavLinks(currentView: OwnerView): OwnerNavLink[] {
    return [
        {
            key: "tables",
            label: "إدارة الطاولات",
            href: buildOwnerHref("tables"),
            isActive: currentView === "tables",
        },
        {
            key: "reservations",
            label: "إدارة الحجوزات",
            href: buildOwnerHref("reservations"),
            isActive: currentView === "reservations",
        },
    ];
}

export function buildOwnerRestaurantNavLinks(
    restaurantId: string,
    activePage: "overview" | "tables" | "reservations",
): OwnerNavLink[] {
    return [
        {
            key: "restaurant-tables",
            label: "إدارة الطاولات",
            href: buildOwnerRestaurantTablesHref(restaurantId),
            isActive: activePage === "tables",
        },
        {
            key: "restaurant-reservations",
            label: "إدارة الحجوزات",
            href: buildOwnerRestaurantReservationsHref(restaurantId),
            isActive: activePage === "reservations",
        },
    ];
}

export function resolveLegacyOwnerRedirect(
    view: string | string[] | undefined,
    status?: ReservationStatus,
) {
    if (typeof view !== "string") {
        return null;
    }

    if (!ownerViews.includes(view as OwnerView) || view === "dashboard") {
        return null;
    }

    return buildOwnerHref(view as OwnerView, status);
}

function OwnerViewNav({ currentView, navLinks }: { currentView: OwnerView; navLinks?: OwnerNavLink[] }) {
    const links = navLinks ?? buildDefaultOwnerNavLinks(currentView);

    return (
        <nav className={styles.viewNav} aria-label="تنقل لوحة الإدارة">
            {links.map((link) => (
                <Link
                    key={link.key}
                    href={link.href}
                    className={`${styles.viewLink} ${link.isActive ? styles.viewLinkActive : ""}`}
                >
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}

async function getCurrentUser(token: string) {
    try {
        const response = await fetch(new URL("/auth/me", apiBaseUrl), {
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.status === 401) {
            return {
                error: "انتهت صلاحية الجلسة الحالية. سجّل الدخول مرة أخرى.",
                user: null as AuthMeResponse | null,
                unauthorized: true,
            };
        }

        if (!response.ok) {
            return {
                error: "تعذر تحميل جلسة الإدارة الحالية.",
                user: null as AuthMeResponse | null,
                unauthorized: false,
            };
        }

        const data = (await response.json()) as unknown;

        if (!data || Array.isArray(data)) {
            return {
                error: "وصلت استجابة جلسة غير متوقعة من خدمة التحقق.",
                user: null as AuthMeResponse | null,
                unauthorized: false,
            };
        }

        return {
            error: null,
            user: data as AuthMeResponse,
            unauthorized: false,
        };
    } catch {
        return {
            error: "خدمة التحقق غير متاحة حالياً. حاول مرة أخرى بعد قليل.",
            user: null as AuthMeResponse | null,
            unauthorized: false,
        };
    }
}

async function getRestaurants() {
    try {
        const response = await fetch(new URL("/restaurants", apiBaseUrl), {
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            return {
                error: "تعذر تحميل المطاعم حالياً. حاول مرة أخرى بعد قليل.",
                restaurants: [] as Restaurant[],
            };
        }

        const data = (await response.json()) as unknown;

        if (!Array.isArray(data)) {
            return {
                error: "وصلت استجابة غير متوقعة من خدمة المطاعم.",
                restaurants: [] as Restaurant[],
            };
        }

        return {
            error: null,
            restaurants: data as Restaurant[],
        };
    } catch {
        return {
            error: "خدمة المطاعم غير متاحة حالياً. حاول مرة أخرى بعد قليل.",
            restaurants: [] as Restaurant[],
        };
    }
}

async function getRestaurantReservations(
    restaurantId: string,
    token: string,
): Promise<RestaurantReservationsResult> {
    const url = new URL(`/restaurants/${restaurantId}/reservations`, apiBaseUrl);

    try {
        const response = await fetch(url.toString(), {
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return {
                restaurantId,
                error: "تعذر تحميل حجوزات هذا المطعم حالياً.",
                reservations: [],
            };
        }

        const data = (await response.json()) as unknown;

        if (!Array.isArray(data)) {
            return {
                restaurantId,
                error: "وصلت استجابة غير متوقعة لحجوزات هذا المطعم.",
                reservations: [],
            };
        }

        return {
            restaurantId,
            error: null,
            reservations: data as RestaurantReservation[],
        };
    } catch {
        return {
            restaurantId,
            error: "خدمة الحجوزات غير متاحة حالياً. حاول مرة أخرى بعد قليل.",
            reservations: [],
        };
    }
}

async function getTables() {
    try {
        const response = await fetch(new URL("/tables", apiBaseUrl), {
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            return {
                error: "تعذر تحميل الطاولات حالياً. حاول مرة أخرى بعد قليل.",
                tables: [] as RestaurantTable[],
            };
        }

        const data = (await response.json()) as unknown;

        if (!Array.isArray(data)) {
            return {
                error: "وصلت استجابة غير متوقعة من خدمة الطاولات.",
                tables: [] as RestaurantTable[],
            };
        }

        return {
            error: null,
            tables: data as RestaurantTable[],
        };
    } catch {
        return {
            error: "خدمة الطاولات غير متاحة حالياً. حاول مرة أخرى بعد قليل.",
            tables: [] as RestaurantTable[],
        };
    }
}

export async function getOwnerDashboardData(nextPath: string): Promise<OwnerDashboardData> {
    const cookieStore = await cookies();
    const token = cookieStore.get(authCookieName)?.value;

    if (!token) {
        redirect(buildLoginHref(nextPath));
    }

    const [
        { user, error: userError, unauthorized },
        { restaurants, error: restaurantsError },
        { tables, error: tablesError },
    ] = await Promise.all([getCurrentUser(token), getRestaurants(), getTables()]);

    if (unauthorized) {
        redirect(buildLoginHref(nextPath));
    }

    const roleRedirect = resolveProtectedAreaRedirect("owner", user?.role);

    if (roleRedirect) {
        redirect(roleRedirect);
    }

    const ownedRestaurants = user
        ? restaurants.filter((restaurant) => restaurant.ownerId === String(user.id))
        : [];
    const ownedRestaurantIds = new Set(ownedRestaurants.map((restaurant) => restaurant.id));
    const tablesByRestaurant = new Map<string, RestaurantTable[]>();

    for (const table of tables) {
        if (!ownedRestaurantIds.has(table.restaurantId)) {
            continue;
        }

        const currentTables = tablesByRestaurant.get(table.restaurantId) ?? [];
        currentTables.push(table);
        tablesByRestaurant.set(table.restaurantId, currentTables);
    }

    const reservationsByRestaurant = new Map<string, RestaurantReservationsResult>();

    if (ownedRestaurants.length > 0) {
        const reservationsResults = await Promise.all(
            ownedRestaurants.map((restaurant) => getRestaurantReservations(restaurant.id, token)),
        );

        for (const result of reservationsResults) {
            reservationsByRestaurant.set(result.restaurantId, result);
        }
    }

    const dashboardError = userError ?? restaurantsError;
    const reservationsError =
        [...reservationsByRestaurant.values()].find((result) => result.error)?.error ?? null;

    const allOwnedTables = [...tablesByRestaurant.values()].flat();
    const activeTablesCount = allOwnedTables.filter((table) => table.isActive).length;
    const totalTablesCount = allOwnedTables.length;

    const allReservations: ReservationPreview[] = ownedRestaurants.flatMap((restaurant) =>
        (reservationsByRestaurant.get(restaurant.id)?.reservations ?? []).map((reservation) => ({
            ...reservation,
            restaurantName: restaurant.name,
        })),
    );

    const pendingReservationsCount = allReservations.filter(
        (reservation) => reservation.status === "PENDING",
    ).length;
    const confirmedReservationsCount = allReservations.filter(
        (reservation) => reservation.status === "CONFIRMED",
    ).length;
    const activeReservationsCount = pendingReservationsCount + confirmedReservationsCount;
    const recentReservations = [...allReservations]
        .sort(
            (left, right) =>
                new Date(left.reservationDate).getTime() - new Date(right.reservationDate).getTime(),
        )
        .slice(0, 4);

    return {
        user,
        tablesError,
        dashboardError,
        reservationsError,
        ownedRestaurants,
        tablesByRestaurant,
        reservationsByRestaurant,
        activeTablesCount,
        totalTablesCount,
        pendingReservationsCount,
        confirmedReservationsCount,
        activeReservationsCount,
        recentReservations,
    };
}

export function getOwnedRestaurantOrRedirect(
    data: OwnerDashboardData,
    restaurantId: string,
) {
    const restaurant = data.ownedRestaurants.find((entry) => entry.id === restaurantId);

    if (!restaurant) {
        redirect("/owner/restaurants");
    }

    return restaurant;
}

function getRestaurantReservationsPreview(
    data: OwnerDashboardData,
    restaurantId: string,
    status?: ReservationStatus,
) {
    const reservations = data.reservationsByRestaurant.get(restaurantId)?.reservations ?? [];

    return reservations.filter((reservation) =>
        status ? reservation.status === status : true,
    );
}

function getRecentRestaurantReservations(data: OwnerDashboardData, restaurantId: string) {
    return [...getRestaurantReservationsPreview(data, restaurantId)]
        .sort(
            (left, right) =>
                new Date(left.reservationDate).getTime() - new Date(right.reservationDate).getTime(),
        )
        .slice(0, 4);
}

type OwnerPageChromeProps = {
    currentView: OwnerView;
    title: string;
    description: string;
    data: OwnerDashboardData;
    navLinks?: OwnerNavLink[];
    children: React.ReactNode;
};

export function OwnerPageChrome({
    currentView,
    title,
    description,
    data,
    navLinks,
    children,
}: OwnerPageChromeProps) {
    return (
        <main
            className={
                currentView === "reservations" || currentView === "tables"
                    ? `${styles.page} ${styles.stack} ${styles.ownerWidePage}`
                    : `container ${styles.page} ${styles.stack}`
            }
        >      {data.dashboardError ? (
            <section className={`${styles.stateCard} surface`}>
                <span className={styles.stateEyebrow}>اللوحة غير متاحة</span>
                <h2>تعذر تحميل لوحة الإدارة.</h2>
                <p>{data.dashboardError}</p>
                <div className={styles.stateActions}>
                    <Link href="/owner" className="button-primary">
                        إعادة تحميل اللوحة
                    </Link>
                </div>
            </section>
        ) : (
            children
        )}
        </main>
    );
}

export function OwnerSummarySection({ data }: { data: OwnerDashboardData }) {
    const restaurant = data.ownedRestaurants[0];

    return (
        <>
            {restaurant && (
                <section className={`${styles.dashboardHero} surface`}>
                    <div className={styles.heroContent}>
                        <div className={styles.heroIdentity}>
                            <h1 className={styles.heroTitle}>{restaurant.name}</h1>
                            <p className={styles.heroDescription}>
                                {restaurant.description || "إدارة مطعمك من مكان واحد"}
                            </p>
                        </div>
                        <div className={styles.heroMeta}>
                            <span className={styles.heroBadge}>
                                {formatHours(restaurant.openTime, restaurant.closeTime)}
                            </span>
                        </div>
                    </div>
                </section>
            )}

            <section className={styles.metricsRow}>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>الطاولات</span>
                    <strong className={styles.metricValue}>{data.tablesError ? "—" : data.totalTablesCount}</strong>
                    <p className={styles.metricLabel}>إجمالي الطاولات</p>
                </article>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>الحجوزات النشطة</span>
                    <strong className={styles.metricValue}>{data.reservationsError ? "—" : data.activeReservationsCount}</strong>
                    <p className={styles.metricLabel}>مؤكدة أو قيد الانتظار</p>
                </article>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>قيد الانتظار</span>
                    <strong className={styles.metricValue}>{data.reservationsError ? "—" : data.pendingReservationsCount}</strong>
                    <p className={styles.metricLabel}>تحتاج متابعة</p>
                </article>
            </section>

            <section className={styles.dashboardGrid}>
                {restaurant && (
                    <section key={restaurant.id} className={styles.reservationsRestaurantShell}>
                        <h2 className={styles.sectionTitle}>معلومات المطعم</h2>
                        <dl className={styles.detailsGrid}>
                            <div className={styles.detailItem}>
                                <dt>العنوان</dt>
                                <dd>{restaurant.address}</dd>
                            </div>
                            <div className={styles.detailItem}>
                                <dt>الهاتف</dt>
                                <dd>{restaurant.phone || "غير متاح"}</dd>
                            </div>
                            <div className={styles.detailItem}>
                                <dt>ساعات العمل</dt>
                                <dd>{formatHours(restaurant.openTime, restaurant.closeTime)}</dd>
                            </div>
                            <div className={styles.detailItem}>
                                <dt>تاريخ الإضافة</dt>
                                <dd>{formatDate(restaurant.createdAt)}</dd>
                            </div>
                        </dl>
                    </section>
                )}

                <section className={`${styles.sectionCard} surface`}>
                    <h2 className={styles.sectionTitle}>أحدث الحجوزات</h2>

                    {data.reservationsError ? (
                        <div className={styles.emptyState}>
                            <p className={styles.emptyStateLabel}>الحجوزات غير متاحة</p>
                            <p className={styles.emptyStateHint}>{data.reservationsError}</p>
                        </div>
                    ) : data.recentReservations.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p className={styles.emptyStateLabel}>لا توجد حجوزات</p>
                            <p className={styles.emptyStateHint}>لا توجد حجوزات حالياً للمطعم</p>
                        </div>
                    ) : (
                        <div className={styles.reservationsList}>
                            {data.recentReservations.map((reservation) => (
                                <article key={reservation.id} className={styles.reservationItem}>
                                    <div className={styles.reservationMain}>
                                        <p className={styles.reservationDate}>{formatReservationDate(reservation.reservationDate)}</p>
                                        <p className={styles.reservationMeta}>{reservation.guestsCount} ضيوف · الطاولة {reservation.tableId}</p>
                                    </div>
                                    <span className={styles.reservationBadge}>
                                        {getReservationStatusLabel(reservation.status)}
                                    </span>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </section>
        </>
    );
}

export function OwnerRestaurantsSection({ data }: { data: OwnerDashboardData }) {
    return (
        <section className={styles.dashboardGrid}>
            <div className={styles.mainStack}>
                <section className={`${styles.sectionCard} surface`}>
                    <div className={styles.sectionHeading}>
                        <h2>مطاعمي</h2>
                    </div>

                    {data.ownedRestaurants.length === 0 ? (
                        <section className={`${styles.stateCard} surface-alt`}>
                            <span className={styles.stateEyebrow}>لا توجد مطاعم</span>
                            <h3>لا توجد مطاعم مرتبطة حالياً.</h3>
                            <p>ستظهر هنا المطاعم المرتبطة بهذا الحساب عند إضافتها.</p>
                        </section>
                    ) : (
                        <div className={styles.restaurantList}>
                            {data.ownedRestaurants.map((restaurant) => (
                                <article key={restaurant.id} className={`${styles.restaurantCard} surface-alt`}>
                                    <div className={styles.restaurantHeader}>
                                        <div className={styles.restaurantIdentity}>
                                            <p className={styles.cardEyebrow}>مطعم مُدار</p>
                                            <h3 className={styles.restaurantTitle}>{restaurant.name}</h3>
                                            <p className={styles.restaurantDescription}>
                                                {restaurant.description || "لم تتم إضافة ملخص تفصيلي لهذا المطعم بعد."}
                                            </p>
                                        </div>
                                        <div className={styles.restaurantSignals}>
                                            <span className={styles.statusBadge}>
                                                {formatHours(restaurant.openTime, restaurant.closeTime)}
                                            </span>
                                            <span className={styles.restaurantSignal}>
                                                {data.tablesByRestaurant.get(restaurant.id)?.length ?? 0} طاولات
                                            </span>
                                            <span className={styles.restaurantSignal}>
                                                {data.reservationsByRestaurant.get(restaurant.id)?.reservations.length ?? 0} حجوزات
                                            </span>
                                        </div>
                                    </div>

                                    <dl className={styles.infoGrid}>
                                        <div className={styles.infoItem}>
                                            <dt>العنوان</dt>
                                            <dd>{restaurant.address}</dd>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <dt>الهاتف</dt>
                                            <dd>{restaurant.phone || "يُعرض بعد تأكيد الحجز"}</dd>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <dt>تاريخ الإضافة</dt>
                                            <dd>{formatDate(restaurant.createdAt)}</dd>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <dt>ساعات العمل</dt>
                                            <dd>{formatHours(restaurant.openTime, restaurant.closeTime)}</dd>
                                        </div>
                                    </dl>

                                    <div className={styles.stateActions}>
                                        <Link href={buildOwnerRestaurantHref(restaurant.id)} className="button-primary">
                                            فتح إدارة المطعم
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>


        </section>
    );
}

type OwnerRestaurantOverviewSectionProps = {
    data: OwnerDashboardData;
    restaurantId: string;
};

export function OwnerRestaurantOverviewSection({
    data,
    restaurantId,
}: OwnerRestaurantOverviewSectionProps) {
    const restaurant = getOwnedRestaurantOrRedirect(data, restaurantId);
    const restaurantTablesCount = data.tablesByRestaurant.get(restaurant.id)?.length ?? 0;
    const restaurantReservations = getRestaurantReservationsPreview(data, restaurant.id);
    const restaurantPendingReservations = getRestaurantReservationsPreview(
        data,
        restaurant.id,
        "PENDING",
    ).length;
    const restaurantConfirmedReservations = getRestaurantReservationsPreview(
        data,
        restaurant.id,
        "CONFIRMED",
    ).length;
    const recentRestaurantReservations = getRecentRestaurantReservations(data, restaurant.id);

    return (
        <>
            <section className={styles.summaryGrid}>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>الطاولات</span>
                    <strong className={styles.metricValue}>{data.tablesError ? "—" : restaurantTablesCount}</strong>
                    <p className={styles.metricLabel}>طاولات مرتبطة بهذا المطعم</p>
                </article>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>الحجوزات</span>
                    <strong className={styles.metricValue}>
                        {data.reservationsError ? "—" : restaurantReservations.length}
                    </strong>
                    <p className={styles.metricLabel}>إجمالي الحجوزات الحالية</p>
                </article>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>قيد الانتظار</span>
                    <strong className={styles.metricValue}>
                        {data.reservationsError ? "—" : restaurantPendingReservations}
                    </strong>
                    <p className={styles.metricLabel}>حجوزات تحتاج متابعة</p>
                </article>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>مؤكدة</span>
                    <strong className={styles.metricValue}>
                        {data.reservationsError ? "—" : restaurantConfirmedReservations}
                    </strong>
                    <p className={styles.metricLabel}>حجوزات مؤكدة حالياً</p>
                </article>
            </section>

            <section className={styles.dashboardGrid}>
                <div className={styles.mainStack}>
                    <section className={`${styles.sectionCard} surface`}>
                        <div className={styles.sectionHeading}>
                            <h2>بيانات المطعم</h2>
                            <p>نظرة عربية مختصرة لبيانات المطعم الحالية قبل الانتقال إلى إدارة الطاولات والحجوزات.</p>
                        </div>

                        <dl className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <dt>الاسم</dt>
                                <dd>{restaurant.name}</dd>
                            </div>
                            <div className={styles.infoItem}>
                                <dt>الوصف</dt>
                                <dd>{restaurant.description || "لم تتم إضافة وصف تفصيلي لهذا المطعم بعد."}</dd>
                            </div>
                            <div className={styles.infoItem}>
                                <dt>العنوان</dt>
                                <dd>{restaurant.address}</dd>
                            </div>
                            <div className={styles.infoItem}>
                                <dt>الهاتف</dt>
                                <dd>{restaurant.phone || "يُعرض بعد تأكيد الحجز"}</dd>
                            </div>
                            <div className={styles.infoItem}>
                                <dt>ساعات العمل</dt>
                                <dd>{formatHours(restaurant.openTime, restaurant.closeTime)}</dd>
                            </div>
                            <div className={styles.infoItem}>
                                <dt>تاريخ الإضافة</dt>
                                <dd>{formatDate(restaurant.createdAt)}</dd>
                            </div>
                        </dl>
                    </section>

                    <section className={`${styles.sectionCard} surface`}>
                        <div className={styles.sectionHeading}>
                            <h2>معاينة الحجوزات</h2>
                            <p>ملخص سريع لآخر الحجوزات المعروفة لهذا المطعم ضمن البيانات الحالية للمالك.</p>
                        </div>

                        {data.reservationsError ? (
                            <section className={`${styles.stateCard} surface-alt`}>
                                <span className={styles.stateEyebrow}>الحجوزات غير متاحة</span>
                                <p>{data.reservationsError}</p>
                            </section>
                        ) : recentRestaurantReservations.length === 0 ? (
                            <section className={`${styles.stateCard} surface-alt`}>
                                <span className={styles.stateEyebrow}>لا توجد حجوزات</span>
                                <p>لا توجد حجوزات حالياً لهذا المطعم.</p>
                            </section>
                        ) : (
                            <div className={styles.previewList}>
                                {recentRestaurantReservations.map((reservation) => (
                                    <article key={reservation.id} className={`${styles.previewCard} surface-alt`}>
                                        <div className={styles.previewTop}>
                                            <div className={styles.previewPrimary}>
                                                <p className={styles.previewTitle}>الحجز {reservation.id}</p>
                                                <p className={styles.previewMeta}>{formatReservationDate(reservation.reservationDate)}</p>
                                            </div>
                                            <span className={styles.previewStatus}>
                                                {getReservationStatusLabel(reservation.status)}
                                            </span>
                                        </div>
                                        <p className={styles.previewHint}>
                                            {reservation.guestsCount} ضيوف · الطاولة {reservation.tableId}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>


            </section>
        </>
    );
}

type OwnerContextSidebarProps = {
    data: OwnerDashboardData;
    restaurantId?: string;
    currentView: "tables" | "reservations" | "history" | "settings";
};

export function OwnerContextSidebar({ data, restaurantId, currentView }: OwnerContextSidebarProps) {
    const restaurant = restaurantId
        ? getOwnedRestaurantOrRedirect(data, restaurantId)
        : data.ownedRestaurants[0] ?? null;

    if (!restaurant) {
        return null;
    }

    const restaurantTables = data.tablesByRestaurant.get(restaurant.id) ?? [];
    const restaurantTablesCount = restaurantTables.length;
    const activeRestaurantTablesCount = restaurantTables.filter((table) => table.isActive).length;
    const availableRestaurantTablesCount = restaurantTables.filter(
        (table) => table.isActive && table.status === "AVAILABLE",
    ).length;
    const reservedRestaurantTablesCount = restaurantTables.filter(
        (table) => table.isActive && (table.status === "RESERVED" || table.status === "OCCUPIED"),
    ).length;
    const restaurantReservations = getRestaurantReservationsPreview(data, restaurant.id);
    const activeReservationsCount = restaurantReservations.filter(
        (reservation) => reservation.status === "PENDING" || reservation.status === "CONFIRMED",
    ).length;
    const pendingReservationsCount = restaurantReservations.filter(
        (reservation) => reservation.status === "PENDING",
    ).length;
    const confirmedReservationsCount = restaurantReservations.filter(
        (reservation) => reservation.status === "CONFIRMED",
    ).length;
    const now = Date.now();
    const recentRestaurantReservations = [...restaurantReservations]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 4);
    const upcomingRestaurantReservations = [...restaurantReservations]
        .filter(
            (reservation) =>
                (reservation.status === "PENDING" || reservation.status === "CONFIRMED") &&
                new Date(reservation.reservationDate).getTime() >= now,
        )
        .sort(
            (left, right) =>
                new Date(left.reservationDate).getTime() - new Date(right.reservationDate).getTime(),
        )
        .slice(0, 4);
    const currentViewLabel =
        currentView === "tables"
            ? "إدارة الطاولات"
            : currentView === "history"
                ? "سجل الحجوزات"
                : currentView === "settings"
                    ? "معلومات المطعم"
                : "إدارة الحجوزات";
    const tableSummaryItems = [
        {
            label: "إجمالي الطاولات",
            value: data.tablesError ? "—" : restaurantTablesCount,
            description: "كل الطاولات المرتبطة بالمطعم",
        },
        {
            label: "الطاولات النشطة",
            value: data.tablesError ? "—" : activeRestaurantTablesCount,
            description: "جاهزة للإدارة والحجز",
        },
        {
            label: "المتاحة الآن",
            value: data.tablesError ? "—" : availableRestaurantTablesCount,
            description: "بحالة فارغة",
        },
        {
            label: "المشغولة أو المحجوزة",
            value: data.tablesError ? "—" : reservedRestaurantTablesCount,
            description: "محجوزة أو ممتلئة",
        },
    ];
    const reservationSummaryItems = [
        {
            label: "الحجوزات النشطة",
            value: data.reservationsError ? "—" : activeReservationsCount,
            description: "مؤكدة أو قيد الانتظار",
        },
        {
            label: "قيد الانتظار",
            value: data.reservationsError ? "—" : pendingReservationsCount,
            description: "تحتاج متابعة",
        },
        {
            label: "المؤكدة",
            value: data.reservationsError ? "—" : confirmedReservationsCount,
            description: "جاهزة للاستقبال",
        },
    ];
    const restaurantDetailItems = [
        { label: "العنوان", value: restaurant.address },
        { label: "الهاتف", value: restaurant.phone || "غير متاح" },
        { label: "ساعات العمل", value: formatHours(restaurant.openTime, restaurant.closeTime) },
        { label: "تاريخ الإضافة", value: formatDate(restaurant.createdAt) },
    ];
    const recentReservationItems = recentRestaurantReservations.map((reservation) => ({
        id: reservation.id,
        date: formatReservationDate(reservation.reservationDate),
        meta: `${reservation.guestsCount} ضيوف · الطاولة ${reservation.tableId}`,
        statusLabel: getReservationStatusLabel(reservation.status),
    }));
    const upcomingReservationItems = upcomingRestaurantReservations.map((reservation) => ({
        id: reservation.id,
        date: formatReservationDate(reservation.reservationDate),
        meta: `${reservation.guestsCount} ضيوف · الطاولة ${reservation.tableId}`,
        statusLabel: getReservationStatusLabel(reservation.status),
    }));

    return (
        <OwnerContextSidebarClient
            restaurantName={restaurant.name}
            currentViewLabel={currentViewLabel}
            userName={data.user?.email ? data.user.email.split("@")[0] : undefined}
            userRoleLabel={getRoleLabel(data.user?.role)}
            sections={[
                {
                    id: "restaurant",
                    title: "المطعم الحالي",
                    kind: "restaurant",
                    defaultOpen: true,
                    name: restaurant.name,
                    description: restaurant.description || "المطبخ الشامي التقليدي بلمسة عصرية",
                    hours: formatHours(restaurant.openTime, restaurant.closeTime),
                },
                {
                    id: "tables",
                    title: "ملخص عن الطاولات",
                    kind: "metrics",
                    items: tableSummaryItems,
                },
                {
                    id: "reservations",
                    title: "ملخص عن الحجوزات",
                    kind: "metrics",
                    items: reservationSummaryItems,
                },
                {
                    id: "details",
                    title: "معلومات المطعم",
                    kind: "details",
                    items: restaurantDetailItems,
                },
                {
                    id: "recent",
                    title: "أحدث الحجوزات",
                    kind: "reservations",
                    items: recentReservationItems,
                    emptyLabel: data.reservationsError ? "الحجوزات غير متاحة" : "لا توجد حجوزات",
                    emptyHint: data.reservationsError ?? "لا توجد حجوزات حالياً لهذا المطعم.",
                },
                {
                    id: "upcoming",
                    title: "الحجوزات القادمة",
                    kind: "reservations",
                    items: upcomingReservationItems,
                    emptyLabel: data.reservationsError ? "الحجوزات غير متاحة" : "لا توجد حجوزات قادمة",
                    emptyHint: data.reservationsError ?? "لا توجد حجوزات مستقبلية حالياً.",
                },
            ]}
        />
    );
}

export function OwnerSettingsSection({ data }: { data: OwnerDashboardData }) {
    const restaurant = data.ownedRestaurants[0] ?? null;

    return (
        <section className={styles.ownerPageWithSidebar}>
            <div className={styles.ownerPageMain}>
                {restaurant ? (
                    <section className={`${styles.sectionCard} surface`}>
                        <div className={styles.sectionHeading}>
                            <p className={styles.cardEyebrow}>معلومات المطعم</p>
                            <h2 className={styles.sectionTitle}>{restaurant.name}</h2>
                            <p>{restaurant.description || "المطبخ الشامي التقليدي بلمسة عصرية"}</p>
                        </div>
                        <dl className={styles.detailsGrid}>
                            <div className={styles.detailItem}>
                                <dt>العنوان</dt>
                                <dd>{restaurant.address}</dd>
                            </div>
                            <div className={styles.detailItem}>
                                <dt>الهاتف</dt>
                                <dd>{restaurant.phone || "غير متاح"}</dd>
                            </div>
                            <div className={styles.detailItem}>
                                <dt>ساعات العمل</dt>
                                <dd>{formatHours(restaurant.openTime, restaurant.closeTime)}</dd>
                            </div>
                            <div className={styles.detailItem}>
                                <dt>تاريخ الإضافة</dt>
                                <dd>{formatDate(restaurant.createdAt)}</dd>
                            </div>
                        </dl>
                    </section>
                ) : (
                    <section className={`${styles.stateCard} surface-alt`}>
                        <span className={styles.stateEyebrow}>لا توجد مطاعم</span>
                        <p>لا يمكن عرض معلومات المطعم قبل ربط مطعم واحد على الأقل بهذا الحساب.</p>
                    </section>
                )}
            </div>

            <OwnerContextSidebar data={data} currentView="settings" />
        </section>
    );
}

type OwnerTablesSectionProps = {
    data: OwnerDashboardData;
    restaurantId?: string;
};

type TableStatus = "available" | "reserved" | "full";

type TableWithStatus = RestaurantTable & {
    status: TableStatus;
    nextReservation?: RestaurantReservation;
    upcomingReservations: RestaurantReservation[];
};

function categorizeTable(
    table: RestaurantTable,
    reservations: RestaurantReservation[],
): TableWithStatus {
    const now = new Date();
    const upcomingReservations = reservations
        .filter(
            (reservation) =>
                reservation.tableId === table.id &&
                (reservation.status === "PENDING" || reservation.status === "CONFIRMED") &&
                new Date(reservation.reservationDate) >= now,
        )
        .sort(
            (a, b) =>
                new Date(a.reservationDate).getTime() - new Date(b.reservationDate).getTime(),
        );
    const nextReservation = upcomingReservations[0];

    // Only show active tables on the board
    if (!table.isActive) {
        return { ...table, status: "available", upcomingReservations, nextReservation }; // Will be filtered out
    }

    // Priority 1: Backend OCCUPIED status overrides everything
    if (table.status === "OCCUPIED") {
        return { ...table, status: "full", nextReservation, upcomingReservations };
    }

    // Priority 2: Backend AVAILABLE status (manual override - owner can clear a table even with reservations)
    if (table.status === "AVAILABLE") {
        return { ...table, status: "available", nextReservation, upcomingReservations };
    }

    // Priority 3: Backend RESERVED status (manual phone reservations)
    if (table.status === "RESERVED") {
        return { ...table, status: "reserved", nextReservation, upcomingReservations };
    }

    // Priority 4: Fallback - Has active reservation (PENDING or CONFIRMED)
    if (upcomingReservations.length > 0) {
        return { ...table, status: "reserved", nextReservation, upcomingReservations };
    }

    // Priority 5: Default to available
    return { ...table, status: "available", nextReservation, upcomingReservations };
}

export function OwnerTablesSection({ data, restaurantId }: OwnerTablesSectionProps) {
    const scopedRestaurant = restaurantId ? getOwnedRestaurantOrRedirect(data, restaurantId) : null;
    const visibleRestaurants = scopedRestaurant ? [scopedRestaurant] : data.ownedRestaurants;
    const isScopedToRestaurant = scopedRestaurant !== null;

    return (
        <section className={styles.ownerPageWithSidebar}>
            <div className={styles.ownerPageMain}>
                <section className={`${styles.sectionCard} surface`}>


                    {visibleRestaurants.length === 0 ? (
                        <section className={`${styles.stateCard} surface-alt`}>
                            <span className={styles.stateEyebrow}>لا توجد مطاعم</span>
                            <p>لا يمكن إدارة الطاولات قبل ربط مطعم واحد على الأقل بهذا الحساب.</p>
                        </section>
                    ) : data.tablesError ? (
                        <section className={`${styles.stateCard} surface-alt`}>
                            <span className={styles.stateEyebrow}>الطاولات غير متاحة</span>
                            <p>{data.tablesError}</p>
                        </section>
                    ) : (
                        <div className={styles.tableSections}>
                            {visibleRestaurants.map((restaurant) => {
                                const restaurantTables = data.tablesByRestaurant.get(restaurant.id) ?? [];
                                const restaurantReservations =
                                    data.reservationsByRestaurant.get(restaurant.id)?.reservations ?? [];

                                const tablesWithStatus = restaurantTables
                                    .map((table) => categorizeTable(table, restaurantReservations))
                                    .filter((t) => t.isActive);

                                const availableTables = tablesWithStatus.filter((t) => t.status === "available");
                                const reservedTables = tablesWithStatus.filter((t) => t.status === "reserved");
                                const fullTables = tablesWithStatus.filter((t) => t.status === "full");

                                return (
                                    <section key={restaurant.id} className={styles.reservationsRestaurantShell}>


                                        <TablesKanbanBoard
                                            restaurantId={restaurant.id}
                                            availableTables={availableTables}
                                            reservedTables={reservedTables}
                                            fullTables={fullTables}
                                        />
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            <OwnerContextSidebar data={data} restaurantId={restaurantId} currentView="tables" />
        </section>
    );
}

type OwnerReservationsSectionProps = {
    data: OwnerDashboardData;
    selectedStatus?: ReservationStatus;
    restaurantId?: string;
};

export function OwnerReservationsSection({
    data,
    selectedStatus,
    restaurantId,
}: OwnerReservationsSectionProps) {
    const scopedRestaurant = restaurantId ? getOwnedRestaurantOrRedirect(data, restaurantId) : null;
    const visibleRestaurants = scopedRestaurant ? [scopedRestaurant] : data.ownedRestaurants;
    const isScopedToRestaurant = scopedRestaurant !== null;

    return (
        <section className={styles.ownerPageWithSidebar}>
            <div className={styles.ownerPageMain}>
                <section className={styles.reservationsFullPage}>
                    {visibleRestaurants.length === 0 ? (
                        <section className={`${styles.stateCard} surface-alt`}>
                            <span className={styles.stateEyebrow}>لا توجد مطاعم</span>
                            <p>لا يمكن عرض الحجوزات قبل ربط مطعم واحد على الأقل بهذا الحساب.</p>
                        </section>
                    ) : data.reservationsError ? (
                        <section className={`${styles.stateCard} surface-alt`}>
                            <span className={styles.stateEyebrow}>الحجوزات غير متاحة</span>
                            <p>{data.reservationsError}</p>
                        </section>
                    ) : (
                        <div className={styles.tableSections}>
                            {visibleRestaurants.map((restaurant) => {
                                const restaurantReservations = getRestaurantReservationsPreview(
                                    data,
                                    restaurant.id,
                                    selectedStatus,
                                );
                                const restaurantTables = data.tablesByRestaurant.get(restaurant.id) ?? [];

                                return (
                                    <section key={restaurant.id} className={styles.reservationsRestaurantShell}>
                                        <ReservationsWeeklyCalendar
                                            reservations={restaurantReservations}
                                            restaurantId={restaurant.id}
                                            restaurantName={restaurant.name}
                                            openTime={restaurant.openTime}
                                            closeTime={restaurant.closeTime}
                                            selectedStatus={selectedStatus}
                                            isScopedToRestaurant={isScopedToRestaurant}
                                            tables={restaurantTables}
                                        />
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            <OwnerContextSidebar data={data} restaurantId={restaurantId} currentView="reservations" />
        </section>
    );
}

type OwnerReservationsHistorySectionProps = {
    data: OwnerDashboardData;
    children: React.ReactNode;
};

export function OwnerReservationsHistorySection({ data, children }: OwnerReservationsHistorySectionProps) {
    return (
        <section className={styles.ownerPageWithSidebar}>
            <div className={styles.ownerPageMain}>{children}</div>

            <OwnerContextSidebar data={data} currentView="history" />
        </section>
    );
}

import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InvitationCreateForm } from "./invitation-create-form";
import { InvitationLinkField } from "./invitation-link-field";
import { resolveProtectedAreaRedirect } from "../_components/role-routing";
import styles from "./page.module.css";

const authCookieName = "restaurant_booking_access_token";
const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3000";

const displayLocale = "ar-SY-u-nu-latn";
const adminViews = ["summary", "invitations", "restaurants", "users"] as const;

type AuthMeResponse = {
    id: string | number;
    email: string;
    role: string;
};

export type AdminView = (typeof adminViews)[number];

type AdminNavLink = {
    key: string;
    label: string;
    href: string;
    isActive: boolean;
};

export type UserRecord = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: "CUSTOMER" | "RESTAURANT_ADMIN" | "SUPER_ADMIN" | string;
    createdAt: string;
};

export type Restaurant = {
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

export type InvitationRecord = {
    id: string;
    email: string;
    role: string;
    token: string;
    status: "PENDING" | "ACCEPTED" | "EXPIRED" | string;
    invitedByUserId: string;
    restaurantId: string | null;
    expiresAt: string;
    acceptedAt: string | null;
    createdAt: string;
    restaurant: {
        id: string;
        name: string;
    } | null;
    invitedBy: {
        id: string;
        email: string;
        name: string;
    } | null;
};

export type AdminDashboardData = {
    user: AuthMeResponse | null;
    users: UserRecord[];
    restaurants: Restaurant[];
    invitations: InvitationRecord[];
    usersById: Map<string, UserRecord>;
    restaurantsByOwner: Map<string, Restaurant[]>;
    restaurantAdmins: UserRecord[];
    customers: UserRecord[];
    superAdmins: UserRecord[];
    unassignedRestaurants: Restaurant[];
    restaurantAdminWithoutRestaurant: UserRecord[];
    recentUsers: UserRecord[];
    recentRestaurants: Restaurant[];
    pendingInvitations: InvitationRecord[];
    acceptedInvitations: InvitationRecord[];
    expiredInvitations: InvitationRecord[];
    dashboardError: string | null;
};

function buildLoginHref(nextPath: string) {
    return `/login?next=${encodeURIComponent(nextPath)}`;
}

export function buildAdminHref(view: AdminView) {
    if (view === "summary") {
        return "/admin";
    }

    return `/admin/${view}`;
}

function buildAdminNavLinks(currentView: AdminView): AdminNavLink[] {
    return [
        {
            key: "summary",
            label: "الملخص",
            href: buildAdminHref("summary"),
            isActive: currentView === "summary",
        },
        {
            key: "invitations",
            label: "إدارة الدعوات",
            href: buildAdminHref("invitations"),
            isActive: currentView === "invitations",
        },
        {
            key: "restaurants",
            label: "إدارة المطاعم",
            href: buildAdminHref("restaurants"),
            isActive: currentView === "restaurants",
        },
        {
            key: "users",
            label: "إدارة المستخدمين",
            href: buildAdminHref("users"),
            isActive: currentView === "users",
        },
    ];
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat(displayLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(value));
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat(displayLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatHours(openTime: string | null, closeTime: string | null) {
    if (!openTime && !closeTime) {
        return "لم تُنشر ساعات العمل بعد";
    }

    if (openTime && closeTime) {
        return `${openTime} - ${closeTime}`;
    }

    return openTime ?? closeTime ?? "لم تُنشر ساعات العمل بعد";
}

function getRoleLabel(role: string) {
    if (role === "SUPER_ADMIN") {
        return "مشرف عام";
    }

    if (role === "RESTAURANT_ADMIN") {
        return "مدير مطعم";
    }

    if (role === "CUSTOMER") {
        return "عميل";
    }

    return role;
}

function getInvitationStatusLabel(status: string) {
    if (status === "PENDING") {
        return "قيد الانتظار";
    }

    if (status === "ACCEPTED") {
        return "مقبولة";
    }

    if (status === "EXPIRED") {
        return "منتهية";
    }

    return status;
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
                error: "تعذر تحميل جلسة المشرف العام الحالية.",
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

async function getUsers() {
    try {
        const response = await fetch(new URL("/users", apiBaseUrl), {
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            return {
                error: "تعذر تحميل مستخدمي المنصة حالياً. حاول مرة أخرى بعد قليل.",
                users: [] as UserRecord[],
            };
        }

        const data = (await response.json()) as unknown;

        if (!Array.isArray(data)) {
            return {
                error: "وصلت استجابة غير متوقعة من خدمة المستخدمين.",
                users: [] as UserRecord[],
            };
        }

        return {
            error: null,
            users: data as UserRecord[],
        };
    } catch {
        return {
            error: "خدمة المستخدمين غير متاحة حالياً. حاول مرة أخرى بعد قليل.",
            users: [] as UserRecord[],
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

async function getInvitations(token: string) {
    try {
        const response = await fetch(new URL("/invitations", apiBaseUrl), {
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.status === 401) {
            return {
                error: "انتهت صلاحية الجلسة الحالية. سجّل الدخول مرة أخرى.",
                invitations: [] as InvitationRecord[],
                unauthorized: true,
            };
        }

        if (!response.ok) {
            return {
                error: "تعذر تحميل الدعوات حالياً. حاول مرة أخرى بعد قليل.",
                invitations: [] as InvitationRecord[],
                unauthorized: false,
            };
        }

        const data = (await response.json()) as unknown;

        if (!Array.isArray(data)) {
            return {
                error: "وصلت استجابة غير متوقعة من خدمة الدعوات.",
                invitations: [] as InvitationRecord[],
                unauthorized: false,
            };
        }

        return {
            error: null,
            invitations: data as InvitationRecord[],
            unauthorized: false,
        };
    } catch {
        return {
            error: "خدمة الدعوات غير متاحة حالياً. حاول مرة أخرى بعد قليل.",
            invitations: [] as InvitationRecord[],
            unauthorized: false,
        };
    }
}

export async function getAdminDashboardData(nextPath: string): Promise<AdminDashboardData> {
    const cookieStore = await cookies();
    const token = cookieStore.get(authCookieName)?.value;

    if (!token) {
        redirect(buildLoginHref(nextPath));
    }

    const [
        { user, error: userError, unauthorized },
        { users, error: usersError },
        { restaurants, error: restaurantsError },
        {
            invitations,
            error: invitationsError,
            unauthorized: invitationsUnauthorized,
        },
    ] = await Promise.all([getCurrentUser(token), getUsers(), getRestaurants(), getInvitations(token)]);

    if (unauthorized || invitationsUnauthorized) {
        redirect(buildLoginHref(nextPath));
    }

    const roleRedirect = resolveProtectedAreaRedirect("admin", user?.role);

    if (roleRedirect) {
        redirect(roleRedirect);
    }

    const usersById = new Map(users.map((account) => [account.id, account]));
    const restaurantAdmins = users.filter((account) => account.role === "RESTAURANT_ADMIN");
    const customers = users.filter((account) => account.role === "CUSTOMER");
    const superAdmins = users.filter((account) => account.role === "SUPER_ADMIN");
    const restaurantsByOwner = new Map<string, Restaurant[]>();

    for (const restaurant of restaurants) {
        const currentRestaurants = restaurantsByOwner.get(restaurant.ownerId) ?? [];
        currentRestaurants.push(restaurant);
        restaurantsByOwner.set(restaurant.ownerId, currentRestaurants);
    }

    const unassignedRestaurants = restaurants.filter((restaurant) => !usersById.has(restaurant.ownerId));
    const restaurantAdminWithoutRestaurant = restaurantAdmins.filter(
        (account) => (restaurantsByOwner.get(account.id)?.length ?? 0) === 0,
    );
    const recentUsers = [...users].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const recentRestaurants = [...restaurants].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
    );
    const pendingInvitations = invitations.filter((invitation) => invitation.status === "PENDING");
    const acceptedInvitations = invitations.filter((invitation) => invitation.status === "ACCEPTED");
    const expiredInvitations = invitations.filter((invitation) => invitation.status === "EXPIRED");
    const dashboardError = userError ?? usersError ?? restaurantsError ?? invitationsError;

    return {
        user,
        users,
        restaurants,
        invitations,
        usersById,
        restaurantsByOwner,
        restaurantAdmins,
        customers,
        superAdmins,
        unassignedRestaurants,
        restaurantAdminWithoutRestaurant,
        recentUsers,
        recentRestaurants,
        pendingInvitations,
        acceptedInvitations,
        expiredInvitations,
        dashboardError,
    };
}

type AdminPageChromeProps = {
    currentView: AdminView;
    title: string;
    description: string;
    data: AdminDashboardData;
    children: React.ReactNode;
};

export function AdminPageChrome({
    currentView,
    title,
    description,
    data,
    children,
}: AdminPageChromeProps) {
    return (
        <main className={`container ${styles.page} ${styles.stack}`}>
            <section className={`${styles.hero} surface-alt`}>
                <div className={styles.heroContent}>
                    <span className={styles.eyebrow}>منطقة إدارة المنصة</span>
                    <div className={styles.heroHeading}>
                        <h1>{title}</h1>
                        <p>{description}</p>
                    </div>
                </div>

                <aside className={`${styles.heroAside} surface`}>
                    <dl className={styles.metaCard}>
                        <dt>الحساب الحالي</dt>
                        <dd>{data.user?.email ?? "غير متاح"}</dd>
                    </dl>
                    <dl className={styles.metaCard}>
                        <dt>الدور</dt>
                        <dd>{getRoleLabel(data.user?.role ?? "غير متاح")}</dd>
                    </dl>
                    <dl className={styles.metaCard}>
                        <dt>مديرو المطاعم</dt>
                        <dd>{data.restaurantAdmins.length}</dd>
                    </dl>
                    <dl className={styles.metaCard}>
                        <dt>مطاعم غير مرتبطة</dt>
                        <dd>{data.unassignedRestaurants.length}</dd>
                    </dl>
                </aside>
            </section>

            <nav className={styles.viewNav} aria-label="تنقل إدارة المنصة">
                {buildAdminNavLinks(currentView).map((link) => (
                    <Link
                        key={link.key}
                        href={link.href}
                        className={`${styles.viewLink} ${link.isActive ? styles.viewLinkActive : ""}`}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>

            {data.dashboardError ? (
                <section className={`${styles.stateCard} surface`}>
                    <span className={styles.stateEyebrow}>اللوحة غير متاحة</span>
                    <h2>تعذر تحميل لوحة إدارة المنصة.</h2>
                    <p>{data.dashboardError}</p>
                    <div className={styles.stateActions}>
                        <Link href="/admin" className="button-primary">
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

export function AdminSummarySection({ data }: { data: AdminDashboardData }) {
    return (
        <>
            <section className={styles.summaryGrid}>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>المنصة</span>
                    <strong className={styles.metricValue}>{data.users.length}</strong>
                    <p className={styles.metricLabel}>إجمالي المستخدمين</p>
                </article>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>المطاعم</span>
                    <strong className={styles.metricValue}>{data.restaurants.length}</strong>
                    <p className={styles.metricLabel}>إجمالي المطاعم</p>
                </article>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>الحسابات</span>
                    <strong className={styles.metricValue}>{data.restaurantAdmins.length}</strong>
                    <p className={styles.metricLabel}>مديرو المطاعم</p>
                </article>
                <article className={`${styles.metricCard} surface`}>
                    <span className={styles.metricEyebrow}>العملاء</span>
                    <strong className={styles.metricValue}>{data.customers.length}</strong>
                    <p className={styles.metricLabel}>حسابات العملاء</p>
                </article>
            </section>

            <section className={styles.dashboardGrid}>
                <div className={styles.mainStack}>
                    <section className={`${styles.sectionCard} surface`}>
                        <div className={styles.sectionHeading}>
                            <h2>التنقل داخل المنصة</h2>
                            <p>استخدم شريط التنقل أعلى الصفحة للانتقال بين الدعوات والمطاعم والمستخدمين، بينما تبقى هذه الصفحة مخصصة لملخص المنصة ومؤشراتها الحالية.</p>
                        </div>

                        <div className={styles.previewGrid}>
                            <article className={`${styles.previewCard} surface-alt`}>
                                <p className={styles.cardEyebrow}>الدعوات</p>
                                <h3>قسم مستقل للدعوات</h3>
                                <p className={styles.previewHint}>يحتوي على إنشاء الدعوات، النسخ، ومتابعة الحالات من دون مزاحمة صفحة الملخص.</p>
                            </article>
                            <article className={`${styles.previewCard} surface-alt`}>
                                <p className={styles.cardEyebrow}>المطاعم والمستخدمون</p>
                                <h3>أقسام مخصصة للمتابعة</h3>
                                <p className={styles.previewHint}>تنتقل إليها من التنقل العلوي، بينما تبقى هذه الصفحة لقراءة مؤشرات المنصة فقط.</p>
                            </article>
                        </div>
                    </section>

                    <section className={`${styles.sectionCard} surface`}>
                        <div className={styles.sectionHeading}>
                            <h2>معاينة سريعة</h2>
                            <p>مؤشرات خفيفة فقط على الصفحة الرئيسية بدلاً من القوائم الإدارية الكاملة.</p>
                        </div>

                        <div className={styles.previewGrid}>
                            <article className={`${styles.previewCard} surface-alt`}>
                                <p className={styles.cardEyebrow}>الدعوات</p>
                                <h3>{data.pendingInvitations.length} قيد الانتظار</h3>
                                <p className={styles.previewHint}>
                                    {data.acceptedInvitations.length} مقبولة و{data.expiredInvitations.length} منتهية.
                                </p>
                            </article>
                            <article className={`${styles.previewCard} surface-alt`}>
                                <p className={styles.cardEyebrow}>المطاعم</p>
                                <h3>{data.unassignedRestaurants.length} تحتاج متابعة</h3>
                                <p className={styles.previewHint}>
                                    مطاعم غير مرتبطة بحساب معروف في البيانات الحالية.
                                </p>
                            </article>
                            <article className={`${styles.previewCard} surface-alt`}>
                                <p className={styles.cardEyebrow}>الحسابات</p>
                                <h3>{data.restaurantAdminWithoutRestaurant.length} مدير بلا مطعم</h3>
                                <p className={styles.previewHint}>
                                    {data.superAdmins.length} مشرف عام و{data.customers.length} عميل ضمن المنصة.
                                </p>
                            </article>
                        </div>
                    </section>
                </div>

                <aside className={styles.asideStack}>
                    <section className={`${styles.sectionCard} surface`}>
                        <div className={styles.sectionHeading}>
                            <h2>أحدث السجلات</h2>
                            <p>معاينة قصيرة تبقي صفحة /admin ملخصاً فقط.</p>
                        </div>

                        <div className={styles.previewList}>
                            {data.recentRestaurants.slice(0, 2).map((restaurant) => (
                                <article key={restaurant.id} className={`${styles.previewCard} surface-alt`}>
                                    <p className={styles.previewTitle}>{restaurant.name}</p>
                                    <p className={styles.previewMeta}>أضيف في {formatDate(restaurant.createdAt)}</p>
                                </article>
                            ))}
                            {data.recentUsers.slice(0, 2).map((account) => (
                                <article key={account.id} className={`${styles.previewCard} surface-alt`}>
                                    <p className={styles.previewTitle}>{account.name}</p>
                                    <p className={styles.previewMeta}>{getRoleLabel(account.role)} · {formatDate(account.createdAt)}</p>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className={`${styles.sectionCard} surface`}>
                        <div className={styles.sectionHeading}>
                            <h2>فحوصات المنصة</h2>
                            <p>تبقى هذه اللوحة مرتبطة فقط بعقود التحقق والبيانات الحالية.</p>
                        </div>

                        <div className={styles.checkList}>
                            <div className={styles.checkItem}>تحقق من الجلسة على الخادم عبر GET /auth/me</div>
                            <div className={styles.checkItem}>أعداد حسابات فعلية من GET /users</div>
                            <div className={styles.checkItem}>سجلات مطاعم فعلية من GET /restaurants</div>
                            <div className={styles.checkItem}>دعوات محفوظة مع حالة وانتهاء صلاحية من الخلفية</div>
                        </div>
                    </section>
                </aside>
            </section>
        </>
    );
}

export function AdminInvitationsSection({ data }: { data: AdminDashboardData }) {
    return (
        <section className={styles.dashboardGrid}>
            <div className={styles.mainStack}>
                <section className={`${styles.sectionCard} surface`}>
                    <div className={styles.sectionHeading}>
                        <h2>إدارة الدعوات</h2>
                        <p>أنشئ دعوات فعلية لمديري المطاعم، واربطها بمطعم عند الحاجة، ثم انسخ رابط القبول للإرسال اليدوي إلى حين إضافة البريد الإلكتروني.</p>
                    </div>

                    <div className={styles.inlineSummaryGrid}>
                        <article className={styles.inlineSummaryCard}>
                            <span>قيد الانتظار</span>
                            <strong>{data.pendingInvitations.length}</strong>
                        </article>
                        <article className={styles.inlineSummaryCard}>
                            <span>مقبولة</span>
                            <strong>{data.acceptedInvitations.length}</strong>
                        </article>
                        <article className={styles.inlineSummaryCard}>
                            <span>منتهية</span>
                            <strong>{data.expiredInvitations.length}</strong>
                        </article>
                    </div>

                    <div className={styles.invitationManagementGrid}>
                        <section className={styles.invitationPanel}>
                            <div className={styles.sectionHeading}>
                                <h3>إنشاء دعوة</h3>
                                <p>الدور ثابت على مدير مطعم في هذه المرحلة حتى يبقى اختيار الأدوار العامة مغلقاً.</p>
                            </div>

                            <InvitationCreateForm
                                restaurants={data.recentRestaurants.map((restaurant) => ({
                                    id: restaurant.id,
                                    name: restaurant.name,
                                }))}
                            />
                        </section>

                        <section className={styles.invitationPanel}>
                            <div className={styles.sectionHeading}>
                                <h3>الدعوات الحالية</h3>
                                <p>يتم حفظ كل دعوة في الخلفية ولا يمكن قبولها إلا مرة واحدة قبل انتهاء صلاحيتها.</p>
                            </div>

                            {data.invitations.length === 0 ? (
                                <section className={`${styles.stateCard} surface-alt`}>
                                    <span className={styles.stateEyebrow}>لا توجد دعوات</span>
                                    <h3>لا توجد دعوات حالياً.</h3>
                                    <p>أنشئ أول دعوة لبدء تفعيل مدير مطعم جديد.</p>
                                </section>
                            ) : (
                                <div className={styles.invitationList}>
                                    {data.invitations.map((invitation) => {
                                        const statusClassName =
                                            invitation.status === "ACCEPTED"
                                                ? styles.acceptedBadge
                                                : invitation.status === "EXPIRED"
                                                    ? styles.expiredBadge
                                                    : styles.pendingBadge;

                                        return (
                                            <article key={invitation.id} className={`${styles.invitationCard} surface-alt`}>
                                                <div className={styles.invitationCardTop}>
                                                    <div className={styles.invitationIdentity}>
                                                        <p className={styles.cardEyebrow}>دعوة</p>
                                                        <h3>{invitation.email}</h3>
                                                        <p>
                                                            {invitation.restaurant
                                                                ? `مرتبطة بالمطعم ${invitation.restaurant.name}`
                                                                : "لا يوجد مطعم مرتبط"}
                                                        </p>
                                                    </div>

                                                    <span className={`${styles.roleBadge} ${statusClassName}`}>
                                                        {getInvitationStatusLabel(invitation.status)}
                                                    </span>
                                                </div>

                                                <dl className={styles.infoGrid}>
                                                    <div className={styles.infoItem}>
                                                        <dt>الدور</dt>
                                                        <dd>{getRoleLabel(invitation.role)}</dd>
                                                    </div>
                                                    <div className={styles.infoItem}>
                                                        <dt>أرسلها</dt>
                                                        <dd>{invitation.invitedBy?.email ?? invitation.invitedByUserId}</dd>
                                                    </div>
                                                    <div className={styles.infoItem}>
                                                        <dt>تاريخ الإنشاء</dt>
                                                        <dd>{formatDateTime(invitation.createdAt)}</dd>
                                                    </div>
                                                    <div className={styles.infoItem}>
                                                        <dt>تنتهي في</dt>
                                                        <dd>{formatDateTime(invitation.expiresAt)}</dd>
                                                    </div>
                                                </dl>

                                                {invitation.status === "ACCEPTED" ? (
                                                    <p className={styles.roleHint}>
                                                        تم قبولها {invitation.acceptedAt ? formatDateTime(invitation.acceptedAt) : "حديثاً"}.
                                                    </p>
                                                ) : invitation.status === "EXPIRED" ? (
                                                    <p className={styles.roleHint}>
                                                        انتهت صلاحية هذه الدعوة ولا يمكن استخدامها مرة أخرى.
                                                    </p>
                                                ) : (
                                                    <InvitationLinkField token={invitation.token} />
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                </section>
            </div>

            <aside className={styles.asideStack}>
                <section className={`${styles.sectionCard} surface`}>
                    <div className={styles.sectionHeading}>
                        <h2>مسار الدعوة</h2>
                        <p>أصبح مسار التفعيل فعلياً من البداية إلى النهاية، بينما يبقى إرسال الدعوات يدوياً إلى حين إضافة البنية الخاصة بالبريد الإلكتروني.</p>
                    </div>

                    <div className={styles.inviteFlow}>
                        <div className={styles.stepCard}>
                            <span className={styles.stepNumber}>1</span>
                            <div>
                                <h3>إرسال الدعوة بالبريد الإلكتروني</h3>
                                <p>يرسل المشرف العام دعوة إلى مدير المطعم عبر بريده الإلكتروني.</p>
                            </div>
                        </div>
                        <div className={styles.stepCard}>
                            <span className={styles.stepNumber}>2</span>
                            <div>
                                <h3>ربط المطعم</h3>
                                <p>يرتبط المدير المدعو بالمطعم الصحيح أثناء إعداد المنصة.</p>
                            </div>
                        </div>
                        <div className={styles.stepCard}>
                            <span className={styles.stepNumber}>3</span>
                            <div>
                                <h3>إكمال إعداد الحساب</h3>
                                <p>يكمل المدير المدعو إعداد حسابه لاحقاً بدلاً من استخدام تسجيل عام مفتوح.</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.placeholderNote}>
                        ينشئ المشرف العام الدعوة هنا، وينسخ رابط القبول يدوياً، ثم يكمل المدير المدعو الإعداد لاحقاً عبر شاشة قبول الدعوة العامة.
                    </div>
                </section>
            </aside>
        </section>
    );
}

export function AdminRestaurantsSection({ data }: { data: AdminDashboardData }) {
    return (
        <section className={styles.dashboardGrid}>
            <div className={styles.mainStack}>
                <section className={`${styles.sectionCard} surface`}>
                    <div className={styles.sectionHeading}>
                        <h2>إدارة المطاعم</h2>
                        <p>يتم تنظيم سجلات المطاعم الحالية هنا حتى يراجع المشرف العام التغطية الإدارية ويعرف المطاعم التي ما تزال تحتاج إلى متابعة في مسار الدعوات.</p>
                    </div>

                    <div className={styles.inlineSummaryGrid}>
                        <article className={styles.inlineSummaryCard}>
                            <span>مرتبطة بمديري المطاعم</span>
                            <strong>
                                {
                                    data.restaurants.filter(
                                        (restaurant) => data.usersById.get(restaurant.ownerId)?.role === "RESTAURANT_ADMIN",
                                    ).length
                                }
                            </strong>
                        </article>
                        <article className={styles.inlineSummaryCard}>
                            <span>مرتبطة بالمشرفين العامين</span>
                            <strong>
                                {
                                    data.restaurants.filter(
                                        (restaurant) => data.usersById.get(restaurant.ownerId)?.role === "SUPER_ADMIN",
                                    ).length
                                }
                            </strong>
                        </article>
                        <article className={styles.inlineSummaryCard}>
                            <span>الحساب الإداري مفقود</span>
                            <strong>{data.unassignedRestaurants.length}</strong>
                        </article>
                    </div>

                    {data.recentRestaurants.length === 0 ? (
                        <section className={`${styles.stateCard} surface-alt`}>
                            <span className={styles.stateEyebrow}>لا توجد مطاعم</span>
                            <h3>لا توجد مطاعم حالياً.</h3>
                            <p>ستظهر هنا المطاعم الحالية عند توفرها.</p>
                        </section>
                    ) : (
                        <div className={styles.entityList}>
                            {data.recentRestaurants.map((restaurant) => {
                                const ownerAccount = data.usersById.get(restaurant.ownerId);
                                const linkedRole = ownerAccount?.role;

                                return (
                                    <article key={restaurant.id} className={`${styles.entityCard} surface-alt`}>
                                        <div className={styles.entityHeader}>
                                            <div className={styles.entityIdentity}>
                                                <p className={styles.cardEyebrow}>سجل المطعم</p>
                                                <h3>{restaurant.name}</h3>
                                                <p>
                                                    {restaurant.description ||
                                                        "لم تتم إضافة وصف تفصيلي للمطعم بعد. السجل متاح حالياً لمراجعة الملكية وربطه بالإجراءات الإدارية المقبلة."}
                                                </p>
                                            </div>

                                            <div className={styles.entitySignals}>
                                                <span className={`${styles.roleBadge} ${styles.restaurantBadge}`}>
                                                    {ownerAccount
                                                        ? `المالك: ${getRoleLabel(linkedRole ?? "غير معروف")}`
                                                        : "حساب المالك غير موجود"}
                                                </span>
                                                <span className={styles.signalPill}>أضيف في {formatDate(restaurant.createdAt)}</span>
                                            </div>
                                        </div>

                                        <dl className={styles.infoGrid}>
                                            <div className={styles.infoItem}>
                                                <dt>العنوان</dt>
                                                <dd>{restaurant.address}</dd>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <dt>ساعات العمل</dt>
                                                <dd>{formatHours(restaurant.openTime, restaurant.closeTime)}</dd>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <dt>المالك</dt>
                                                <dd>{ownerAccount ? ownerAccount.email : restaurant.ownerId}</dd>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <dt>الهاتف</dt>
                                                <dd>{restaurant.phone || "لم يُنشر بعد"}</dd>
                                            </div>
                                        </dl>

                                        <div className={styles.cardActions}>
                                            <Link href={`/restaurants/${restaurant.id}`} className="button-secondary">
                                                عرض المطعم
                                            </Link>
                                            <span className={styles.actionHint}>
                                                يمكن إضافة إجراء إعادة الربط هنا لاحقاً عند توفر مسارات التحديث في الخلفية.
                                            </span>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            <aside className={styles.asideStack}>
                <section className={`${styles.sectionCard} surface`}>
                    <div className={styles.sectionHeading}>
                        <h2>ملخص المتابعة</h2>
                        <p>هذه الصفحة مخصصة فقط لإدارة المطاعم الحالية ومراجعة الملكية وربطها بالمتابعة الإدارية.</p>
                    </div>

                    <div className={styles.checkList}>
                        <div className={styles.checkItem}>{data.unassignedRestaurants.length} مطاعم تحتاج مراجعة ملكية</div>
                        <div className={styles.checkItem}>{data.restaurants.length} سجلات مطاعم متاحة حالياً</div>
                        <div className={styles.checkItem}>العرض يعتمد على GET /restaurants وبيانات /users الحالية</div>
                    </div>
                </section>
            </aside>
        </section>
    );
}

export function AdminUsersSection({ data }: { data: AdminDashboardData }) {
    return (
        <section className={styles.dashboardGrid}>
            <div className={styles.mainStack}>
                <section className={`${styles.sectionCard} surface`}>
                    <div className={styles.sectionHeading}>
                        <h2>إدارة المستخدمين</h2>
                        <p>تعرض سجلات الحسابات الحالية مع أدوارها حتى يميّز المشرف العام بين حسابات المنصة ومديري المطاعم والعملاء.</p>
                    </div>

                    <div className={styles.roleLegend}>
                        <span className={`${styles.roleBadge} ${styles.superAdminBadge}`}>مشرف عام</span>
                        <span className={`${styles.roleBadge} ${styles.restaurantAdminBadge}`}>مدير مطعم</span>
                        <span className={`${styles.roleBadge} ${styles.customerBadge}`}>عميل</span>
                    </div>

                    <div className={styles.inlineSummaryGrid}>
                        <article className={styles.inlineSummaryCard}>
                            <span>المشرفون العامون</span>
                            <strong>{data.superAdmins.length}</strong>
                        </article>
                        <article className={styles.inlineSummaryCard}>
                            <span>مديرو المطاعم بلا مطعم مرتبط</span>
                            <strong>{data.restaurantAdminWithoutRestaurant.length}</strong>
                        </article>
                        <article className={styles.inlineSummaryCard}>
                            <span>العملاء</span>
                            <strong>{data.customers.length}</strong>
                        </article>
                    </div>

                    {data.recentUsers.length === 0 ? (
                        <section className={`${styles.stateCard} surface-alt`}>
                            <span className={styles.stateEyebrow}>لا توجد حسابات</span>
                            <h3>لا توجد حسابات حالياً.</h3>
                            <p>ستظهر هنا الحسابات الحالية مع أدوارها عند توفرها.</p>
                        </section>
                    ) : (
                        <div className={styles.accountList}>
                            {data.recentUsers.map((account) => {
                                const linkedRestaurants = data.restaurantsByOwner.get(account.id) ?? [];
                                const roleClassName =
                                    account.role === "SUPER_ADMIN"
                                        ? styles.superAdminBadge
                                        : account.role === "RESTAURANT_ADMIN"
                                            ? styles.restaurantAdminBadge
                                            : styles.customerBadge;

                                return (
                                    <article key={account.id} className={`${styles.accountCard} surface-alt`}>
                                        <div className={styles.accountHeader}>
                                            <div className={styles.accountIdentity}>
                                                <p className={styles.cardEyebrow}>الحساب</p>
                                                <h3>{account.name}</h3>
                                                <p>{account.email}</p>
                                            </div>

                                            <span className={`${styles.roleBadge} ${roleClassName}`}>
                                                {getRoleLabel(account.role)}
                                            </span>
                                        </div>

                                        <dl className={styles.infoGrid}>
                                            <div className={styles.infoItem}>
                                                <dt>الهاتف</dt>
                                                <dd>{account.phone || "غير متوفر"}</dd>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <dt>تاريخ الإنشاء</dt>
                                                <dd>{formatDateTime(account.createdAt)}</dd>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <dt>المطاعم المرتبطة</dt>
                                                <dd>{linkedRestaurants.length}</dd>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <dt>معرّف الحساب</dt>
                                                <dd>{account.id}</dd>
                                            </div>
                                        </dl>

                                        {linkedRestaurants.length > 0 ? (
                                            <div className={styles.linkedList}>
                                                {linkedRestaurants.map((restaurant) => (
                                                    <span key={restaurant.id} className={styles.linkedChip}>
                                                        {restaurant.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : account.role === "RESTAURANT_ADMIN" ? (
                                            <p className={styles.roleHint}>لا يوجد مطعم مرتبط بهذا المدير حالياً.</p>
                                        ) : account.role === "CUSTOMER" ? (
                                            <p className={styles.roleHint}>حسابات العملاء تخص جانب الحجز ولا يفترض أن تستخدم واجهة الإدارة الداخلية على الويب.</p>
                                        ) : (
                                            <p className={styles.roleHint}>هذا حساب تشغيلي على مستوى المنصة ولا يحتاج إلى ربط مباشر مع مطعم.</p>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            <aside className={styles.asideStack}>
                <section className={`${styles.sectionCard} surface`}>
                    <div className={styles.sectionHeading}>
                        <h2>فحوصات المستخدمين</h2>
                        <p>هذه الصفحة مخصصة لمراجعة الحسابات كما هي حالياً بدون إضافة ميزات تعديل جديدة.</p>
                    </div>

                    <div className={styles.checkList}>
                        <div className={styles.checkItem}>{data.users.length} إجمالي الحسابات الحالية</div>
                        <div className={styles.checkItem}>{data.restaurantAdmins.length} حسابات مدير مطعم</div>
                        <div className={styles.checkItem}>العرض يعتمد على GET /users وربط الملكية الحالي مع /restaurants</div>
                    </div>
                </section>
            </aside>
        </section>
    );
}

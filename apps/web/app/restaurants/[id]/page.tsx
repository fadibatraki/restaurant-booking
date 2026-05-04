import Link from "next/link";
import { PublicLayout } from "../../_components/area-shells";
import styles from "./page.module.css";

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

type RestaurantTable = {
    id: string;
    name: string;
    capacity: number;
    isActive: boolean;
    restaurantId: string;
    createdAt: string;
};

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3000";

const displayLocale = "ar-SY-u-nu-latn";

export const dynamic = "force-dynamic";

function formatHours(openTime: string | null, closeTime: string | null) {
    if (!openTime && !closeTime) {
        return "تُعرض ساعات العمل بعد تفعيل الحجز";
    }

    if (openTime && closeTime) {
        return `${openTime} - ${closeTime}`;
    }

    return openTime ?? closeTime ?? "تُعرض ساعات العمل بعد تفعيل الحجز";
}

async function getRestaurant(id: string) {
    const url = new URL(`/restaurants/${id}`, apiBaseUrl);

    try {
        const response = await fetch(url.toString(), {
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            return {
                error:
                    response.status === 404
                        ? "تعذر العثور على هذا المطعم."
                        : "تعذر تحميل بيانات هذا المطعم حالياً.",
                restaurant: null as Restaurant | null,
            };
        }

        const data = (await response.json()) as unknown;

        if (!data || Array.isArray(data)) {
            return {
                error: "وصلت استجابة غير متوقعة لبيانات هذا المطعم.",
                restaurant: null as Restaurant | null,
            };
        }

        return {
            error: null,
            restaurant: data as Restaurant,
        };
    } catch {
        return {
            error: "خدمة المطاعم غير متاحة حالياً. تحقق من الواجهة الخلفية ثم حاول مرة أخرى.",
            restaurant: null as Restaurant | null,
        };
    }
}

async function getRestaurantTables(id: string) {
    const url = new URL(`/restaurants/${id}/tables`, apiBaseUrl);

    try {
        const response = await fetch(url.toString(), {
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            return {
                error: "تعذر تحميل طاولات هذا المطعم حالياً.",
                tables: [] as RestaurantTable[],
            };
        }

        const data = (await response.json()) as unknown;

        if (!Array.isArray(data)) {
            return {
                error: "وصلت استجابة غير متوقعة لقسم الطاولات.",
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

export default async function RestaurantDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const [{ restaurant, error: restaurantError }, { tables, error: tablesError }] = await Promise.all([
        getRestaurant(id),
        getRestaurantTables(id),
    ]);

    if (!restaurant) {
        return (
            <PublicLayout currentPath="/restaurants">
                <div className={styles.page}>
                    <main className={`container ${styles.stack}`}>
                        <Link href="/restaurants" className={`button-ghost ${styles.backLink}`}>
                            العودة إلى المطاعم
                        </Link>

                        <section className={`${styles.stateCard} surface`}>
                            <span className={styles.stateEyebrow}>المطعم غير متاح</span>
                            <h1>تعذر فتح صفحة هذا المطعم.</h1>
                            <p>{restaurantError}</p>
                            <div className={styles.stateActions}>
                                <Link href="/restaurants" className="button-primary">
                                    استعرض المطاعم
                                </Link>
                            </div>
                        </section>
                    </main>
                </div>
            </PublicLayout>
        );
    }

    return (
        <PublicLayout currentPath="/restaurants">
            <div className={styles.page}>
                <main className={`container ${styles.stack}`}>
                    <Link href="/restaurants" className={`button-ghost ${styles.backLink}`}>
                        العودة إلى المطاعم
                    </Link>

                    <section className={`${styles.hero} surface-alt`}>
                        <div className={styles.heroContent}>
                            <span className={styles.eyebrow}>تفاصيل المطعم</span>
                            <h1>{restaurant.name}</h1>
                            <p className={styles.heroCopy}>
                                {restaurant.description ||
                                    "تجربة مطعم أنيقة بضيافة دافئة وخدمة مدروسة ومساحة مهيأة لحجوزات لا تُنسى."}
                            </p>

                            <div className={styles.heroHighlights}>
                                <span className={styles.heroPill}>{formatHours(restaurant.openTime, restaurant.closeTime)}</span>
                                <span className={styles.heroPill}>{restaurant.address}</span>
                                <span className={styles.heroPill}>{restaurant.phone || "الهاتف يُعرض بعد تأكيد الحجز"}</span>
                            </div>
                        </div>
                    </section>

                    <section className={styles.overviewGrid}>
                        <section className={`${styles.sectionCard} surface`}>
                            <div className={styles.sectionHeading}>
                                <h2>عن المطعم</h2>
                                <p>لمحة سريعة تساعدك على فهم أجواء المطعم قبل الانتقال إلى معاينة الطاولات المتاحة.</p>
                            </div>

                            <div className={styles.aboutCopy}>
                                <p>
                                    {restaurant.description ||
                                        "لم تتم إضافة وصف تفصيلي بعد. يمكنك الاعتماد على معلومات الموقع والتواصل ومعاينة الطاولات الحالية لفهم هذا المطعم بشكل أفضل."}
                                </p>
                            </div>
                        </section>

                        <section className={`${styles.sectionCard} surface`}>
                            <div className={styles.sectionHeading}>
                                <h2>الموقع والتواصل</h2>
                                <p>المعلومات العملية الأساسية كما تظهر في السجل العام الحالي.</p>
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
                                    <dt>ساعات العمل</dt>
                                    <dd>{formatHours(restaurant.openTime, restaurant.closeTime)}</dd>
                                </div>
                                <div className={styles.infoItem}>
                                    <dt>تاريخ الإضافة</dt>
                                    <dd>
                                        {new Intl.DateTimeFormat(displayLocale, {
                                            month: "long",
                                            day: "numeric",
                                            year: "numeric",
                                        }).format(new Date(restaurant.createdAt))}
                                    </dd>
                                </div>
                            </dl>
                        </section>
                    </section>

                    <section className={`${styles.sectionCard} surface`}>
                        <div className={styles.sectionHeading}>
                            <h2>معاينة الطاولات</h2>
                            <p>معاينة عامة للطاولات الحالية وسعاتها وحالتها كما يعرضها مسار الطاولات لهذا المطعم.</p>
                        </div>

                        {tablesError ? (
                            <section className={`${styles.stateCard} surface-alt`}>
                                <span className={styles.stateEyebrow}>الطاولات غير متاحة</span>
                                <p>{tablesError}</p>
                            </section>
                        ) : tables.length === 0 ? (
                            <section className={`${styles.stateCard} surface-alt`}>
                                <span className={styles.stateEyebrow}>لا توجد طاولات</span>
                                <p>لا توجد طاولات منشورة حالياً لهذا المطعم.</p>
                            </section>
                        ) : (
                            <div className={styles.tablesGrid}>
                                {tables.map((table) => (
                                    <article key={table.id} className={`${styles.tableCard} surface-alt`}>
                                        <div className={styles.tableTop}>
                                            <div>
                                                <p className={styles.cardEyebrow}>طاولة متاحة</p>
                                                <p className={styles.tableName}>{table.name}</p>
                                            </div>
                                            <span className={styles.tableBadge}>{table.capacity} ضيوف</span>
                                        </div>

                                        <dl className={styles.tableMeta}>
                                            <dt>الحالة</dt>
                                            <dd>
                                                <span
                                                    className={`${styles.statusBadge} ${table.isActive ? "" : styles.statusMuted
                                                        }`}
                                                >
                                                    {table.isActive ? "نشطة للحجز" : "غير نشطة"}
                                                </span>
                                            </dd>
                                        </dl>

                                        <dl className={styles.tableMeta}>
                                            <dt>تاريخ الإضافة</dt>
                                            <dd>
                                                {new Intl.DateTimeFormat(displayLocale, {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                }).format(new Date(table.createdAt))}
                                            </dd>
                                        </dl>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </PublicLayout>
    );
}

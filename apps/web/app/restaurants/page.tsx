import Link from "next/link";
import { Suspense } from "react";
import { PublicLayout } from "../_components/area-shells";
import styles from "./page.module.css";
import { RestaurantsSearch } from "../restaurants-search";

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

type SearchParams = {
    notice?: string | string[];
    q?: string | string[];
};

type PageProps = {
    searchParams?: Promise<SearchParams>;
};

const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3000";

const displayLocale = "ar-SY-u-nu-latn";

export const dynamic = "force-dynamic";

async function getRestaurants(query: string) {
    const url = new URL("/restaurants", apiBaseUrl);

    if (query) {
        url.searchParams.set("q", query);
    }

    try {
        const response = await fetch(url.toString(), {
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
            error: "خدمة المطاعم غير متاحة حالياً. تحقق من الواجهة الخلفية ثم حاول مرة أخرى.",
            restaurants: [] as Restaurant[],
        };
    }
}

function formatHours(openTime: string | null, closeTime: string | null) {
    if (!openTime && !closeTime) {
        return "تُعرض ساعات العمل بعد تفعيل الحجز";
    }

    if (openTime && closeTime) {
        return `${openTime} - ${closeTime}`;
    }

    return openTime ?? closeTime ?? "تُعرض ساعات العمل بعد تفعيل الحجز";
}

function SearchSummary({ query }: { query: string }) {
    return query ? (
        <p className={styles.resultSummary}>
            عرض النتائج الخاصة بـ <span className="text-main">«{query}»</span>
        </p>
    ) : (
        <p className={styles.resultSummary}>
            ابحث عن مطعم مناسب ثم افتح صفحته للتفاصيل.
        </p>
    );
}

function LoadingCards() {
    return (
        <div className={styles.grid} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
                <article key={index} className={`${styles.card} surface`}>
                    <div className={styles.cardTop}>
                        <div>
                            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
                            <div className={`${styles.skeletonLine} ${styles.skeletonBadge}`} />
                        </div>
                        <div className={`${styles.skeletonLine} ${styles.skeletonBadge}`} />
                    </div>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonBody}`} />
                    <div className={styles.metaList}>
                        <div className={`${styles.skeletonLine} ${styles.skeletonMeta}`} />
                        <div className={`${styles.skeletonLine} ${styles.skeletonMeta}`} />
                        <div className={`${styles.skeletonLine} ${styles.skeletonMeta}`} />
                    </div>
                    <div className={styles.cardFooter}>
                        <div className={`${styles.skeletonLine} ${styles.skeletonButton}`} />
                    </div>
                </article>
            ))}
        </div>
    );
}

async function RestaurantsResults({ query }: { query: string }) {
    const { restaurants, error } = await getRestaurants(query);

    if (error) {
        return (
            <section className={`${styles.stateCard} surface`}>
                <span className={styles.stateEyebrow}>مشكلة في الخدمة</span>
                <h2>قائمة المطاعم غير متاحة مؤقتاً.</h2>
                <p>{error}</p>
                <div className={styles.stateActions}>
                    <Link href="/restaurants" className="button-secondary">
                        إعادة تعيين البحث
                    </Link>
                </div>
            </section>
        );
    }

    if (restaurants.length === 0) {
        return (
            <section className={`${styles.stateCard} ${styles.emptyState} surface-alt`}>
                <span className={styles.stateEyebrow}>لا توجد نتائج</span>
                <h2>لا توجد مطاعم مطابقة.</h2>
                <p>جرّب اسماً أو موقعاً آخر.</p>
                <div className={styles.stateActions}>
                    <Link href="/restaurants" className="button-primary">
                        استعرض جميع المطاعم
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <div className={styles.sectionStack}>
            <div className={styles.resultBar}>
                <p className={styles.resultCount}>
                    <span className="text-main">{restaurants.length}</span> مطعم
                </p>
            </div>

            <div className={styles.grid}>
                {restaurants.map((restaurant) => (
                    <article key={restaurant.id} className={`${styles.card} ${styles.cardLift} surface`}>
                        <div className={styles.cardTop}>
                            <div>
                                <p className={styles.cardEyebrow}>تجربة ضيافة راقية</p>
                                <h2 className={styles.cardTitle}>{restaurant.name}</h2>
                            </div>
                            <span className={styles.cardBadge}>{formatHours(restaurant.openTime, restaurant.closeTime)}</span>
                        </div>

                        <p className={styles.cardDescription}>
                            {restaurant.description ||
                                "تجربة مطعم أنيقة بضيافة دافئة وتفاصيل مدروسة بعناية."}
                        </p>

                        <dl className={styles.metaList}>
                            <div className={styles.metaItem}>
                                <dt>العنوان</dt>
                                <dd>{restaurant.address}</dd>
                            </div>
                            <div className={styles.metaItem}>
                                <dt>الهاتف</dt>
                                <dd>{restaurant.phone || "يُعرض بعد تأكيد الحجز"}</dd>
                            </div>
                            <div className={styles.metaItem}>
                                <dt>تاريخ الإضافة</dt>
                                <dd>
                                    {new Intl.DateTimeFormat(displayLocale, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    }).format(new Date(restaurant.createdAt))}
                                </dd>
                            </div>
                        </dl>

                        <div className={styles.cardFooter}>
                            <Link href={`/restaurants/${restaurant.id}`} className="button-secondary" prefetch={false}>
                                عرض المطعم
                            </Link>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}

export default async function RestaurantsPage({ searchParams }: PageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const queryValue = resolvedSearchParams?.q;
    const query = typeof queryValue === "string" ? queryValue.trim() : "";
    const notice = resolvedSearchParams?.notice;
    const showOwnerOnlyNotice = notice === "owner-only";

    return (
        <PublicLayout currentPath="/restaurants">
            <div className={styles.page}>
                <header className={`container ${styles.heroWrap}`}>
                    <section className={`${styles.hero} surface-alt`}>
                        <div className={styles.heroText}>
                            <span className={styles.kicker}>استكشاف المطاعم</span>
                            <h1>اكتشف المطاعم المتاحة للحجز.</h1>
                            <p>
                                صفحة بحث مباشرة تعرض النتائج الحية من بيانات المطاعم الحالية وتوصلك سريعاً إلى تفاصيل كل مطعم.
                            </p>
                        </div>

                        <div className={`${styles.searchPanel} surface`}>
                            <RestaurantsSearch initialQuery={query} />
                        </div>
                    </section>
                </header>

                <main className={`container ${styles.content}`}>
                    {showOwnerOnlyNotice ? (
                        <section className={`${styles.noticeCard} surface`}>
                            <span className={styles.noticeEyebrow}>وصول إداري فقط</span>
                            <h2>لوحة الإدارة متاحة فقط لمديري المطاعم والمشرفين العامين.</h2>
                            <p>
                                تمت إعادتك إلى صفحة استكشاف المطاعم العامة لأن هذا الحساب لا يملك صلاحية الوصول الإداري.
                            </p>
                        </section>
                    ) : null}

                    <SearchSummary query={query} />
                    <Suspense key={query} fallback={<LoadingCards />}>
                        <RestaurantsResults query={query} />
                    </Suspense>
                </main>
            </div>
        </PublicLayout>
    );
}

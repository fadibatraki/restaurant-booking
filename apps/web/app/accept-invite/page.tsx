import { cookies } from "next/headers";
import Link from "next/link";
import {
    getSessionAreaContext,
    PublicLayout,
} from "../_components/area-shells";
import { resolveRoleHomePath } from "../_components/role-routing";
import { AcceptInviteForm } from "./accept-invite-form";
import styles from "../login/page.module.css";

const authCookieName = "restaurant_booking_access_token";
const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "http://localhost:3000";

const displayLocale = "ar-SY-u-nu-latn";

type InvitationRecord = {
    email: string;
    role: string;
    expiresAt: string;
    restaurant: {
        id: string;
        name: string;
    } | null;
};

type PageProps = {
    searchParams?: Promise<{
        token?: string | string[];
    }>;
};

async function getInvitation(token: string) {
    try {
        const response = await fetch(new URL(`/invitations/token/${token}`, apiBaseUrl), {
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        });

        const data = (await response.json().catch(() => null)) as
            | InvitationRecord
            | { message?: string | string[] }
            | null;

        if (!response.ok) {
            const errorData = data as { message?: string | string[] } | null;
            const message = Array.isArray(errorData?.message)
                ? errorData.message[0]
                : errorData?.message || "هذه الدعوة لم تعد صالحة.";

            return {
                invitation: null as InvitationRecord | null,
                error: message,
            };
        }

        if (!data || Array.isArray(data)) {
            return {
                invitation: null as InvitationRecord | null,
                error: "وصلت استجابة غير متوقعة للدعوة.",
            };
        }

        return {
            invitation: data as InvitationRecord,
            error: null,
        };
    } catch {
        return {
            invitation: null as InvitationRecord | null,
            error: "خدمة الدعوات غير متاحة حالياً. حاول مرة أخرى بعد قليل.",
        };
    }
}

export default async function AcceptInvitePage({ searchParams }: PageProps) {
    const cookieStore = await cookies();
    const activeSessionToken = cookieStore.get(authCookieName)?.value;
    const hasActiveSession = Boolean(activeSessionToken);
    const session = await getSessionAreaContext();
    const currentAreaHref = resolveRoleHomePath(session.user?.role);

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const inviteToken =
        typeof resolvedSearchParams?.token === "string" ? resolvedSearchParams.token.trim() : "";

    if (!inviteToken) {
        return (
            <PublicLayout currentPath="/accept-invite" internalUserBehavior="allow">
                <div className={styles.page}>
                    <main className={`container ${styles.layout}`}>
                        <section className={`${styles.hero} surface-alt`}>
                            <span className={styles.eyebrow}>الدعوة مطلوبة</span>
                            <div className={styles.heroCopy}>
                                <h1>استخدم رابط دعوة صالحاً لإكمال إعداد الحساب.</h1>
                                <p>
                                    تفعيل مدير المطعم يتم عبر الدعوة. افتح الرابط الذي شاركه معك المشرف العام للمتابعة.
                                </p>
                            </div>
                        </section>

                        <section className={`${styles.panel} surface`}>
                            <div className={styles.panelHeader}>
                                <h2>لم يتم العثور على رمز الدعوة</h2>
                                <p>اطلب رابط دعوة جديداً من المشرف العام، أو ارجع إلى صفحة تسجيل الدخول إذا كانت لديك بيانات الاعتماد بالفعل.</p>
                            </div>

                            <Link href="/login?source=public" className={`button-primary ${styles.footerLink}`}>
                                العودة إلى تسجيل الدخول
                            </Link>
                        </section>
                    </main>
                </div>
            </PublicLayout>
        );
    }

    const { invitation, error } = await getInvitation(inviteToken);

    return (
        <PublicLayout currentPath="/accept-invite" internalUserBehavior="allow">
            <div className={styles.page}>
                <main className={`container ${styles.layout}`}>
                    <section className={`${styles.hero} surface-alt`}>
                        <span className={styles.eyebrow}>إكمال الدعوة</span>
                        <div className={styles.heroCopy}>
                            <h1>أكمل إعداد حساب مدير المطعم.</h1>
                            <p>
                                تكمل هذه الدعوة أول مسار فعلي لتفعيل مديري المطاعم عبر الدعوات. لا يوجد تسجيل إداري عام مفتوح.
                            </p>
                        </div>

                        <div className={styles.featureList}>
                            <article className={`${styles.featureItem} surface`}>
                                <h2>الدور</h2>
                                <p>{invitation?.role === "RESTAURANT_ADMIN" ? "مدير مطعم" : invitation?.role ?? "غير متاح"}</p>
                            </article>
                            <article className={`${styles.featureItem} surface`}>
                                <h2>المطعم</h2>
                                <p>{invitation?.restaurant?.name ?? "سيتم ربط المطعم لاحقاً إذا لزم الأمر."}</p>
                            </article>
                            <article className={`${styles.featureItem} surface`}>
                                <h2>تنتهي في</h2>
                                <p>
                                    {invitation
                                        ? new Intl.DateTimeFormat(displayLocale, {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                        }).format(new Date(invitation.expiresAt))
                                        : "غير متاح"}
                                </p>
                            </article>
                        </div>
                    </section>

                    <section className={`${styles.panel} surface`}>
                        {error || !invitation ? (
                            <>
                                <div className={styles.panelHeader}>
                                    <h2>الدعوة غير متاحة</h2>
                                    <p>{error ?? "هذه الدعوة غير متاحة بعد الآن."}</p>
                                </div>

                                <Link href="/login?source=public" className={`button-primary ${styles.footerLink}`}>
                                    العودة إلى تسجيل الدخول
                                </Link>
                            </>
                        ) : hasActiveSession ? (
                            <>
                                <div className={styles.panelHeader}>
                                    <h2>سجّل الخروج قبل قبول هذه الدعوة</h2>
                                    <p>
                                        توجد جلسة إدارية نشطة بالفعل في هذا المتصفح. للحفاظ على مسار التفعيل مستقلاً، سجّل الخروج أولاً ثم افتح رابط الدعوة من جديد لإكمال إعداد الحساب الخاص بـ {invitation.email}.
                                    </p>
                                </div>

                                <div className={styles.featureList}>
                                    <article className={`${styles.featureItem} surface-alt`}>
                                        <h2>سبب إيقاف المتابعة</h2>
                                        <p>
                                            قبول الدعوة ينشئ أو يكمل حساب مدير مطعم محدد. استخدام جلسة إدارية قائمة هنا سيخلط بين التصفح الإداري الطبيعي ومسار التفعيل.
                                        </p>
                                    </article>
                                </div>

                                <form action="/api/auth/logout" method="post">
                                    <button type="submit" className="button-primary">
                                        تسجيل الخروج والمتابعة لاحقاً
                                    </button>
                                </form>
                            </>
                        ) : (
                            <>
                                <div className={styles.panelHeader}>
                                    <h2>أنشئ كلمة المرور</h2>
                                    <p>
                                        أكمل إعداد الحساب الخاص بـ {invitation.email} ثم تابع إلى صفحة تسجيل الدخول.
                                    </p>
                                </div>

                                <AcceptInviteForm email={invitation.email} token={inviteToken} />

                                <Link href="/login?source=public" className={`button-ghost ${styles.footerLink}`}>
                                    العودة إلى تسجيل الدخول
                                </Link>
                            </>
                        )}
                    </section>
                </main>
            </div>
        </PublicLayout>
    );
}
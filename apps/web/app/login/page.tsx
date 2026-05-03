import Link from "next/link";
import { redirect } from "next/navigation";
import {
    getSessionAreaContext,
    PublicLayout,
    resolveAreaHrefForRole,
} from "../_components/area-shells";
import { resolveRoleHomePath } from "../_components/role-routing";
import { LoginForm } from "./login-form";
import styles from "./page.module.css";

type PageProps = {
    searchParams?: Promise<{
        email?: string | string[];
        next?: string | string[];
        source?: string | string[];
    }>;
};

function resolveRedirectPath(nextValue: string | string[] | undefined) {
    const candidate = typeof nextValue === "string" ? nextValue : "/owner";

    if (!candidate.startsWith("/") || candidate.startsWith("//")) {
        return "/owner";
    }

    return candidate;
}

export default async function LoginPage({ searchParams }: PageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const redirectTo = resolveRedirectPath(resolvedSearchParams?.next);
    const initialEmail =
        typeof resolvedSearchParams?.email === "string"
            ? resolvedSearchParams.email.trim().toLowerCase()
            : "";
    const session = await getSessionAreaContext();

    if (session.user) {
        const destination =
            session.kind === "owner" || session.kind === "admin"
                ? resolveAreaHrefForRole(session.user.role, redirectTo)
                : resolveRoleHomePath(session.user.role);

        redirect(destination);
    }

    return (
        <PublicLayout currentPath="/login">
            <div className={styles.page}>
                <main className={`container ${styles.layout}`}>
                    <section className={`${styles.hero} surface-alt`}>
                        <span className={styles.eyebrow}>تسجيل الدخول</span>
                        <div className={styles.heroCopy}>
                            <h1>سجّل الدخول إلى حساب الإدارة.</h1>
                            <p>
                                صفحة الدخول مخصصة لمديري المطاعم والمشرفين العامين، وتتصل مباشرة بالمسار الحالي في الخلفية مع حفظ الجلسة في ملف ارتباط آمن.
                            </p>
                        </div>

                        <div className={styles.featureList}>
                            <article className={`${styles.featureItem} surface`}>
                                <h2>النطاق الحالي</h2>
                                <p>تسجيل الدخول ثم الانتقال مباشرة إلى صفحة الإدارة المناسبة.</p>
                            </article>
                            <article className={`${styles.featureItem} surface`}>
                                <h2>إدارة الجلسة</h2>
                                <p>يبقى رمز الوصول بعيداً عن حالة المتصفح المباشرة عبر تخزينه في ملف ارتباط لا يمكن الوصول إليه من الجافاسكربت.</p>
                            </article>
                            <article className={`${styles.featureItem} surface`}>
                                <h2>جاهز للخطوة التالية</h2>
                                <p>بعد نجاح الدخول سيتم تحويلك إلى المسار الإداري المحمي حتى تتابع العمل من اللوحات الحالية.</p>
                            </article>
                        </div>
                    </section>

                    <section className={`${styles.panel} surface`}>
                        <div className={styles.panelHeader}>
                            <h2>تسجيل الدخول</h2>
                            <p>استخدم بيانات الاعتماد نفسها التي يستقبلها مسار تسجيل الدخول الحالي في الخلفية.</p>
                        </div>

                        <LoginForm initialEmail={initialEmail} redirectTo={redirectTo} />

                        <Link href="/register" className={`button-ghost ${styles.footerLink}`}>
                            هل تحتاج إلى وصول؟ يتم الإعداد عبر دعوة
                        </Link>
                    </section>
                </main>
            </div>
        </PublicLayout>
    );
}
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    getSessionAreaContext,
    PublicLayout,
} from "../_components/area-shells";
import { resolveRoleHomePath } from "../_components/role-routing";
import styles from "../login/page.module.css";

export default async function RegisterPage() {
    const session = await getSessionAreaContext();

    if (session.user) {
        redirect(resolveRoleHomePath(session.user.role));
    }

    return (
        <PublicLayout currentPath="/register">
            <div className={styles.page}>
                <main className={`container ${styles.layout}`}>
                    <section className={`${styles.hero} surface-alt`}>
                        <span className={styles.eyebrow}>وصول عبر الدعوة فقط</span>
                        <div className={styles.heroCopy}>
                            <h1>يتم إعداد حسابات مديري المطاعم عبر الدعوات.</h1>
                            <p>
                                جانب الإدارة في حجز المطاعم ليس مسار تسجيل عام مفتوح. يمنح المشرف العام حسابات مديري المطاعم عبر الدعوات، ثم يكمل المدير المدعو إعداد حسابه لاحقاً.
                            </p>
                        </div>

                        <div className={styles.featureList}>
                            <article className={`${styles.featureItem} surface`}>
                                <h2>كيف يتم منح الوصول</h2>
                                <p>يرسل المشرف العام دعوة إلى مدير المطعم عبر البريد الإلكتروني بدلاً من فتح إنشاء الحسابات للجميع.</p>
                            </article>
                            <article className={`${styles.featureItem} surface`}>
                                <h2>واجهة إدارية فقط</h2>
                                <p>تبقى منطقة الإدارة المحمية مخصصة لمديري المطاعم والمشرفين العامين بعد تفعيل الحساب عبر الدعوة.</p>
                            </article>
                            <article className={`${styles.featureItem} surface`}>
                                <h2>الخطوة التالية</h2>
                                <p>إذا وصلك رابط دعوة بالفعل، افتحه لإكمال إعداد الحساب. أما إذا كانت بياناتك جاهزة، فانتقل مباشرة إلى صفحة الدخول الحالية.</p>
                            </article>
                        </div>
                    </section>

                    <section className={`${styles.panel} surface`}>
                        <div className={styles.panelHeader}>
                            <h2>اطلب الوصول أو أكمل التفعيل</h2>
                            <p>
                                إذا كنت تحتاج إلى إدارة مطعم، تواصل مع المشرف العام أو انتظر رسالة الدعوة. وإذا كانت لديك بيانات الاعتماد بالفعل، فارجع إلى صفحة تسجيل الدخول.
                            </p>
                        </div>

                        <div className={styles.featureList}>
                            <article className={`${styles.featureItem} surface-alt`}>
                                <h2>مديرو المطاعم</h2>
                                <p>يتم إنشاء حسابات مديري المطاعم لمطاعم محددة عبر دعوة من المشرف العام، وليس عبر تسجيل ذاتي عام.</p>
                            </article>
                            <article className={`${styles.featureItem} surface-alt`}>
                                <h2>المشرفون العامون</h2>
                                <p>يتم منح وصول المشرف العام داخلياً، ويبقى خارج تجربة التسجيل العامة على الويب.</p>
                            </article>
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
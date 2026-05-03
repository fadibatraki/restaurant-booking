import Link from "next/link";
import { PublicLayout } from "./_components/area-shells";
import styles from "./home.module.css";

const trustItems = [
  { value: "بحث مباشر", label: "وصول سريع إلى صفحة المطعم المناسبة" },
  { value: "تجربة عربية", label: "واجهة واضحة من الاستكشاف حتى الإدارة" },
  { value: "تنقل منظّم", label: "مسارات أبسط بين الصفحة العامة والتفاصيل" },
];

const steps = [
  {
    title: "استعرض المطاعم",
    description: "ابدأ من صفحة المطاعم العامة وابحث باسم المطعم أو المدينة أو الحي من واجهة مباشرة وواضحة.",
  },
  {
    title: "افتح التفاصيل المناسبة",
    description: "راجع نبذة المطعم والطاولات المنشورة والمعلومات الأساسية من صفحة مركزة وسهلة القراءة.",
  },
  {
    title: "انتقل حسب دورك",
    description: "إن كنت زائراً واصل التصفح، وإن كنت مديراً فادخل إلى صفحة الإدارة المناسبة من نفس التجربة العامة.",
  },
];

const benefits = [
  {
    title: "واجهة أهدأ وأوضح",
    description: "الصفحة الرئيسية أصبحت تمهّد مباشرة لاكتشاف المطاعم بدلاً من توزيع الانتباه على رسائل عامة كثيرة.",
  },
  {
    title: "تجربة متصلة مع بقية المنتج",
    description: "لغة الواجهة ومسار التنقل ينسجمان الآن مع صفحة المطاعم والملخصات الإدارية الجديدة.",
  },
  {
    title: "وصول مناسب لكل مستخدم",
    description: "الزائر يبدأ من الاستكشاف، ومدير المطعم أو المشرف العام يصل إلى تسجيل الدخول من دون تعقيد.",
  },
];

export default function Home() {
  return (
    <PublicLayout currentPath="/">
      <div className={styles.page}>
        <main className="container">
          <div className={styles.stack}>
            <section className={`${styles.hero} surface-alt`}>
              <div className={styles.heroContent}>
                <span className={styles.kicker}>حجز المطاعم</span>
                <div className={styles.content}>
                  <h1>اكتشف المطاعم من واجهة أوضح وأهدأ.</h1>
                  <p>
                    الصفحة الرئيسية أصبحت نقطة بداية مباشرة لتصفح المطاعم، فتح التفاصيل المناسبة، ثم الانتقال السلس إلى صفحة الإدارة عند الحاجة. كل شيء مصمم ليبدو منظماً وواضحاً من أول خطوة.
                  </p>
                </div>

                <div className={styles.actions}>
                  <Link href="/restaurants" className="button-primary">
                    استعرض المطاعم
                  </Link>
                  <Link href="/login?source=public" className="button-secondary">
                    تسجيل الدخول
                  </Link>
                </div>

                <p className={styles.authNote}>
                  هل تدير الجانب التشغيلي للمطعم؟ استخدم
                  {" "}
                  <Link href="/login?source=public" className={styles.authLink}>
                    تسجيل الدخول
                  </Link>
                  {" "}
                  للوصول إلى صفحة الإدارة المناسبة. يتم منح وصول مدير المطعم عبر دعوة من المشرف العام.
                </p>
              </div>

              <aside className={`${styles.heroPanel} surface`}>
                <span className={styles.panelEyebrow}>تجربة عامة مركزة</span>
                <h2>ابدأ من المكان الصحيح داخل المنتج.</h2>
                <p>
                  بدل الصفحة التسويقية العامة، تعرض الواجهة الآن مساراً عملياً: تصفح، افتح المطعم، ثم واصل رحلتك حسب دورك داخل المنصة.
                </p>

                <dl className={styles.heroDetails}>
                  <div>
                    <dt>للباحث عن مطعم</dt>
                    <dd>وصول مباشر إلى صفحة المطاعم والتفاصيل المنشورة.</dd>
                  </div>
                  <div>
                    <dt>للمدير أو المشرف</dt>
                    <dd>مدخل واضح إلى تسجيل الدخول دون تشتيت في الصفحة العامة.</dd>
                  </div>
                </dl>
              </aside>
            </section>

            <section className={styles.trustSection} aria-label="مؤشرات الثقة">
              {trustItems.map((item) => (
                <article key={item.value} className={`${styles.trustCard} surface`}>
                  <strong className={styles.trustValue}>{item.value}</strong>
                  <p>{item.label}</p>
                </article>
              ))}
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionEyebrow}>كيف تعمل التجربة</span>
                <h2>ثلاث خطوات بسيطة من الصفحة الرئيسية حتى الإجراء المناسب.</h2>
                <p>الصفحة تعكس الآن نفس البساطة الموجودة في صفحة المطاعم والملخصات الجديدة داخل المنتج.</p>
              </div>

              <div className={styles.stepsGrid}>
                {steps.map((step, index) => (
                  <article key={step.title} className={`${styles.stepCard} surface-alt`}>
                    <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionEyebrow}>لماذا هذه الواجهة</span>
                <h2>واجهة عامة أقرب إلى المنتج من التسويق.</h2>
                <p>التركيز هنا على الوضوح، التنقل السريع، وتوحيد اللغة مع بقية المسارات العامة والإدارية.</p>
              </div>

              <div className={styles.benefitsGrid}>
                {benefits.map((benefit) => (
                  <article key={benefit.title} className={`${styles.benefitCard} surface`}>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={`${styles.finalCta} surface-alt`}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionEyebrow}>ابدأ الآن</span>
                <h2>تصفح المطاعم أولاً، ثم تابع رحلتك من داخل المنصة.</h2>
                <p>استخدم شريط التنقل العلوي للانتقال بين الصفحة الرئيسية والمطاعم وتسجيل الدخول، بينما تبقى هذه الصفحة مخصصة لفهم المنتج بسرعة وهدوء.</p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </PublicLayout>
  );
}

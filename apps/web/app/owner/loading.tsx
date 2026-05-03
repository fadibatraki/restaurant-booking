import styles from "./page.module.css";

export default function Loading() {
    return (
        <main className={`container ${styles.page} ${styles.stack}`}>
            <div className={`${styles.skeletonLine} ${styles.skeletonBackLink}`} />

            <section className={`${styles.hero} surface-alt`} aria-hidden="true">
                <div className={styles.heroContent}>
                    <div className={`${styles.skeletonLine} ${styles.skeletonEyebrow}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
                </div>

                <div className={`${styles.heroAside} surface`}>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonStat}`} />
                    <div className={`${styles.skeletonBlock} ${styles.skeletonStat}`} />
                    <div className={`${styles.skeletonBlock} ${styles.skeletonStat}`} />
                </div>
            </section>

            <section className={styles.dashboardGrid} aria-hidden="true">
                <div className={`${styles.sectionCard} surface`}>
                    <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
                    <div className={`${styles.skeletonBlock} ${styles.skeletonPanel}`} />
                    <div className={`${styles.skeletonBlock} ${styles.skeletonReservation}`} />
                    <div className={`${styles.skeletonBlock} ${styles.skeletonReservation}`} />
                </div>

                <div className={styles.asideStack}>
                    <div className={`${styles.sectionCard} surface`}>
                        <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
                        <div className={`${styles.skeletonBlock} ${styles.skeletonPanel}`} />
                    </div>
                    <div className={`${styles.sectionCard} surface`}>
                        <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
                        <div className={`${styles.skeletonBlock} ${styles.skeletonPanel}`} />
                    </div>
                </div>
            </section>
        </main>
    );
}
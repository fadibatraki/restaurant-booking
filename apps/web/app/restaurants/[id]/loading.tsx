import styles from "./page.module.css";

export default function Loading() {
  return (
    <div className={`app-shell ${styles.page}`}>
      <main className={`container ${styles.stack}`}>
        <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />

        <section className={`${styles.hero} surface-alt`} aria-hidden="true">
          <div className={styles.heroContent}>
            <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
          </div>

          <div className={`${styles.heroMeta} surface`}>
            <div className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} />
          </div>
        </section>

        <section className={styles.contentGrid} aria-hidden="true">
          <div className={`${styles.sectionCard} surface`}>
            <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} />
          </div>

          <div className={`${styles.highlightCard} surface`}>
            <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} />
          </div>
        </section>

        <section className={`${styles.sectionCard} surface`} aria-hidden="true">
          <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
          <div className={styles.tablesGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`${styles.skeletonBlock} ${styles.skeletonTable}`} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
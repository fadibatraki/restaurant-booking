import { OwnerNotificationCenter } from "./owner-notification-center.client";
import styles from "./area-shells.module.css";

export function OwnerAreaHeader() {
    return (
        <header className={styles.ownerHeader}>
            <div className={styles.ownerHeaderInner}>
                <div className={styles.ownerHeaderActions}>
                    <OwnerNotificationCenter />
                </div>
            </div>
        </header>
    );
}

"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

type InvitationLinkFieldProps = {
    token: string;
};

export function InvitationLinkField({ token }: InvitationLinkFieldProps) {
    const [feedback, setFeedback] = useState<string | null>(null);
    const inviteLink = useMemo(() => {
        if (typeof window === "undefined") {
            return `/accept-invite?token=${encodeURIComponent(token)}`;
        }

        return `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`;
    }, [token]);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setFeedback("تم النسخ");
        } catch {
            setFeedback("فشل النسخ");
        }
    }

    return (
        <div className={styles.invitationLinkField}>
            <input value={inviteLink} readOnly aria-label="رابط الدعوة" className="force-ltr" />
            <button type="button" className="button-ghost" onClick={handleCopy}>
                نسخ الرابط
            </button>
            {feedback ? <span className={styles.copyFeedback}>{feedback}</span> : null}
        </div>
    );
}
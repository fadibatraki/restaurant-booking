"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import styles from "./page.module.css";

type RestaurantOption = {
    id: string;
    name: string;
};

type InvitationCreateFormProps = {
    restaurants: RestaurantOption[];
};

type CreateInvitationResponse = {
    email: string;
    token: string;
};

function isCreateInvitationResponse(
    value: ({ message?: string } & Partial<CreateInvitationResponse>) | { message?: string } | null,
): value is { message?: string } & CreateInvitationResponse {
    return Boolean(
        value &&
        typeof value === "object" &&
        "email" in value &&
        typeof value.email === "string" &&
        "token" in value &&
        typeof value.token === "string",
    );
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function InvitationCreateForm({ restaurants }: InvitationCreateFormProps) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [restaurantId, setRestaurantId] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const restaurantOptions = useMemo(
        () => [...restaurants].sort((left, right) => left.name.localeCompare(right.name)),
        [restaurants],
    );

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            setError("أدخل البريد الإلكتروني لمدير المطعم.");
            setSuccess(null);
            return;
        }

        if (!isValidEmail(normalizedEmail)) {
            setError("أدخل بريداً إلكترونياً صالحاً.");
            setSuccess(null);
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/admin/invitations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: normalizedEmail,
                    restaurantId: restaurantId || undefined,
                }),
            });

            const data = (await response.json().catch(() => null)) as
                | ({ message?: string } & CreateInvitationResponse)
                | { message?: string }
                | null;

            if (!response.ok) {
                setError(data?.message || "تعذر إنشاء الدعوة حالياً.");
                return;
            }

            if (!isCreateInvitationResponse(data)) {
                setError("وصلت استجابة غير متوقعة من خدمة الدعوات الإدارية.");
                return;
            }

            const generatedLink = `${window.location.origin}/accept-invite?token=${encodeURIComponent(
                data.token,
            )}`;

            setSuccess(`تم إنشاء دعوة للحساب ${data.email}.`);
            setInviteLink(generatedLink);
            setEmail("");
            setRestaurantId("");
            router.refresh();
        } catch {
            setError("خدمة الدعوات غير متاحة حالياً. حاول مرة أخرى بعد قليل.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleCopyInviteLink() {
        if (!inviteLink) {
            return;
        }

        try {
            await navigator.clipboard.writeText(inviteLink);
            setSuccess("تم إنشاء الدعوة ونسخ الرابط إلى الحافظة.");
        } catch {
            setError("تم إنشاء الدعوة، لكن تعذر نسخ الرابط تلقائياً.");
        }
    }

    return (
        <form className={styles.inviteForm} onSubmit={handleSubmit} noValidate>
            <div className={styles.inviteFieldGroup}>
                <div className="input-shell">
                    <label htmlFor="invite-email" className="input-label">
                        بريد مدير المطعم
                    </label>
                    <input
                        id="invite-email"
                        type="email"
                        value={email}
                        placeholder="manager@restaurant.com"
                        autoComplete="email"
                        onChange={(event) => {
                            setEmail(event.target.value);
                            if (error) {
                                setError(null);
                            }
                        }}
                    />
                </div>
            </div>

            <div className={styles.inviteFieldGrid}>
                <div className={styles.inviteFieldGroup}>
                    <div className="input-shell">
                        <label htmlFor="invite-role" className="input-label">
                            الدور
                        </label>
                        <input id="invite-role" value="مدير مطعم" readOnly aria-readonly="true" />
                    </div>
                </div>

                <div className={styles.inviteFieldGroup}>
                    <div className="input-shell">
                        <label htmlFor="invite-restaurant" className="input-label">
                            ربط المطعم
                        </label>
                        <select
                            id="invite-restaurant"
                            value={restaurantId}
                            onChange={(event) => setRestaurantId(event.target.value)}
                        >
                            <option value="">لا يوجد مطعم مرتبط بعد</option>
                            {restaurantOptions.map((restaurant) => (
                                <option key={restaurant.id} value={restaurant.id}>
                                    {restaurant.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {error ? <p className={styles.formError}>{error}</p> : null}
            {success ? <p className={styles.formSuccess}>{success}</p> : null}

            {inviteLink ? (
                <div className={styles.generatedLinkCard}>
                    <p className={styles.generatedLinkLabel}>رابط الدعوة اليدوي</p>
                    <input value={inviteLink} readOnly aria-label="رابط الدعوة المُنشأ" className="force-ltr" />
                    <button type="button" className="button-secondary" onClick={handleCopyInviteLink}>
                        نسخ رابط الدعوة
                    </button>
                </div>
            ) : null}

            <div className={styles.formActionsInline}>
                <button type="submit" className="button-primary" disabled={isSubmitting}>
                    {isSubmitting ? "جارٍ إنشاء الدعوة..." : "إنشاء دعوة"}
                </button>
                <p className={styles.formHint}>
                    ما زال إرسال البريد يتم يدوياً في هذه المرحلة، لكن رمز الدعوة ومسار القبول حقيقيان بالكامل.
                </p>
            </div>
        </form>
    );
}
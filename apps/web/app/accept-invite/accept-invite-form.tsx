"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "../login/page.module.css";

type AcceptInviteFormProps = {
    email: string;
    token: string;
};

type ValidationErrors = {
    name?: string;
    password?: string;
    confirmPassword?: string;
};

export function AcceptInviteForm({ email, token }: AcceptInviteFormProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextErrors: ValidationErrors = {};

        if (!name.trim()) {
            nextErrors.name = "أدخل الاسم الكامل لإكمال إعداد الحساب.";
        } else if (name.trim().length < 2) {
            nextErrors.name = "يجب أن يتكون الاسم من حرفين على الأقل.";
        }

        if (!password) {
            nextErrors.password = "أدخل كلمة مرور لإكمال الإعداد.";
        } else if (password.length < 6) {
            nextErrors.password = "يجب أن تكون كلمة المرور 6 أحرف على الأقل.";
        }

        if (!confirmPassword) {
            nextErrors.confirmPassword = "أكد كلمة المرور.";
        } else if (confirmPassword !== password) {
            nextErrors.confirmPassword = "كلمتا المرور غير متطابقتين.";
        }

        setErrors(nextErrors);
        setServerError(null);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/invitations/accept", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    name: name.trim(),
                    password,
                }),
            });

            const data = (await response.json().catch(() => null)) as
                | { message?: string; email?: string }
                | null;

            if (!response.ok) {
                setServerError(data?.message || "تعذر إكمال إعداد الدعوة حالياً.");
                return;
            }

            const nextEmail = data?.email ?? email;
            router.replace(`/login?source=public&email=${encodeURIComponent(nextEmail)}`);
            router.refresh();
        } catch {
            setServerError("خدمة الدعوات غير متاحة حالياً. حاول مرة أخرى بعد قليل.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.fieldGroup}>
                <div className="input-shell">
                    <label htmlFor="accept-invite-email" className="input-label">
                        البريد الإلكتروني المدعو
                    </label>
                    <input id="accept-invite-email" type="email" value={email} readOnly aria-readonly="true" />
                </div>
            </div>

            <div className={styles.fieldGroup}>
                <div className="input-shell">
                    <label htmlFor="accept-invite-name" className="input-label">
                        الاسم الكامل
                    </label>
                    <input
                        id="accept-invite-name"
                        value={name}
                        placeholder="أحمد المدير"
                        autoComplete="name"
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={errors.name ? "accept-invite-name-error" : undefined}
                        onChange={(event) => {
                            setName(event.target.value);
                            if (errors.name) {
                                setErrors((current) => ({ ...current, name: undefined }));
                            }
                        }}
                    />
                </div>
                {errors.name ? (
                    <p id="accept-invite-name-error" className={styles.fieldError}>
                        {errors.name}
                    </p>
                ) : null}
            </div>

            <div className={styles.fieldGroup}>
                <div className="input-shell">
                    <label htmlFor="accept-invite-password" className="input-label">
                        كلمة المرور
                    </label>
                    <input
                        id="accept-invite-password"
                        type="password"
                        value={password}
                        placeholder="أنشئ كلمة مرور"
                        autoComplete="new-password"
                        aria-invalid={errors.password ? true : undefined}
                        aria-describedby={errors.password ? "accept-invite-password-error" : undefined}
                        onChange={(event) => {
                            setPassword(event.target.value);
                            if (errors.password) {
                                setErrors((current) => ({ ...current, password: undefined }));
                            }
                        }}
                    />
                </div>
                {errors.password ? (
                    <p id="accept-invite-password-error" className={styles.fieldError}>
                        {errors.password}
                    </p>
                ) : null}
            </div>

            <div className={styles.fieldGroup}>
                <div className="input-shell">
                    <label htmlFor="accept-invite-password-confirm" className="input-label">
                        تأكيد كلمة المرور
                    </label>
                    <input
                        id="accept-invite-password-confirm"
                        type="password"
                        value={confirmPassword}
                        placeholder="أعد إدخال كلمة المرور"
                        autoComplete="new-password"
                        aria-invalid={errors.confirmPassword ? true : undefined}
                        aria-describedby={errors.confirmPassword ? "accept-invite-confirm-error" : undefined}
                        onChange={(event) => {
                            setConfirmPassword(event.target.value);
                            if (errors.confirmPassword) {
                                setErrors((current) => ({ ...current, confirmPassword: undefined }));
                            }
                        }}
                    />
                </div>
                {errors.confirmPassword ? (
                    <p id="accept-invite-confirm-error" className={styles.fieldError}>
                        {errors.confirmPassword}
                    </p>
                ) : null}
            </div>

            {serverError ? <p className={styles.serverError}>{serverError}</p> : null}

            <div className={styles.formActions}>
                <button type="submit" className="button-primary" disabled={isSubmitting}>
                    {isSubmitting ? "جارٍ إكمال الإعداد..." : "إكمال إعداد الحساب"}
                </button>
                <p className={styles.formHint}>
                    بعد اكتمال الإعداد سيتم تحويلك إلى صفحة تسجيل الدخول.
                </p>
            </div>
        </form>
    );
}
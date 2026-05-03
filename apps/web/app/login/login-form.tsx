"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { resolveRoleScopedPath } from "../_components/role-routing";
import styles from "./page.module.css";

type LoginFormProps = {
    initialEmail?: string;
    redirectTo: string;
};

type LoginSuccessResponse = {
    user?: {
        role?: string;
    };
};

type ValidationErrors = {
    email?: string;
    password?: string;
};

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginForm({ initialEmail = "", redirectTo }: LoginFormProps) {
    const router = useRouter();
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextErrors: ValidationErrors = {};
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            nextErrors.email = "أدخل البريد الإلكتروني الخاص بحساب مدير المطعم أو المشرف العام.";
        } else if (!isValidEmail(normalizedEmail)) {
            nextErrors.email = "أدخل بريداً إلكترونياً صالحاً.";
        }

        if (!password) {
            nextErrors.password = "أدخل كلمة المرور للمتابعة.";
        }

        setErrors(nextErrors);
        setServerError(null);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password,
                }),
            });

            const data = (await response.json().catch(() => null)) as
                | ({ message?: string } & LoginSuccessResponse)
                | null;

            if (!response.ok) {
                setServerError(data?.message || "تعذر تسجيل الدخول حالياً.");
                return;
            }

            router.replace(resolveRoleScopedPath(data?.user?.role, redirectTo));
            router.refresh();
        } catch {
            setServerError("خدمة التحقق غير متاحة حالياً. حاول مرة أخرى بعد قليل.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.fieldGroup}>
                <div className="input-shell">
                    <label htmlFor="login-email" className="input-label">
                        البريد الإلكتروني
                    </label>
                    <input
                        id="login-email"
                        type="email"
                        value={email}
                        placeholder="manager@restaurant.com"
                        autoComplete="email"
                        aria-invalid={errors.email ? true : undefined}
                        aria-describedby={errors.email ? "login-email-error" : undefined}
                        onChange={(event) => {
                            setEmail(event.target.value);
                            if (errors.email) {
                                setErrors((current) => ({ ...current, email: undefined }));
                            }
                        }}
                    />
                </div>
                {errors.email ? (
                    <p id="login-email-error" className={styles.fieldError}>
                        {errors.email}
                    </p>
                ) : null}
            </div>

            <div className={styles.fieldGroup}>
                <div className="input-shell">
                    <label htmlFor="login-password" className="input-label">
                        كلمة المرور
                    </label>
                    <input
                        id="login-password"
                        type="password"
                        value={password}
                        placeholder="أدخل كلمة المرور"
                        autoComplete="current-password"
                        aria-invalid={errors.password ? true : undefined}
                        aria-describedby={errors.password ? "login-password-error" : undefined}
                        onChange={(event) => {
                            setPassword(event.target.value);
                            if (errors.password) {
                                setErrors((current) => ({ ...current, password: undefined }));
                            }
                        }}
                    />
                </div>
                {errors.password ? (
                    <p id="login-password-error" className={styles.fieldError}>
                        {errors.password}
                    </p>
                ) : null}
            </div>

            {serverError ? <p className={styles.serverError}>{serverError}</p> : null}

            <div className={styles.formActions}>
                <button type="submit" className="button-primary" disabled={isSubmitting}>
                    {isSubmitting ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
                </button>
                <p className={styles.formHint}>
                    يتم حفظ الجلسة في ملف ارتباط آمن ثم تحويلك إلى صفحة الإدارة المناسبة.
                </p>
            </div>
        </form>
    );
}
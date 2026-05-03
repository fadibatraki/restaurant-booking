"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import styles from "./page.module.css";

type TableManagementFormProps = {
    restaurantId: string;
};

type ValidationErrors = {
    name?: string;
    capacity?: string;
};

export function TableManagementForm({ restaurantId }: TableManagementFormProps) {
    const router = useRouter();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [capacity, setCapacity] = useState("4");
    const [isActive, setIsActive] = useState(true);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [feedback, setFeedback] = useState<string | null>(null);
    const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefreshing, startTransition] = useTransition();

    function closeCreateModal() {
        setIsCreateModalOpen(false);
        setErrors({});
        setFeedback(null);
        setFeedbackType(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextErrors: ValidationErrors = {};
        const normalizedName = name.trim();
        const normalizedCapacity = Number(capacity);

        if (!normalizedName) {
            nextErrors.name = "أدخل اسم الطاولة لهذا المطعم.";
        }

        if (!Number.isInteger(normalizedCapacity) || normalizedCapacity < 1) {
            nextErrors.capacity = "يجب أن تكون السعة رقماً صحيحاً لا يقل عن 1.";
        }

        setErrors(nextErrors);
        setFeedback(null);
        setFeedbackType(null);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/owner/tables", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: normalizedName,
                    capacity: normalizedCapacity,
                    isActive,
                    restaurantId,
                }),
            });

            const data = (await response.json().catch(() => null)) as
                | { message?: string }
                | null;

            if (response.status === 401) {
                router.replace("/login?next=/owner");
                router.refresh();
                return;
            }

            if (!response.ok) {
                setFeedback(data?.message || "تعذر إنشاء هذه الطاولة حالياً.");
                setFeedbackType("error");
                return;
            }

            setName("");
            setCapacity("4");
            setIsActive(true);
            setFeedback("تم إنشاء الطاولة. جارٍ تحديث اللوحة...");
            setFeedbackType("success");

            setTimeout(() => {
                closeCreateModal();
            }, 700);

            startTransition(() => {
                router.refresh();
            });
        } catch {
            setFeedback("خدمة الطاولات غير متاحة حالياً. حاول مرة أخرى بعد قليل.");
            setFeedbackType("error");
        } finally {
            setIsSubmitting(false);
        }
    }

    const isBusy = isSubmitting || isRefreshing;

    return (
        <>
            <button
                type="button"
                className={styles.reservationsCreateMain}
                onClick={() => setIsCreateModalOpen(true)}
            >
                + إنشاء طاولة
            </button>

            {isCreateModalOpen ? (
                <div className={styles.reservationsModalBackdrop} onClick={closeCreateModal}>
                    <section className={`${styles.reservationsModalCard} surface`} onClick={(event) => event.stopPropagation()}>
                    

                        <form className={styles.tableForm} onSubmit={handleSubmit} noValidate>
                            <div className={styles.tableFormGrid}>
                                <div className={styles.fieldGroup}>
                                    <div className="input-shell">
                                        <label htmlFor={`table-name-${restaurantId}`} className="input-label">
                                            اسم الطاولة
                                        </label>
                                        <input
                                            id={`table-name-${restaurantId}`}
                                            type="text"
                                            value={name}
                                            placeholder="طاولة النافذة"
                                            aria-invalid={errors.name ? true : undefined}
                                            aria-describedby={errors.name ? `table-name-error-${restaurantId}` : undefined}
                                            onChange={(event) => {
                                                setName(event.target.value);
                                                if (errors.name) {
                                                    setErrors((current) => ({ ...current, name: undefined }));
                                                }
                                            }}
                                        />
                                    </div>
                                    {errors.name ? (
                                        <p id={`table-name-error-${restaurantId}`} className={styles.formError}>
                                            {errors.name}
                                        </p>
                                    ) : null}
                                </div>

                                <div className={styles.fieldGroup}>
                                    <div className="input-shell">
                                        <label htmlFor={`table-capacity-${restaurantId}`} className="input-label">
                                            السعة
                                        </label>
                                        <input
                                            id={`table-capacity-${restaurantId}`}
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={capacity}
                                            aria-invalid={errors.capacity ? true : undefined}
                                            aria-describedby={errors.capacity ? `table-capacity-error-${restaurantId}` : undefined}
                                            onChange={(event) => {
                                                setCapacity(event.target.value);
                                                if (errors.capacity) {
                                                    setErrors((current) => ({ ...current, capacity: undefined }));
                                                }
                                            }}
                                        />
                                    </div>
                                    {errors.capacity ? (
                                        <p id={`table-capacity-error-${restaurantId}`} className={styles.formError}>
                                            {errors.capacity}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <label className={styles.checkboxRow}>
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(event) => setIsActive(event.target.checked)}
                                />
                                <span>الطاولة متاحة للحجز</span>
                            </label>

                            <div className={styles.tableFormActions}>
                                <button type="submit" className="button-primary" disabled={isBusy}>
                                    {isSubmitting ? "جارٍ إنشاء الطاولة..." : "إنشاء طاولة"}
                                </button>
                                <button type="button" className="button-ghost" onClick={closeCreateModal}>
                                    إلغاء
                                </button>
                            </div>

                            <p className={styles.formHint}>
                                يتم إنشاء الطاولات الجديدة فقط للمطاعم المرتبطة بحساب الإدارة الحالي.
                            </p>

                            {feedback ? (
                                <p
                                    className={`${styles.actionFeedback} ${feedbackType === "success" ? styles.actionFeedbackSuccess : styles.actionFeedbackError}`}
                                >
                                    {feedback}
                                </p>
                            ) : null}
                        </form>
                    </section>
                </div>
            ) : null}
        </>
    );
}
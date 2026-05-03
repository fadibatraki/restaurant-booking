"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const authCookieName = "restaurant_booking_access_token";
const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "http://localhost:3000";

type UpdateTableStatusResult = {
    success: boolean;
    error?: string;
};

export async function updateTableStatus(
    tableId: string,
    status: "AVAILABLE" | "RESERVED" | "OCCUPIED"
): Promise<UpdateTableStatusResult> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(authCookieName)?.value;

        if (!token) {
            return { success: false, error: "غير مصرح. سجّل الدخول مرة أخرى." };
        }

        const response = await fetch(
            new URL(`/tables/${tableId}/status`, apiBaseUrl),
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
                cache: "no-store",
            }
        );

        if (response.status === 401) {
            return { success: false, error: "انتهت صلاحية الجلسة. سجّل الدخول مرة أخرى." };
        }

        if (response.status === 403) {
            return { success: false, error: "لا يمكنك تعديل طاولات المطاعم الأخرى." };
        }

        if (response.status === 404) {
            return { success: false, error: "الطاولة غير موجودة." };
        }

        if (!response.ok) {
            return { success: false, error: "فشل تحديث حالة الطاولة. حاول مرة أخرى." };
        }

        // Revalidate the tables page to refresh the data
        revalidatePath("/owner/tables");
        revalidatePath("/owner");

        return { success: true };
    } catch (error) {
        console.error("Error updating table status:", error);
        return { success: false, error: "خطأ في الاتصال بالخادم." };
    }
}

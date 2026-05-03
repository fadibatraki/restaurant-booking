import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "http://localhost:3000";

const authCookieName = "restaurant_booking_access_token";

type Params = {
    params: Promise<{
        restaurantId: string;
        reservationId: string;
    }>;
};

type ReservationAction = "confirm" | "reject" | "cancel" | "delete";

function localizeReservationMessage(message?: string) {
    switch (message) {
        case "Your session has expired. Please sign in again.":
            return "انتهت صلاحية الجلسة الحالية. سجّل الدخول مرة أخرى.";
        case "A valid reservation action is required.":
            return "يلزم اختيار إجراء صالح للحجز.";
        case "Restaurant not found":
            return "المطعم غير موجود.";
        case "You do not own this restaurant":
            return "هذا المطعم غير مرتبط بحساب الإدارة الحالي.";
        case "Reservation not found":
            return "الحجز غير موجود.";
        case "Reservation does not belong to this restaurant":
            return "هذا الحجز غير مرتبط بهذا المطعم.";
        case "Only pending reservations can be confirmed":
            return "يمكن تأكيد الحجوزات قيد الانتظار فقط.";
        case "Only pending reservations can be rejected":
            return "يمكن رفض الحجوزات قيد الانتظار فقط.";
        case "Only confirmed reservations can be cancelled":
            return "يمكن إلغاء الحجوزات المؤكدة فقط.";
        case "Reservation deleted successfully":
            return "تم حذف الحجز بنجاح.";
        case "Only confirmed reservations can be completed":
            return "يمكن إكمال الحجوزات المؤكدة فقط.";
        case "Unable to update this reservation right now.":
            return "تعذر تحديث هذا الحجز حالياً.";
        case "The reservations service is currently unavailable. Try again shortly.":
            return "خدمة الحجوزات غير متاحة حالياً. حاول مرة أخرى بعد قليل.";
        default:
            return message;
    }
}

function getActionPath(
    action: ReservationAction,
    restaurantId: string,
    reservationId: string,
) {
    if (action === "confirm") {
        return `/restaurants/${restaurantId}/reservations/${reservationId}/confirm`;
    }

    if (action === "delete") {
        return `/restaurants/${restaurantId}/reservations/${reservationId}/delete`;
    }

    if (action === "cancel") {
        return `/restaurants/${restaurantId}/reservations/${reservationId}/cancel`;
    }

    return `/restaurants/${restaurantId}/reservations/${reservationId}/reject`;
}

export async function PATCH(request: NextRequest, context: Params) {
    const token = request.cookies.get(authCookieName)?.value;

    if (!token) {
        const response = NextResponse.json(
            { message: localizeReservationMessage("Your session has expired. Please sign in again.") },
            { status: 401 },
        );

        response.cookies.set({
            name: authCookieName,
            value: "",
            path: "/",
            maxAge: 0,
        });

        return response;
    }

    const body = (await request.json().catch(() => null)) as
        | { action?: ReservationAction }
        | null;

    const action = body?.action;

    if (action !== "confirm" && action !== "reject" && action !== "cancel" && action !== "delete") {
        return NextResponse.json(
            { message: localizeReservationMessage("A valid reservation action is required.") },
            { status: 400 },
        );
    }

    const { restaurantId, reservationId } = await context.params;
    const endpoint = getActionPath(action, restaurantId, reservationId);

    try {
        const response = await fetch(new URL(endpoint, apiBaseUrl), {
            method: "PATCH",
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = (await response.json().catch(() => null)) as
            | { message?: string | string[] }
            | Record<string, unknown>
            | null;

        if (response.status === 401) {
            const nextResponse = NextResponse.json(
                { message: localizeReservationMessage("Your session has expired. Please sign in again.") },
                { status: 401 },
            );

            nextResponse.cookies.set({
                name: authCookieName,
                value: "",
                path: "/",
                maxAge: 0,
            });

            return nextResponse;
        }

        if (!response.ok) {
            const errorData = data as { message?: string | string[] } | null;
            const rawMessage = Array.isArray(errorData?.message)
                ? errorData.message[0]
                : errorData?.message || "Unable to update this reservation right now.";
            const message =
                localizeReservationMessage(rawMessage) ?? "تعذر تحديث هذا الحجز حالياً.";

            return NextResponse.json({ message }, { status: response.status });
        }

        return NextResponse.json(data);
    } catch {
        return NextResponse.json(
            {
                message: localizeReservationMessage(
                    "The reservations service is currently unavailable. Try again shortly.",
                ),
            },
            { status: 503 },
        );
    }
}
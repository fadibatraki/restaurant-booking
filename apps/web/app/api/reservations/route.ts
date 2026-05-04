import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3000";

const authCookieName = "restaurant_booking_access_token";

function localizeReservationCreateMessage(message?: string) {
    switch (message) {
        case "Your session has expired. Please sign in again.":
            return "انتهت صلاحية الجلسة الحالية. سجّل الدخول مرة أخرى.";
        case "Reservation date cannot be in the past":
            return "لا يمكن إنشاء حجز بتاريخ أو وقت من الماضي.";
        case "Restaurant not found":
            return "المطعم غير موجود.";
        case "Table not found":
            return "الطاولة غير موجودة.";
        case "Table does not belong to the given restaurant":
            return "الطاولة المختارة لا تتبع هذا المطعم.";
        case "Selected table is not active":
            return "الطاولة المختارة غير مفعلة حالياً.";
        case "Guests count exceeds table capacity":
            return "عدد الضيوف أكبر من سعة الطاولة.";
        case "A reservation already exists for this table at the selected time":
            return "هناك حجز موجود بالفعل لهذه الطاولة في الوقت المحدد.";
        default:
            return message;
    }
}

export async function POST(request: NextRequest) {
    const token = request.cookies.get(authCookieName)?.value;

    if (!token) {
        const response = NextResponse.json(
            { message: localizeReservationCreateMessage("Your session has expired. Please sign in again.") },
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

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    try {
        const response = await fetch(new URL("/reservations", apiBaseUrl), {
            method: "POST",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const data = (await response.json().catch(() => null)) as
            | { message?: string | string[] }
            | Record<string, unknown>
            | null;

        if (response.status === 401) {
            const nextResponse = NextResponse.json(
                { message: localizeReservationCreateMessage("Your session has expired. Please sign in again.") },
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
                : errorData?.message || "Unable to create this reservation right now.";

            return NextResponse.json(
                { message: localizeReservationCreateMessage(rawMessage) ?? "تعذر إنشاء الحجز حالياً." },
                { status: response.status },
            );
        }

        return NextResponse.json(data, { status: 201 });
    } catch {
        return NextResponse.json(
            { message: "خدمة الحجوزات غير متاحة حالياً. حاول مرة أخرى بعد قليل." },
            { status: 503 },
        );
    }
}

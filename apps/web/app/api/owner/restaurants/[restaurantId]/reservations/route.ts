import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3000";

const authCookieName = "restaurant_booking_access_token";

type Params = {
    params: Promise<{
        restaurantId: string;
    }>;
};

export async function GET(request: NextRequest, context: Params) {
    const token = request.cookies.get(authCookieName)?.value;

    if (!token) {
        const response = NextResponse.json({ message: "انتهت صلاحية الجلسة الحالية. سجّل الدخول مرة أخرى." }, { status: 401 });
        response.cookies.set({
            name: authCookieName,
            value: "",
            path: "/",
            maxAge: 0,
        });
        return response;
    }

    const { restaurantId } = await context.params;
    const status = request.nextUrl.searchParams.get("status");
    const endpoint = new URL(`/restaurants/${restaurantId}/reservations`, apiBaseUrl);

    if (status) {
        endpoint.searchParams.set("status", status);
    }

    try {
        const response = await fetch(endpoint, {
            method: "GET",
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = (await response.json().catch(() => null)) as unknown;

        if (response.status === 401) {
            const nextResponse = NextResponse.json(
                { message: "انتهت صلاحية الجلسة الحالية. سجّل الدخول مرة أخرى." },
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
            const errorMessage =
                (data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
                    ? (data as { message: string }).message
                    : "تعذر تحميل حجوزات المطعم حالياً.");

            return NextResponse.json({ message: errorMessage }, { status: response.status });
        }

        return NextResponse.json(data, { status: 200 });
    } catch {
        return NextResponse.json(
            { message: "خدمة الحجوزات غير متاحة حالياً. حاول مرة أخرى بعد قليل." },
            { status: 503 },
        );
    }
}

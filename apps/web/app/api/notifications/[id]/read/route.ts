import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3000";

const authCookieName = "restaurant_booking_access_token";

const sessionExpiredMessage = "انتهت صلاحية الجلسة الحالية. سجّل الدخول مرة أخرى.";
const genericErrorMessage = "تعذر تحديث الإشعار حالياً. حاول مرة أخرى بعد قليل.";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: NextRequest, context: Params) {
    const token = request.cookies.get(authCookieName)?.value;

    if (!token) {
        const response = NextResponse.json({ message: sessionExpiredMessage }, { status: 401 });
        response.cookies.set({
            name: authCookieName,
            value: "",
            path: "/",
            maxAge: 0,
        });
        return response;
    }

    const { id } = await context.params;

    try {
        const response = await fetch(
            new URL(`/notifications/${encodeURIComponent(id)}/read`, apiBaseUrl),
            {
                method: "PATCH",
                cache: "no-store",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        const data = (await response.json().catch(() => null)) as
            | { message?: string | string[] }
            | Record<string, unknown>
            | null;

        if (response.status === 401) {
            const nextResponse = NextResponse.json({ message: sessionExpiredMessage }, { status: 401 });
            nextResponse.cookies.set({
                name: authCookieName,
                value: "",
                path: "/",
                maxAge: 0,
            });
            return nextResponse;
        }

        if (!response.ok) {
            const rawMessage = Array.isArray(data?.message) ? data.message[0] : data?.message;
            return NextResponse.json(
                { message: typeof rawMessage === "string" ? rawMessage : genericErrorMessage },
                { status: response.status },
            );
        }

        return NextResponse.json(data, { status: 200 });
    } catch {
        return NextResponse.json({ message: genericErrorMessage }, { status: 503 });
    }
}

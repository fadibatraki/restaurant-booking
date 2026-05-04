import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "http://localhost:3000";

const authCookieName = "restaurant_booking_access_token";

type LoginResponse = {
    accessToken: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
};

function localizeLoginMessage(message?: string) {
    switch (message) {
        case "Email and password are required.":
            return "البريد الإلكتروني وكلمة المرور مطلوبان.";
        case "Invalid credentials":
            return "بيانات الدخول غير صحيحة.";
        case "Unable to sign in right now.":
            return "تعذر تسجيل الدخول حالياً.";
        case "Unexpected login response from the auth service.":
            return "وصلت استجابة غير متوقعة من خدمة تسجيل الدخول.";
        case "The auth service is currently unavailable. Try again shortly.":
            return "خدمة التحقق غير متاحة حالياً. حاول مرة أخرى بعد قليل.";
        default:
            return message;
    }
}

export async function POST(request: NextRequest) {
    const body = (await request.json().catch(() => null)) as
        | { email?: string; password?: string }
        | null;

    const email = body?.email?.trim().toLowerCase();
    const password = body?.password ?? "";

    if (!email || !password) {
        return NextResponse.json(
            { message: localizeLoginMessage("Email and password are required.") },
            { status: 400 },
        );
    }

    try {
        const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ email, password }),
            cache: "no-store",
        });

        const data = (await response.json().catch(() => null)) as
            | LoginResponse
            | { message?: string | string[] }
            | null;

        if (!response.ok) {
            const errorData = data as { message?: string | string[] } | null;
            const rawMessage = Array.isArray(errorData?.message)
                ? errorData.message[0]
                : errorData?.message || "Unable to sign in right now.";
            const message = localizeLoginMessage(rawMessage) ?? "تعذر تسجيل الدخول حالياً.";

            return NextResponse.json({ message }, { status: response.status });
        }

        if (
            !data ||
            !("accessToken" in data) ||
            typeof data.accessToken !== "string" ||
            !("user" in data)
        ) {
            return NextResponse.json(
                { message: localizeLoginMessage("Unexpected login response from the auth service.") },
                { status: 502 },
            );
        }

        const nextResponse = NextResponse.json({ user: data.user });

        nextResponse.cookies.set({
            name: authCookieName,
            value: data.accessToken,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
        });

        return nextResponse;
    } catch {
        return NextResponse.json(
            {
                message: localizeLoginMessage(
                    "The auth service is currently unavailable. Try again shortly.",
                ),
            },
            { status: 503 },
        );
    }
}
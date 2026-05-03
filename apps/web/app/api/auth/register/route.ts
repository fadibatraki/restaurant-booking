import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "http://localhost:3000";

function localizeRegisterMessage(message?: string) {
    switch (message) {
        case "Name, email, and password are required.":
            return "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة.";
        case "Email already registered":
            return "هذا البريد الإلكتروني مسجل بالفعل.";
        case "Unable to create this account right now.":
            return "تعذر إنشاء هذا الحساب حالياً.";
        case "The auth service is currently unavailable. Try again shortly.":
            return "خدمة التحقق غير متاحة حالياً. حاول مرة أخرى بعد قليل.";
        default:
            return message;
    }
}

export async function POST(request: NextRequest) {
    const body = (await request.json().catch(() => null)) as
        | { name?: string; email?: string; password?: string; phone?: string }
        | null;

    const name = body?.name?.trim();
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password ?? "";
    const phone = body?.phone?.trim() || undefined;

    if (!name || !email || !password) {
        return NextResponse.json(
            { message: localizeRegisterMessage("Name, email, and password are required.") },
            { status: 400 },
        );
    }

    try {
        const response = await fetch(new URL("/auth/register", apiBaseUrl), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                name,
                email,
                password,
                phone,
            }),
            cache: "no-store",
        });

        const data = (await response.json().catch(() => null)) as
            | { message?: string | string[] }
            | Record<string, unknown>
            | null;

        if (!response.ok) {
            const errorData = data as { message?: string | string[] } | null;
            const rawMessage = Array.isArray(errorData?.message)
                ? errorData.message[0]
                : errorData?.message || "Unable to create this account right now.";
            const message = localizeRegisterMessage(rawMessage) ?? "تعذر إنشاء هذا الحساب حالياً.";

            return NextResponse.json({ message }, { status: response.status });
        }

        return NextResponse.json(data, { status: 201 });
    } catch {
        return NextResponse.json(
            {
                message: localizeRegisterMessage(
                    "The auth service is currently unavailable. Try again shortly.",
                ),
            },
            { status: 503 },
        );
    }
}
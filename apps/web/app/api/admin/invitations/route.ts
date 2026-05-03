import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "http://localhost:3000";

const authCookieName = "restaurant_booking_access_token";

function localizeInvitationMessage(message?: string) {
    switch (message) {
        case "Your session has expired. Please sign in again.":
            return "انتهت صلاحية الجلسة الحالية. سجّل الدخول مرة أخرى.";
        case "Restaurant admin email is required.":
            return "البريد الإلكتروني لمدير المطعم مطلوب.";
        case "This email is already registered.":
            return "هذا البريد الإلكتروني مسجل بالفعل.";
        case "Restaurant not found.":
            return "المطعم غير موجود.";
        case "A pending invitation already exists for this email.":
            return "توجد دعوة معلقة بالفعل لهذا البريد الإلكتروني.";
        case "Only super admins can manage invitations.":
            return "يستطيع المشرف العام فقط إدارة الدعوات.";
        case "Unable to create this invitation right now.":
            return "تعذر إنشاء هذه الدعوة حالياً.";
        case "The invitation service is currently unavailable. Try again shortly.":
            return "خدمة الدعوات غير متاحة حالياً. حاول مرة أخرى بعد قليل.";
        default:
            return message;
    }
}

export async function POST(request: NextRequest) {
    const token = request.cookies.get(authCookieName)?.value;

    if (!token) {
        const response = NextResponse.json(
            { message: localizeInvitationMessage("Your session has expired. Please sign in again.") },
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
        | { email?: string; restaurantId?: string }
        | null;

    const email = body?.email?.trim().toLowerCase();
    const restaurantId = body?.restaurantId?.trim();

    if (!email) {
        return NextResponse.json(
            { message: localizeInvitationMessage("Restaurant admin email is required.") },
            { status: 400 },
        );
    }

    try {
        const response = await fetch(new URL("/invitations", apiBaseUrl), {
            method: "POST",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                email,
                restaurantId: restaurantId || undefined,
            }),
        });

        const data = (await response.json().catch(() => null)) as
            | { message?: string | string[] }
            | Record<string, unknown>
            | null;

        if (response.status === 401) {
            const nextResponse = NextResponse.json(
                { message: localizeInvitationMessage("Your session has expired. Please sign in again.") },
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
                : errorData?.message || "Unable to create this invitation right now.";
            const message =
                localizeInvitationMessage(rawMessage) ?? "تعذر إنشاء هذه الدعوة حالياً.";

            return NextResponse.json({ message }, { status: response.status });
        }

        return NextResponse.json(data, { status: 201 });
    } catch {
        return NextResponse.json(
            {
                message: localizeInvitationMessage(
                    "The invitation service is currently unavailable. Try again shortly.",
                ),
            },
            { status: 503 },
        );
    }
}
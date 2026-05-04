import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3000";

function localizeAcceptInvitationMessage(message?: string) {
    switch (message) {
        case "Invitation token, name, and password are required.":
            return "رمز الدعوة والاسم وكلمة المرور مطلوبة.";
        case "Invitation not found.":
            return "الدعوة غير موجودة.";
        case "This invitation has already been accepted.":
            return "تم قبول هذه الدعوة بالفعل.";
        case "Invitation has expired.":
            return "انتهت صلاحية هذه الدعوة.";
        case "This email is already registered.":
            return "هذا البريد الإلكتروني مسجل بالفعل.";
        case "Unable to complete invitation setup right now.":
            return "تعذر إكمال إعداد الدعوة حالياً.";
        case "The invitation service is currently unavailable. Try again shortly.":
            return "خدمة الدعوات غير متاحة حالياً. حاول مرة أخرى بعد قليل.";
        default:
            return message;
    }
}

export async function POST(request: NextRequest) {
    const body = (await request.json().catch(() => null)) as
        | { token?: string; name?: string; password?: string }
        | null;

    const token = body?.token?.trim();
    const name = body?.name?.trim();
    const password = body?.password ?? "";

    if (!token || !name || !password) {
        return NextResponse.json(
            {
                message: localizeAcceptInvitationMessage(
                    "Invitation token, name, and password are required.",
                ),
            },
            { status: 400 },
        );
    }

    try {
        const response = await fetch(new URL("/invitations/accept", apiBaseUrl), {
            method: "POST",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                token,
                name,
                password,
            }),
        });

        const data = (await response.json().catch(() => null)) as
            | { message?: string | string[]; email?: string }
            | Record<string, unknown>
            | null;

        if (!response.ok) {
            const errorData = data as { message?: string | string[] } | null;
            const rawMessage = Array.isArray(errorData?.message)
                ? errorData.message[0]
                : errorData?.message || "Unable to complete invitation setup right now.";
            const message =
                localizeAcceptInvitationMessage(rawMessage) ?? "تعذر إكمال إعداد الدعوة حالياً.";

            return NextResponse.json({ message }, { status: response.status });
        }

        return NextResponse.json(data, { status: 201 });
    } catch {
        return NextResponse.json(
            {
                message: localizeAcceptInvitationMessage(
                    "The invitation service is currently unavailable. Try again shortly.",
                ),
            },
            { status: 503 },
        );
    }
}

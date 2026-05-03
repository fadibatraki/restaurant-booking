import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "http://localhost:3000";

const authCookieName = "restaurant_booking_access_token";

type AuthMeResponse = {
    id: string | number;
    email: string;
    role: string;
};

type Restaurant = {
    id: string;
    ownerId: string;
};

function localizeTableMessage(message?: string) {
    switch (message) {
        case "Your session has expired. Please sign in again.":
            return "انتهت صلاحية الجلسة الحالية. سجّل الدخول مرة أخرى.";
        case "Name, capacity, and restaurant are required.":
            return "اسم الطاولة والسعة والمطعم مطلوبة.";
        case "We couldn't verify the current owner session right now.":
            return "تعذر التحقق من جلسة الإدارة الحالية.";
        case "We couldn't verify restaurant ownership right now.":
            return "تعذر التحقق من ربط المطعم بحسابك حالياً.";
        case "You can only create tables for restaurants linked to your owner account.":
            return "يمكنك إنشاء طاولات فقط للمطاعم المرتبطة بحساب الإدارة الحالي.";
        case "Unable to create this table right now.":
            return "تعذر إنشاء هذه الطاولة حالياً.";
        case "The tables service is currently unavailable. Try again shortly.":
            return "خدمة الطاولات غير متاحة حالياً. حاول مرة أخرى بعد قليل.";
        default:
            return message;
    }
}

async function getCurrentUser(token: string) {
    const response = await fetch(new URL("/auth/me", apiBaseUrl), {
        cache: "no-store",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        return {
            ok: false,
            response,
            user: null as AuthMeResponse | null,
        };
    }

    const data = (await response.json().catch(() => null)) as AuthMeResponse | null;

    if (!data) {
        return {
            ok: false,
            response,
            user: null as AuthMeResponse | null,
        };
    }

    return {
        ok: true,
        response,
        user: data,
    };
}

async function getRestaurants() {
    const response = await fetch(new URL("/restaurants", apiBaseUrl), {
        cache: "no-store",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        return {
            ok: false,
            restaurants: [] as Restaurant[],
        };
    }

    const data = (await response.json().catch(() => null)) as Restaurant[] | null;

    if (!Array.isArray(data)) {
        return {
            ok: false,
            restaurants: [] as Restaurant[],
        };
    }

    return {
        ok: true,
        restaurants: data,
    };
}

export async function POST(request: NextRequest) {
    const token = request.cookies.get(authCookieName)?.value;

    if (!token) {
        const response = NextResponse.json(
            { message: localizeTableMessage("Your session has expired. Please sign in again.") },
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
        | { name?: string; capacity?: number; isActive?: boolean; restaurantId?: string }
        | null;

    const name = body?.name?.trim();
    const capacity = typeof body?.capacity === "number" ? body.capacity : Number(body?.capacity);
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : true;
    const restaurantId = body?.restaurantId?.trim();

    if (!name || !restaurantId || !Number.isInteger(capacity) || capacity < 1) {
        return NextResponse.json(
            { message: localizeTableMessage("Name, capacity, and restaurant are required.") },
            { status: 400 },
        );
    }

    try {
        const userResult = await getCurrentUser(token);

        if (!userResult.ok || !userResult.user) {
            if (userResult.response.status === 401) {
                const response = NextResponse.json(
                    { message: localizeTableMessage("Your session has expired. Please sign in again.") },
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

            return NextResponse.json(
                { message: localizeTableMessage("We couldn't verify the current owner session right now.") },
                { status: 503 },
            );
        }

        const restaurantsResult = await getRestaurants();

        if (!restaurantsResult.ok) {
            return NextResponse.json(
                { message: localizeTableMessage("We couldn't verify restaurant ownership right now.") },
                { status: 503 },
            );
        }

        const ownedRestaurant = restaurantsResult.restaurants.find(
            (restaurant) =>
                restaurant.id === restaurantId && restaurant.ownerId === String(userResult.user?.id),
        );

        if (!ownedRestaurant) {
            return NextResponse.json(
                {
                    message: localizeTableMessage(
                        "You can only create tables for restaurants linked to your owner account.",
                    ),
                },
                { status: 403 },
            );
        }

        const response = await fetch(new URL("/tables", apiBaseUrl), {
            method: "POST",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                name,
                capacity,
                isActive,
                restaurantId,
            }),
        });

        const data = (await response.json().catch(() => null)) as
            | { message?: string | string[] }
            | Record<string, unknown>
            | null;

        if (!response.ok) {
            const errorData = data as { message?: string | string[] } | null;
            const rawMessage = Array.isArray(errorData?.message)
                ? errorData.message[0]
                : errorData?.message || "Unable to create this table right now.";
            const message = localizeTableMessage(rawMessage) ?? "تعذر إنشاء هذه الطاولة حالياً.";

            return NextResponse.json({ message }, { status: response.status });
        }

        return NextResponse.json(data, { status: 201 });
    } catch {
        return NextResponse.json(
            {
                message: localizeTableMessage(
                    "The tables service is currently unavailable. Try again shortly.",
                ),
            },
            { status: 503 },
        );
    }
}
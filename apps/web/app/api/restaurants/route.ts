import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3000";

function localizeRestaurantMessage(message?: string) {
    switch (message) {
        case "Unable to load restaurant suggestions.":
            return "تعذر تحميل اقتراحات المطاعم.";
        case "Restaurant suggestions are currently unavailable.":
            return "اقتراحات المطاعم غير متاحة حالياً.";
        default:
            return message;
    }
}

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const url = new URL("/restaurants", apiBaseUrl);

    if (query) {
        url.searchParams.set("q", query);
    }

    try {
        const response = await fetch(url.toString(), {
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { message: localizeRestaurantMessage("Unable to load restaurant suggestions.") },
                { status: response.status },
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json(
            { message: localizeRestaurantMessage("Restaurant suggestions are currently unavailable.") },
            { status: 503 },
        );
    }
}

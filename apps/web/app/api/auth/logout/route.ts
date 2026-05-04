import { NextResponse } from "next/server";

const authCookieName = "restaurant_booking_access_token";

export async function POST() {
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: "/login",
    },
  });

  response.cookies.set({
    name: authCookieName,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

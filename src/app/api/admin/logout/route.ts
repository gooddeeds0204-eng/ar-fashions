import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_OPTIONS,
} from "@/lib/admin-session";

export async function POST() {
  const response =
    NextResponse.json({
      success: true,
    });

  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    "",
    {
      ...ADMIN_SESSION_OPTIONS,
      maxAge: 0,
    },
  );

  return response;
}

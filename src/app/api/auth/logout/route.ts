import { NextResponse } from "next/server";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_OPTIONS,
} from "@/lib/customer-session";
import {
  requireSameOriginJson,
} from "@/lib/public-write-security";

export async function POST(
  request: Request,
) {
  const requestGuard =
    requireSameOriginJson(
      request,
    );

  if (requestGuard) {
    return requestGuard;
  }

  const response =
    NextResponse.json({
      success: true,
    });

  response.cookies.set(
    CUSTOMER_SESSION_COOKIE,
    "",
    {
      ...CUSTOMER_SESSION_OPTIONS,
      maxAge: 0,
    },
  );

  return response;
}

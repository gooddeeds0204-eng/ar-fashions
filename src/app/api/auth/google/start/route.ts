import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";
import {
  GOOGLE_FLOW_COOKIE,
  GOOGLE_FLOW_MAX_AGE,
  encodeFlow,
  generateGoogleFlow,
  googleAuthorizationUrl,
  googleConfig,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = googleConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/login?google=not_configured", request.url));
  }

  const mode = request.nextUrl.searchParams.get("mode") === "link" ? "link" : "signin";
  if (mode === "link") {
    const customer = await getAuthenticatedCustomer();
    if (!customer) return NextResponse.redirect(new URL("/login?google=sign_in_first", request.url));
  }

  const flow = generateGoogleFlow(mode);
  const response = NextResponse.redirect(googleAuthorizationUrl(flow, config), 302);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set({
    name: GOOGLE_FLOW_COOKIE,
    value: encodeFlow(flow),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GOOGLE_FLOW_MAX_AGE,
    path: "/api/auth/google",
  });
  return response;
}

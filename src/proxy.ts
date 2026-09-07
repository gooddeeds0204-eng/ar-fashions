import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

export function proxy(
  request: NextRequest,
) {
  const pathname =
    request.nextUrl.pathname;

  const token =
    request.cookies.get(
      ADMIN_SESSION_COOKIE,
    )?.value;

  const adminUserId =
    verifyAdminSessionToken(
      token,
    );

  if (
    pathname ===
    "/admin/login"
  ) {
    if (adminUserId) {
      return NextResponse.redirect(
        new URL(
          "/admin",
          request.url,
        ),
      );
    }

    return NextResponse.next();
  }

  if (!adminUserId) {
    const loginUrl =
      new URL(
        "/admin/login",
        request.url,
      );

    loginUrl.searchParams.set(
      "next",
      pathname,
    );

    return NextResponse.redirect(
      loginUrl,
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
  ],
};

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const userId =
      verifyAdminSessionToken(
        cookieStore.get(
          ADMIN_SESSION_COOKIE,
        )?.value,
      );

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Admin session required.",
        },
        { status: 401 },
      );
    }

    const admin =
      await prisma.user.findFirst({
        where: {
          id: userId,
          role: "ADMIN",
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "Admin session is invalid.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      admin,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/session failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to verify admin session.",
      },
      { status: 500 },
    );
  }
}

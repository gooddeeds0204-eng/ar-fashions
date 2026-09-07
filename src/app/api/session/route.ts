import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  verifyCustomerSessionToken,
} from "@/lib/customer-session";

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        CUSTOMER_SESSION_COOKIE,
      )?.value;

    const userId =
      verifyCustomerSessionToken(
        token,
      );

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "No customer session found.",
        },
        { status: 401 },
      );
    }

    const user =
      await prisma.user.findFirst({
        where: {
          id: userId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isReseller: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Customer session is no longer valid.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "GET /api/session failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load customer session.",
      },
      { status: 500 },
    );
  }
}

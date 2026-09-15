import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_OPTIONS,
  createCustomerSessionToken,
} from "@/lib/customer-session";
import {
  verifyPassword,
} from "@/lib/password";
import {
  enforcePublicRateLimit,
  requireSameOriginJson,
} from "@/lib/public-write-security";

function cleanString(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

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

  const rateLimitResponse =
    await enforcePublicRateLimit(
      request,
      {
        scope:
          "customer-login",
        limit: 10,
        windowSeconds:
          60 * 15,
      },
    );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body =
      await request.json();

    const identifier =
      cleanString(
        body.identifier,
      ).toLowerCase();

    const password =
      String(
        body.password ?? "",
      );

    if (
      !identifier ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "Mobile/email and password are required.",
        },
        {
          status: 400,
        },
      );
    }

    const user =
      await prisma.user.findFirst({
        where: {
          NOT: {
            role:
              "ADMIN",
          },

          OR: [
            {
              phone:
                identifier,
            },
            {
              email:
                identifier,
            },
          ],
        },

        include: {
          resellerApplication: {
            select: {
              status: true,
            },
          },
        },
      });

    const validPassword =
      Boolean(
        user?.passwordHash &&
        (await verifyPassword(
          password,
          user.passwordHash,
        )),
      );

    if (
      !user ||
      !validPassword
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid login details.",
        },
        {
          status: 401,
        },
      );
    }

    if (
      user.status !==
      "ACTIVE"
    ) {
      return NextResponse.json(
        {
          error:
            user.status ===
            "BLOCKED"
              ? "This account has been blocked. Please contact support."
              : "This account is not active yet.",
        },
        {
          status: 403,
        },
      );
    }

    const response =
      NextResponse.json({
        success: true,

        user: {
          id: user.id,
          name: user.name,
          email:
            user.email,
          phone:
            user.phone,
          isReseller:
            user.isReseller,
          resellerApplicationStatus:
            user.resellerApplication
              ?.status ??
            null,
        },
      });

    response.cookies.set(
      CUSTOMER_SESSION_COOKIE,
      createCustomerSessionToken(
        user.id,
      ),
      CUSTOMER_SESSION_OPTIONS,
    );

    return response;
  } catch (error) {
    console.error(
      "POST /api/auth/login failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to log in right now.",
      },
      {
        status: 500,
      },
    );
  }
}

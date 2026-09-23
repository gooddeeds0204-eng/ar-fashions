import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforcePublicRateLimit,
  requireSameOriginJson,
} from "@/lib/public-write-security";
import {
  hashPassword,
  validatePassword,
} from "@/lib/password";
import {
  inspectPasswordResetToken,
} from "@/lib/password-reset";

export async function POST(
  request: Request,
) {
  const guard =
    requireSameOriginJson(
      request,
    );

  if (guard) {
    return guard;
  }

  const limited =
    await enforcePublicRateLimit(
      request,
      {
        scope:
          "reset-password",
        limit: 8,
        windowSeconds:
          60 * 15,
      },
    );

  if (limited) {
    return limited;
  }

  try {
    const body =
      await request.json();

    const token =
      String(
        body.token ?? "",
      ).trim();

    const password =
      String(
        body.password ?? "",
      );

    const validation =
      validatePassword(
        password,
      );

    if (validation) {
      return NextResponse.json(
        {
          error:
            validation,
        },
        {
          status: 400,
        },
      );
    }

    const userId =
      token.split(".")[0] ||
      "";

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "This reset link is invalid or expired.",
        },
        {
          status: 400,
        },
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          passwordHash: true,
        },
      });

    if (
      !user?.passwordHash ||
      !inspectPasswordResetToken(
        token,
        user.passwordHash,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This reset link is invalid or expired. Request a new link.",
        },
        {
          status: 400,
        },
      );
    }

    const passwordHash =
      await hashPassword(
        password,
      );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Password updated successfully. You can now sign in.",
    });
  } catch (error) {
    console.error(
      "POST /api/auth/reset-password failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to reset the password right now.",
      },
      {
        status: 500,
      },
    );
  }
}

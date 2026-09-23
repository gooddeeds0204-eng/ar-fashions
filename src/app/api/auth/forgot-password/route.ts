import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enforcePublicRateLimit,
  requireSameOriginJson,
} from "@/lib/public-write-security";
import {
  createPasswordResetToken,
  sendPasswordResetEmail,
} from "@/lib/password-reset";

function clean(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

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
          "forgot-password",
        limit: 5,
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

    const identifier =
      clean(
        body.identifier,
      ).toLowerCase();

    if (
      identifier.length < 3
    ) {
      return NextResponse.json(
        {
          error:
            "Enter your registered mobile number or email.",
        },
        {
          status: 400,
        },
      );
    }

    const configured =
      Boolean(
        process.env.RESEND_API_KEY &&
        process.env
          .PASSWORD_RESET_FROM_EMAIL,
      );

    if (!configured) {
      return NextResponse.json(
        {
          success: false,
          deliveryConfigured:
            false,
          message:
            "Password reset email service is not configured yet. Please contact AS Fashions support.",
        },
        {
          status: 503,
        },
      );
    }

    const user =
      await prisma.user.findFirst({
        where: {
          OR: [
            {
              email:
                identifier.includes(
                  "@",
                )
                  ? identifier
                  : undefined,
            },
            {
              phone:
                identifier.replace(
                  /\D/g,
                  "",
                ),
            },
          ].filter(
            (item) =>
              Object.values(
                item,
              ).some(
                (value) =>
                  Boolean(value),
              ),
          ),
        },
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      });

    if (
      user?.email &&
      user.passwordHash
    ) {
      const token =
        createPasswordResetToken(
          user.id,
          user.passwordHash,
        );

      const resetUrl =
        new URL(
          "/reset-password",
          request.url,
        );

      resetUrl.searchParams.set(
        "token",
        token,
      );

      const delivery =
        await sendPasswordResetEmail({
          to: user.email,
          resetUrl:
            resetUrl.toString(),
        });

      if (
        delivery.configured &&
        !delivery.sent
      ) {
        console.error(
          "Password reset email delivery failed.",
        );
      }
    }

    return NextResponse.json({
      success: true,
      deliveryConfigured:
        true,
      message:
        "If the account has a registered email, a password reset link has been sent. Mobile-only accounts can contact AS Fashions support.",
    });
  } catch (error) {
    console.error(
      "POST /api/auth/forgot-password failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to process the password reset request right now.",
      },
      {
        status: 500,
      },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedCustomer,
} from "@/lib/customer-auth";
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

function validEmail(
  value: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

export async function GET() {
  const user =
    await getAuthenticatedCustomer();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Login required.",
      },
      {
        status: 401,
      },
    );
  }

  const application =
    await prisma.resellerApplication.findUnique({
      where: {
        userId:
          user.id,
      },
    });

  return NextResponse.json({
    success: true,
    isReseller:
      user.isReseller,
    application,
  });
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
          "reseller-application",
        limit: 5,
        windowSeconds:
          60 * 30,
      },
    );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const user =
    await getAuthenticatedCustomer();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Login required.",
      },
      {
        status: 401,
      },
    );
  }

  if (user.isReseller) {
    return NextResponse.json(
      {
        error:
          "This account is already an approved reseller.",
      },
      {
        status: 409,
      },
    );
  }

  try {
    const body =
      await request.json();

    const email =
      cleanString(
        body.email ??
          user.email,
      ).toLowerCase();

    const businessName =
      cleanString(
        body.businessName,
      );

    const businessPhone =
      cleanString(
        body.businessPhone,
      );

    const gstNumber =
      cleanString(
        body.gstNumber,
      ).toUpperCase();

    const addressLine =
      cleanString(
        body.addressLine,
      );

    const city =
      cleanString(body.city);

    const state =
      cleanString(body.state);

    const pincode =
      cleanString(
        body.pincode,
      );

    const mapsUrl =
      cleanString(
        body.mapsUrl,
      );

    if (
      !email ||
      !validEmail(email)
    ) {
      return NextResponse.json(
        {
          error:
            "A valid business email is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      businessName.length < 2
    ) {
      return NextResponse.json(
        {
          error:
            "Business or shop name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !/^[6-9]\d{9}$/.test(
        businessPhone,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid business mobile number.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      addressLine.length < 5
    ) {
      return NextResponse.json(
        {
          error:
            "Enter the complete shop or business address.",
        },
        {
          status: 400,
        },
      );
    }

    if (!city || !state) {
      return NextResponse.json(
        {
          error:
            "Business city and state are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !/^\d{6}$/.test(
        pincode,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid 6-digit pincode.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      mapsUrl &&
      !/^https?:\/\//i.test(
        mapsUrl,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid Google Maps location link.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      gstNumber &&
      !/^[0-9A-Z]{15}$/.test(
        gstNumber,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "GSTIN must be 15 characters.",
        },
        {
          status: 400,
        },
      );
    }

    const existing =
      await prisma.resellerApplication.findUnique({
        where: {
          userId:
            user.id,
        },
      });

    if (
      existing?.status ===
      "PENDING"
    ) {
      return NextResponse.json(
        {
          error:
            "Your retailer application is already under review.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      existing?.status ===
      "APPROVED"
    ) {
      return NextResponse.json(
        {
          error:
            "Your retailer application is already approved.",
        },
        {
          status: 409,
        },
      );
    }

    const emailOwner =
      await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      });

    if (
      emailOwner &&
      emailOwner.id !==
        user.id
    ) {
      return NextResponse.json(
        {
          error:
            "This email is already used by another account.",
        },
        {
          status: 409,
        },
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          await tx.user.update({
            where: {
              id:
                user.id,
            },
            data: {
              email,
            },
          });

          return tx.resellerApplication.upsert({
            where: {
              userId:
                user.id,
            },

            create: {
              userId:
                user.id,
              businessName,
              businessPhone,
              gstNumber:
                gstNumber ||
                null,
              addressLine,
              city,
              state,
              pincode,
              mapsUrl:
                mapsUrl ||
                null,
              status:
                "PENDING",
            },

            update: {
              businessName,
              businessPhone,
              gstNumber:
                gstNumber ||
                null,
              addressLine,
              city,
              state,
              pincode,
              mapsUrl:
                mapsUrl ||
                null,
              status:
                "PENDING",
              rejectionReason:
                null,
              reviewedAt:
                null,
            },
          });
        },
      );

    return NextResponse.json({
      success: true,
      application:
        result,
    });
  } catch (error) {
    console.error(
      "POST /api/reseller-application failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to submit retailer application.",
      },
      {
        status: 500,
      },
    );
  }
}

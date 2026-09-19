import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedCustomer,
} from "@/lib/customer-auth";
import {
  enforcePublicRateLimit,
  requireSameOriginJson,
} from "@/lib/public-write-security";
import {
  normalizeRetailerState,
} from "@/lib/retailer-locations";

function cleanString(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

function validVerificationImageUrl(
  value: string,
) {
  try {
    const url =
      new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(
        ".blob.vercel-storage.com",
      )
    );
  } catch {
    return false;
  }
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
      normalizeRetailerState(
        cleanString(
          body.state,
        ),
      );

    const pincode =
      cleanString(
        body.pincode,
      );

    const latitude =
      Number(
        body.latitude,
      );

    const longitude =
      Number(
        body.longitude,
      );

    const locationAccuracy =
      body.locationAccuracy ===
      null ||
      body.locationAccuracy ===
      undefined ||
      body.locationAccuracy ===
      ""
        ? null
        : Number(
            body.locationAccuracy,
          );

    const visitingCardUrl =
      cleanString(
        body.visitingCardUrl,
      );

    const shopPhotoUrls: string[] =
      Array.isArray(
        body.shopPhotoUrls,
      )
        ? body.shopPhotoUrls
            .map(cleanString)
            .filter(Boolean)
            .slice(0, 3)
        : [];

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

    if (!state) {
      return NextResponse.json(
        {
          error:
            "Retailer verification is currently available in Andhra Pradesh and Telangana only.",
        },
        {
          status: 400,
        },
      );
    }

    if (!city) {
      return NextResponse.json(
        {
          error:
            "Select your business city or town.",
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
      !Number.isFinite(
        latitude,
      ) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(
        longitude,
      ) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          error:
            "Please capture your live shop location.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      locationAccuracy !== null &&
      (
        !Number.isFinite(
          locationAccuracy,
        ) ||
        locationAccuracy < 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid location accuracy.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !visitingCardUrl ||
      !validVerificationImageUrl(
        visitingCardUrl,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Visiting card photo is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      shopPhotoUrls.length < 1 ||
      shopPhotoUrls.length > 3 ||
      shopPhotoUrls.some(
        (url) =>
          !validVerificationImageUrl(
            url,
          ),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Upload 1 to 3 valid shop photos.",
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

    const existingPendingIsComplete =
      existing?.status ===
        "PENDING" &&
      Boolean(
        existing.visitingCardUrl,
      ) &&
      Array.isArray(
        existing.shopPhotoUrls,
      ) &&
      existing.shopPhotoUrls.length >
        0 &&
      typeof existing.latitude ===
        "number" &&
      typeof existing.longitude ===
        "number";

    if (
      existingPendingIsComplete
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
                null,
              latitude,
              longitude,
              locationAccuracy,
              locationCapturedAt:
                new Date(),
              visitingCardUrl,
              shopPhotoUrls,
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
                null,
              latitude,
              longitude,
              locationAccuracy,
              locationCapturedAt:
                new Date(),
              visitingCardUrl,
              shopPhotoUrls,
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

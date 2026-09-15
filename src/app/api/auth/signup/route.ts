import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_OPTIONS,
  createCustomerSessionToken,
} from "@/lib/customer-session";
import {
  getAuthenticatedCustomer,
} from "@/lib/customer-auth";
import {
  hashPassword,
  validatePassword,
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

function validEmail(
  value: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
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
          "customer-signup",
        limit: 8,
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

    const name =
      cleanString(body.name);

    const phone =
      cleanString(body.phone);

    const email =
      cleanString(
        body.email,
      ).toLowerCase();

    const password =
      String(
        body.password ?? "",
      );

    const accountType =
      cleanString(
        body.accountType,
      ).toUpperCase();

    const wantsReseller =
      accountType ===
      "RESELLER";

    if (
      accountType !== "RETAIL" &&
      accountType !== "RESELLER"
    ) {
      return NextResponse.json(
        {
          error:
            "Choose Customer or Retailer registration.",
        },
        {
          status: 400,
        },
      );
    }

    if (name.length < 2) {
      return NextResponse.json(
        {
          error:
            "Enter your full name.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !/^[6-9]\d{9}$/.test(
        phone,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid 10-digit mobile number.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      email &&
      !validEmail(email)
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      wantsReseller &&
      !email
    ) {
      return NextResponse.json(
        {
          error:
            "Email is required for retailer registration.",
        },
        {
          status: 400,
        },
      );
    }

    const passwordError =
      validatePassword(
        password,
      );

    if (passwordError) {
      return NextResponse.json(
        {
          error:
            passwordError,
        },
        {
          status: 400,
        },
      );
    }

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

    if (wantsReseller) {
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
    }

    const currentSessionUser =
      await getAuthenticatedCustomer();

    const phoneOwner =
      await prisma.user.findUnique({
        where: {
          phone,
        },
      });

    const emailOwner =
      email
        ? await prisma.user.findUnique({
            where: {
              email,
            },
          })
        : null;

    /*
     * Existing guest checkout accounts
     * may safely become full accounts only
     * when the browser already owns that
     * signed customer session.
     */
    const sessionOwnsPhone =
      Boolean(
        currentSessionUser &&
        phoneOwner &&
        currentSessionUser.id ===
          phoneOwner.id,
      );

    if (
      phoneOwner &&
      !sessionOwnsPhone
    ) {
      return NextResponse.json(
        {
          error:
            "An account already exists with this mobile number. Please log in.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      emailOwner &&
      emailOwner.id !==
        currentSessionUser?.id
    ) {
      return NextResponse.json(
        {
          error:
            "An account already exists with this email address.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      phoneOwner?.passwordHash
    ) {
      return NextResponse.json(
        {
          error:
            "This account is already registered. Please log in.",
        },
        {
          status: 409,
        },
      );
    }

    const passwordHash =
      await hashPassword(
        password,
      );

    const result =
      await prisma.$transaction(
        async (tx) => {
          const user =
            phoneOwner
              ? await tx.user.update({
                  where: {
                    id:
                      phoneOwner.id,
                  },
                  data: {
                    name,
                    email:
                      email || null,
                    passwordHash,
                  },
                })
              : await tx.user.create({
                  data: {
                    name,
                    phone,
                    email:
                      email || null,
                    passwordHash,
                    role:
                      "CUSTOMER",
                    status:
                      "ACTIVE",
                    isReseller:
                      false,
                  },
                });

          let applicationStatus:
            string | null =
              null;

          if (wantsReseller) {
            const existingApplication =
              await tx.resellerApplication.findUnique({
                where: {
                  userId:
                    user.id,
                },
              });

            if (
              existingApplication
                ?.status ===
              "APPROVED"
            ) {
              applicationStatus =
                "APPROVED";
            } else {
              const application =
                await tx.resellerApplication.upsert({
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

              applicationStatus =
                application.status;
            }
          }

          return {
            user,
            applicationStatus,
          };
        },
      );

    const response =
      NextResponse.json(
        {
          success: true,

          user: {
            id:
              result.user.id,
            name:
              result.user.name,
            email:
              result.user.email,
            phone:
              result.user.phone,
            isReseller:
              result.user
                .isReseller,
          },

          resellerApplicationStatus:
            result.applicationStatus,
        },
        {
          status: 201,
        },
      );

    response.cookies.set(
      CUSTOMER_SESSION_COOKIE,
      createCustomerSessionToken(
        result.user.id,
      ),
      CUSTOMER_SESSION_OPTIONS,
    );

    return response;
  } catch (error) {
    console.error(
      "POST /api/auth/signup failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to create account right now.",
      },
      {
        status: 500,
      },
    );
  }
}

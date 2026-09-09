import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedCustomerId,
} from "@/lib/customer-auth";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function validateAddress(body: any) {
  const name = cleanString(body.name);
  const phone = cleanString(body.phone);
  const addressLine1 = cleanString(
    body.addressLine1,
  );
  const addressLine2 = cleanString(
    body.addressLine2,
  );
  const city = cleanString(body.city);
  const state = cleanString(body.state);
  const pincode = cleanString(body.pincode);
  const landmark = cleanString(
    body.landmark,
  );

  if (!name) {
    throw new Error(
      "Name is required.",
    );
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error(
      "Valid mobile number is required.",
    );
  }

  if (!addressLine1) {
    throw new Error(
      "Address is required.",
    );
  }

  if (!city) {
    throw new Error(
      "City is required.",
    );
  }

  if (!state) {
    throw new Error(
      "State is required.",
    );
  }

  if (!/^\d{6}$/.test(pincode)) {
    throw new Error(
      "Valid 6-digit pincode is required.",
    );
  }

  return {
    name,
    phone,
    addressLine1,
    addressLine2:
      addressLine2 || null,
    city,
    state,
    pincode,
    landmark:
      landmark || null,
  };
}

export async function GET() {
  try {
    const userId =
      await getAuthenticatedCustomerId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "No customer session found.",
        },
        { status: 401 },
      );
    }

    const addresses =
      await prisma.address.findMany({
        where: {
          userId,
        },
        orderBy: [
          {
            isDefault: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    return NextResponse.json({
      success: true,
      addresses,
      count: addresses.length,
    });
  } catch (error) {
    console.error(
      "GET /api/addresses failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load addresses.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const userId =
      await getAuthenticatedCustomerId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in or place an order first.",
        },
        { status: 401 },
      );
    }

    const body =
      await request.json();

    let data;

    try {
      data =
        validateAddress(body);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid address.",
        },
        { status: 400 },
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Reuse exact same saved
           * address instead of creating
           * a duplicate.
           */
          const existing =
            await tx.address.findFirst({
              where: {
                userId,
                name: data.name,
                phone: data.phone,
                addressLine1:
                  data.addressLine1,
                addressLine2:
                  data.addressLine2,
                city: data.city,
                state: data.state,
                pincode: data.pincode,
                landmark:
                  data.landmark,
              },
            });

          if (existing) {
            if (
              body.isDefault === true &&
              !existing.isDefault
            ) {
              await tx.address.updateMany({
                where: {
                  userId,
                  id: {
                    not: existing.id,
                  },
                },
                data: {
                  isDefault: false,
                },
              });

              return tx.address.update({
                where: {
                  id: existing.id,
                },
                data: {
                  isDefault: true,
                },
              });
            }

            return existing;
          }

          const addressCount =
            await tx.address.count({
              where: {
                userId,
              },
            });

          const makeDefault =
            body.isDefault === true ||
            addressCount === 0;

          if (makeDefault) {
            await tx.address.updateMany({
              where: {
                userId,
              },
              data: {
                isDefault: false,
              },
            });
          }

          return tx.address.create({
            data: {
              userId,
              ...data,
              isDefault:
                makeDefault,
            },
          });
        },
      );

    return NextResponse.json(
      {
        success: true,
        address: result,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/addresses failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to save address.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const userId =
      await getAuthenticatedCustomerId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "No customer session found.",
        },
        { status: 401 },
      );
    }

    const body =
      await request.json();

    const addressId =
      cleanString(body.addressId);

    if (!addressId) {
      return NextResponse.json(
        {
          error:
            "Address ID is required.",
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Address not found.",
        },
        { status: 404 },
      );
    }

    if (body.makeDefault === true) {
      const updated =
        await prisma.$transaction(
          async (tx) => {
            await tx.address.updateMany({
              where: {
                userId,
              },
              data: {
                isDefault: false,
              },
            });

            return tx.address.update({
              where: {
                id: addressId,
              },
              data: {
                isDefault: true,
              },
            });
          },
        );

      return NextResponse.json({
        success: true,
        address: updated,
      });
    }

    let data;

    try {
      data =
        validateAddress(body);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid address.",
        },
        { status: 400 },
      );
    }

    const updated =
      await prisma.address.update({
        where: {
          id: addressId,
        },
        data,
      });

    return NextResponse.json({
      success: true,
      address: updated,
    });
  } catch (error) {
    console.error(
      "PATCH /api/addresses failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update address.",
      },
      { status: 500 },
    );
  }
}

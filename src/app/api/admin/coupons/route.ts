import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
} from "@/lib/admin-auth";

function cleanString(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

function optionalAmount(
  value: unknown,
) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : NaN;
}

function optionalDate(
  value: unknown,
) {
  const raw =
    cleanString(value);

  if (!raw) {
    return null;
  }

  const date =
    new Date(raw);

  return Number.isNaN(
    date.getTime(),
  )
    ? undefined
    : date;
}

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const coupons =
      await prisma.coupon.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,
      coupons:
        coupons.map(
          (coupon) => ({
            ...coupon,
            discountValue:
              Number(
                coupon.discountValue,
              ),
            minOrderValue:
              coupon.minOrderValue ===
              null
                ? null
                : Number(
                    coupon.minOrderValue,
                  ),
            maxDiscount:
              coupon.maxDiscount ===
              null
                ? null
                : Number(
                    coupon.maxDiscount,
                  ),
          }),
        ),
    });
  } catch (error) {
    console.error(
      "GET admin coupons failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load coupons.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const code =
      cleanString(
        body.code,
      ).toUpperCase();

    const discountType =
      cleanString(
        body.discountType,
      );

    const discountValue =
      Number(
        body.discountValue,
      );

    const minOrderValue =
      optionalAmount(
        body.minOrderValue,
      );

    const maxDiscount =
      optionalAmount(
        body.maxDiscount,
      );

    const startsAt =
      optionalDate(
        body.startsAt,
      );

    const expiresAt =
      optionalDate(
        body.expiresAt,
      );

    if (
      !/^[A-Z0-9_-]{3,30}$/.test(
        code,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Coupon code must be 3-30 letters, numbers, - or _.",
        },
        { status: 400 },
      );
    }

    if (
      discountType !==
        "PERCENTAGE" &&
      discountType !== "FIXED"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid discount type.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(
        discountValue,
      ) ||
      discountValue <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Discount value must be greater than 0.",
        },
        { status: 400 },
      );
    }

    if (
      discountType ===
        "PERCENTAGE" &&
      discountValue > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Percentage discount cannot exceed 100%.",
        },
        { status: 400 },
      );
    }

    if (
      Number.isNaN(
        minOrderValue,
      ) ||
      Number.isNaN(
        maxDiscount,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid amount.",
        },
        { status: 400 },
      );
    }

    if (
      minOrderValue !== null &&
      minOrderValue < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum order value cannot be negative.",
        },
        { status: 400 },
      );
    }

    if (
      maxDiscount !== null &&
      maxDiscount < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Maximum discount cannot be negative.",
        },
        { status: 400 },
      );
    }

    if (
      startsAt === undefined ||
      expiresAt === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid coupon date.",
        },
        { status: 400 },
      );
    }

    if (
      startsAt &&
      expiresAt &&
      expiresAt <= startsAt
    ) {
      return NextResponse.json(
        {
          error:
            "Expiry must be after start date.",
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.coupon.findUnique({
        where: {
          code,
        },
        select: {
          id: true,
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Coupon code already exists.",
        },
        { status: 409 },
      );
    }

    const coupon =
      await prisma.coupon.create({
        data: {
          code,
          discountType:
            discountType as
              | "PERCENTAGE"
              | "FIXED",
          discountValue,
          minOrderValue,
          maxDiscount,
          startsAt,
          expiresAt,
          isActive:
            body.isActive !==
            false,
          resellerOnly:
            body.resellerOnly ===
            true,
        },
      });

    return NextResponse.json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error(
      "POST admin coupon failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to create coupon.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const id =
      cleanString(
        body.id,
      );

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Coupon ID is required.",
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.coupon.findUnique({
        where: { id },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Coupon not found.",
        },
        { status: 404 },
      );
    }

    const data: {
      code?: string;
      discountType?:
        | "PERCENTAGE"
        | "FIXED";
      discountValue?: number;
      minOrderValue?: number | null;
      maxDiscount?: number | null;
      startsAt?: Date | null;
      expiresAt?: Date | null;
      isActive?: boolean;
      resellerOnly?: boolean;
    } = {};

    if (
      body.code !== undefined
    ) {
      const code =
        cleanString(
          body.code,
        ).toUpperCase();

      if (
        !/^[A-Z0-9_-]{3,30}$/.test(
          code,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid coupon code.",
          },
          { status: 400 },
        );
      }

      const duplicate =
        await prisma.coupon.findFirst({
          where: {
            code,
            NOT: {
              id,
            },
          },
          select: {
            id: true,
          },
        });

      if (duplicate) {
        return NextResponse.json(
          {
            error:
              "Coupon code already exists.",
          },
          { status: 409 },
        );
      }

      data.code = code;
    }

    if (
      body.discountType !==
      undefined
    ) {
      const type =
        cleanString(
          body.discountType,
        );

      if (
        type !== "PERCENTAGE" &&
        type !== "FIXED"
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid discount type.",
          },
          { status: 400 },
        );
      }

      data.discountType =
        type;
    }

    if (
      body.discountValue !==
      undefined
    ) {
      const value =
        Number(
          body.discountValue,
        );

      const effectiveType =
        data.discountType ??
        existing.discountType;

      if (
        !Number.isFinite(value) ||
        value <= 0 ||
        (effectiveType ===
          "PERCENTAGE" &&
          value > 100)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid discount value.",
          },
          { status: 400 },
        );
      }

      data.discountValue =
        value;
    }

    /*
     * Validate the final combined discount state.
     *
     * Important when PATCH changes only
     * FIXED -> PERCENTAGE without sending
     * discountValue again.
     */
    const effectiveDiscountType =
      data.discountType ??
      existing.discountType;

    const effectiveDiscountValue =
      data.discountValue ??
      Number(existing.discountValue);

    if (
      !Number.isFinite(
        effectiveDiscountValue,
      ) ||
      effectiveDiscountValue <= 0 ||
      (effectiveDiscountType ===
        "PERCENTAGE" &&
        effectiveDiscountValue > 100)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid discount value.",
        },
        { status: 400 },
      );
    }

    for (const field of [
      "minOrderValue",
      "maxDiscount",
    ] as const) {
      if (
        body[field] !==
        undefined
      ) {
        const value =
          optionalAmount(
            body[field],
          );

        if (
          Number.isNaN(value) ||
          (value !== null &&
            value < 0)
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid coupon amount.",
            },
            { status: 400 },
          );
        }

        data[field] =
          value;
      }
    }

    if (
      body.startsAt !==
      undefined
    ) {
      const value =
        optionalDate(
          body.startsAt,
        );

      if (
        value === undefined
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid start date.",
          },
          { status: 400 },
        );
      }

      data.startsAt =
        value;
    }

    if (
      body.expiresAt !==
      undefined
    ) {
      const value =
        optionalDate(
          body.expiresAt,
        );

      if (
        value === undefined
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid expiry date.",
          },
          { status: 400 },
        );
      }

      data.expiresAt =
        value;
    }

    const effectiveStart =
      data.startsAt !==
      undefined
        ? data.startsAt
        : existing.startsAt;

    const effectiveExpiry =
      data.expiresAt !==
      undefined
        ? data.expiresAt
        : existing.expiresAt;

    if (
      effectiveStart &&
      effectiveExpiry &&
      effectiveExpiry <=
        effectiveStart
    ) {
      return NextResponse.json(
        {
          error:
            "Expiry must be after start date.",
        },
        { status: 400 },
      );
    }

    if (
      typeof body.isActive ===
      "boolean"
    ) {
      data.isActive =
        body.isActive;
    }

    if (
      typeof body.resellerOnly ===
      "boolean"
    ) {
      data.resellerOnly =
        body.resellerOnly;
    }

    const coupon =
      await prisma.coupon.update({
        where: { id },
        data,
      });

    return NextResponse.json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error(
      "PATCH admin coupon failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update coupon.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const id =
      cleanString(
        body.id,
      );

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Coupon ID is required.",
        },
        { status: 400 },
      );
    }

    const deleted =
      await prisma.coupon.deleteMany({
        where: { id },
      });

    if (deleted.count === 0) {
      return NextResponse.json(
        {
          error:
            "Coupon not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE admin coupon failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete coupon.",
      },
      { status: 500 },
    );
  }
}

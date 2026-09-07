import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  evaluateCoupon,
  type CouponOrderType,
} from "@/lib/coupon";

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
  try {
    const body =
      await request.json();

    const code =
      cleanString(
        body.code,
      ).toUpperCase();

    const subtotal =
      Number(body.subtotal);

    const type =
      cleanString(
        body.type,
      ).toUpperCase();

    if (!code) {
      return NextResponse.json(
        {
          error:
            "Enter a coupon code.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(
        subtotal,
      ) ||
      subtotal <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid cart subtotal.",
        },
        { status: 400 },
      );
    }

    if (
      type !== "RETAIL" &&
      type !== "RESELLER"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid order type.",
        },
        { status: 400 },
      );
    }

    const coupon =
      await prisma.coupon.findUnique({
        where: {
          code,
        },
      });

    if (!coupon) {
      return NextResponse.json(
        {
          error:
            "Coupon code not found.",
        },
        { status: 404 },
      );
    }

    const result =
      evaluateCoupon(
        coupon,
        subtotal,
        type as CouponOrderType,
      );

    if (!result.valid) {
      return NextResponse.json(
        {
          error:
            result.error,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: result.code,
        discountAmount:
          result.discountAmount,
        discountType:
          coupon.discountType,
        discountValue:
          Number(
            coupon.discountValue,
          ),
      },
    });
  } catch (error) {
    console.error(
      "Coupon validation failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to validate coupon.",
      },
      { status: 500 },
    );
  }
}

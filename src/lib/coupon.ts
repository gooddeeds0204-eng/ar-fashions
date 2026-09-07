export type CouponOrderType =
  | "RETAIL"
  | "RESELLER";

export type CouponForValidation = {
  code: string;
  discountType:
    | "PERCENTAGE"
    | "FIXED";
  discountValue: unknown;
  minOrderValue: unknown | null;
  maxDiscount: unknown | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  resellerOnly: boolean;
};

function amount(
  value: unknown,
) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : 0;
}

function roundMoney(
  value: number,
) {
  return Math.round(
    value * 100,
  ) / 100;
}

export function evaluateCoupon(
  coupon: CouponForValidation,
  subtotal: number,
  orderType: CouponOrderType,
  now = new Date(),
) {
  if (!coupon.isActive) {
    return {
      valid: false as const,
      error:
        "This coupon is inactive.",
    };
  }

  if (
    coupon.startsAt &&
    now < coupon.startsAt
  ) {
    return {
      valid: false as const,
      error:
        "This coupon is not active yet.",
    };
  }

  if (
    coupon.expiresAt &&
    now > coupon.expiresAt
  ) {
    return {
      valid: false as const,
      error:
        "This coupon has expired.",
    };
  }

  if (
    coupon.resellerOnly &&
    orderType !== "RESELLER"
  ) {
    return {
      valid: false as const,
      error:
        "This coupon is only for reseller orders.",
    };
  }

  const minOrderValue =
    coupon.minOrderValue ===
      null ||
    coupon.minOrderValue ===
      undefined
      ? null
      : amount(
          coupon.minOrderValue,
        );

  if (
    minOrderValue !== null &&
    subtotal < minOrderValue
  ) {
    return {
      valid: false as const,
      error:
        `Minimum order value is ₹${minOrderValue.toLocaleString(
          "en-IN",
        )}.`,
    };
  }

  const discountValue =
    amount(
      coupon.discountValue,
    );

  if (discountValue <= 0) {
    return {
      valid: false as const,
      error:
        "This coupon has an invalid discount.",
    };
  }

  let discountAmount = 0;

  if (
    coupon.discountType ===
    "PERCENTAGE"
  ) {
    discountAmount =
      subtotal *
      (discountValue / 100);
  } else {
    discountAmount =
      discountValue;
  }

  const maxDiscount =
    coupon.maxDiscount ===
      null ||
    coupon.maxDiscount ===
      undefined
      ? null
      : amount(
          coupon.maxDiscount,
        );

  if (
    maxDiscount !== null &&
    maxDiscount > 0
  ) {
    discountAmount =
      Math.min(
        discountAmount,
        maxDiscount,
      );
  }

  discountAmount =
    Math.min(
      discountAmount,
      subtotal,
    );

  discountAmount =
    roundMoney(
      discountAmount,
    );

  return {
    valid: true as const,
    code:
      coupon.code.toUpperCase(),
    discountAmount,
  };
}

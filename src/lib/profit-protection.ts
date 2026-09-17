export const PROFIT_WARNING_MARGIN_PERCENT = 20;
export const PROFIT_SUGGESTED_MARGIN_PERCENT = 30;

export type ProfitHealth =
  | "NO_COST"
  | "LOSS"
  | "LOW_MARGIN"
  | "HEALTHY";

export function toFinitePrice(
  value: number | string | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : null;
}

export function effectiveSellingPrice(
  variantPrice: number | string | null | undefined,
  productPrice: number | string | null | undefined,
) {
  return (
    toFinitePrice(variantPrice) ??
    toFinitePrice(productPrice)
  );
}

export function grossMarginPercent(
  sellingPrice: number | null,
  costPrice: number | null,
) {
  if (
    sellingPrice === null ||
    costPrice === null ||
    sellingPrice <= 0
  ) {
    return null;
  }

  return ((sellingPrice - costPrice) / sellingPrice) * 100;
}

export function priceForMargin(
  costPrice: number | null,
  marginPercent: number,
) {
  if (costPrice === null || costPrice < 0) {
    return null;
  }

  const margin = Math.min(
    99.99,
    Math.max(0, marginPercent),
  );

  const price = costPrice / (1 - margin / 100);

  return Math.ceil(price * 100) / 100;
}

export function getProfitHealth(
  marginPercent: number | null,
  warningMarginPercent = PROFIT_WARNING_MARGIN_PERCENT,
): ProfitHealth {
  if (marginPercent === null) {
    return "NO_COST";
  }

  if (marginPercent < 0) {
    return "LOSS";
  }

  if (marginPercent < warningMarginPercent) {
    return "LOW_MARGIN";
  }

  return "HEALTHY";
}

export function calculateProfitProtection(input: {
  costPrice: number | string | null | undefined;
  variantRetailPrice?: number | string | null;
  productRetailPrice: number | string | null | undefined;
  variantResellerPrice?: number | string | null;
  productResellerPrice?: number | string | null;
  warningMarginPercent?: number;
  suggestedMarginPercent?: number;
}) {
  const warningMarginPercent =
    input.warningMarginPercent ??
    PROFIT_WARNING_MARGIN_PERCENT;

  const suggestedMarginPercent =
    input.suggestedMarginPercent ??
    PROFIT_SUGGESTED_MARGIN_PERCENT;

  const cost = toFinitePrice(input.costPrice);

  const retailPrice = effectiveSellingPrice(
    input.variantRetailPrice,
    input.productRetailPrice,
  );

  const resellerPrice = effectiveSellingPrice(
    input.variantResellerPrice,
    input.productResellerPrice,
  );

  const retailMargin = grossMarginPercent(
    retailPrice,
    cost,
  );

  const resellerMargin = grossMarginPercent(
    resellerPrice,
    cost,
  );

  return {
    cost,
    retailPrice,
    resellerPrice,
    retailMargin,
    resellerMargin,
    retailHealth: getProfitHealth(
      retailMargin,
      warningMarginPercent,
    ),
    resellerHealth: getProfitHealth(
      resellerMargin,
      warningMarginPercent,
    ),
    minimumSafePrice: priceForMargin(
      cost,
      warningMarginPercent,
    ),
    suggestedPrice: priceForMargin(
      cost,
      suggestedMarginPercent,
    ),
    warningMarginPercent,
    suggestedMarginPercent,
  };
}

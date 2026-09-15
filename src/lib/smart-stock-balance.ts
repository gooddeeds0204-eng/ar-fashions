export type SmartStockVariantInput = {
  id: string;
  colorId: string;
  sizeId: string;
  stock: number;
  isActive?: boolean;
};

export type SmartStockPlan = {
  ok: boolean;
  allocation: Record<string, number>;
  totalStock: number;
  availableVariantCount: number;
  targetQuantity: number;
  reason: string | null;
};

function normalizeVariants(
  variants: SmartStockVariantInput[],
) {
  return variants
    .filter(
      (variant) =>
        variant.isActive !== false &&
        Number.isFinite(
          Number(variant.stock),
        ) &&
        Math.floor(
          Number(variant.stock),
        ) > 0,
    )
    .map((variant) => ({
      ...variant,
      stock: Math.floor(
        Number(variant.stock),
      ),
    }))
    .sort((a, b) => {
      const colorCompare =
        a.colorId.localeCompare(
          b.colorId,
        );

      if (colorCompare !== 0) {
        return colorCompare;
      }

      const sizeCompare =
        a.sizeId.localeCompare(
          b.sizeId,
        );

      if (sizeCompare !== 0) {
        return sizeCompare;
      }

      return a.id.localeCompare(
        b.id,
      );
    });
}

export function getSmartStockPackSize(
  variants: SmartStockVariantInput[],
  resellerMOQ: number | null | undefined,
) {
  const available =
    normalizeVariants(
      variants,
    );

  if (available.length === 0) {
    return 0;
  }

  const moq =
    Math.max(
      1,
      Math.floor(
        Number(
          resellerMOQ ?? 1,
        ) || 1,
      ),
    );

  /*
   * One smart pack must be large enough
   * to include every currently available
   * colour-size combination at least once.
   */
  return Math.max(
    moq,
    available.length,
  );
}

export function buildSmartStockAllocation(
  variants: SmartStockVariantInput[],
  targetQuantity: number,
): SmartStockPlan {
  const available =
    normalizeVariants(
      variants,
    );

  const totalStock =
    available.reduce(
      (total, variant) =>
        total + variant.stock,
      0,
    );

  const target =
    Math.max(
      0,
      Math.floor(
        Number(targetQuantity) || 0,
      ),
    );

  const allocation:
    Record<string, number> = {};

  if (available.length === 0) {
    return {
      ok: false,
      allocation,
      totalStock,
      availableVariantCount: 0,
      targetQuantity: target,
      reason:
        "No reseller stock is currently available.",
    };
  }

  if (
    target <
    available.length
  ) {
    return {
      ok: false,
      allocation,
      totalStock,
      availableVariantCount:
        available.length,
      targetQuantity: target,
      reason:
        "Pack quantity is too small to cover all available colours and sizes.",
    };
  }

  if (target > totalStock) {
    return {
      ok: false,
      allocation,
      totalStock,
      availableVariantCount:
        available.length,
      targetQuantity: target,
      reason:
        `Only ${totalStock} pieces are currently available for this smart pack.`,
    };
  }

  /*
   * Step 1:
   * Every available colour-size
   * combination gets one piece.
   */
  for (
    const variant of available
  ) {
    allocation[variant.id] =
      1;
  }

  let remaining =
    target -
    available.length;

  /*
   * Step 2:
   * Extra pieces always come from the
   * variant with the highest remaining
   * stock.
   *
   * This continuously pulls down high
   * stock variants and keeps remaining
   * stock levels balanced.
   */
  while (remaining > 0) {
    let best:
      | SmartStockVariantInput
      | null = null;

    let bestRemaining = -1;

    for (
      const variant of available
    ) {
      const allocated =
        allocation[
          variant.id
        ] ?? 0;

      const stockRemaining =
        variant.stock -
        allocated;

      if (
        stockRemaining <= 0
      ) {
        continue;
      }

      if (
        stockRemaining >
        bestRemaining
      ) {
        best = variant;
        bestRemaining =
          stockRemaining;
        continue;
      }

      if (
        stockRemaining ===
          bestRemaining &&
        best
      ) {
        const bestAllocated =
          allocation[
            best.id
          ] ?? 0;

        /*
         * When two variants have the
         * same remaining stock, spread
         * extras across the variant that
         * has received fewer pieces so
         * far instead of repeatedly
         * loading one size.
         */
        if (
          allocated <
          bestAllocated
        ) {
          best = variant;
          continue;
        }

        if (
          allocated ===
            bestAllocated &&
          variant.id.localeCompare(
            best.id,
          ) < 0
        ) {
          best = variant;
        }
      }
    }

    if (!best) {
      return {
        ok: false,
        allocation,
        totalStock,
        availableVariantCount:
          available.length,
        targetQuantity: target,
        reason:
          "Not enough stock is available to complete this smart pack.",
      };
    }

    allocation[best.id] =
      (allocation[
        best.id
      ] ?? 0) + 1;

    remaining -= 1;
  }

  return {
    ok: true,
    allocation,
    totalStock,
    availableVariantCount:
      available.length,
    targetQuantity: target,
    reason: null,
  };
}

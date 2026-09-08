import { requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function toInt(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || !Number.isInteger(number)) {
    return null;
  }

  return number;
}

const SLOW_STOCK_DAYS = 30;
const SLOW_STOCK_MAX_SALES = 1;

const SALES_MOVEMENT_STATUSES = [
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
] as const;

/**
 * GET /api/inventory
 *
 * Returns every active product variant with
 * product, color and size information.
 */
export async function GET(request: Request) {
  /* ADMIN_GUARD_GET */
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const { searchParams } = new URL(request.url);

    const search = cleanString(searchParams.get("search"));
    const filter = cleanString(searchParams.get("filter"));

    const slowStockCutoff =
      new Date(
        Date.now() -
          SLOW_STOCK_DAYS *
            24 *
            60 *
            60 *
            1000,
      );

    const variants = await prisma.productVariant.findMany({
      where: {
        isActive: true,

        ...(search
          ? {
              OR: [
                {
                  sku: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  product: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  color: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  size: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  size: {
                    inches: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            status: true,
            gender: true,
          },
        },

        color: {
          select: {
            id: true,
            name: true,
            family: true,
            hexCode: true,
          },
        },

        size: {
          select: {
            id: true,
            name: true,
            category: true,
            sizeType: true,
            inches: true,
          },
        },

        orderItems: {
          where: {
            order: {
              createdAt: {
                gte: slowStockCutoff,
              },
              status: {
                in: [
                  "CONFIRMED",
                  "PACKED",
                  "SHIPPED",
                  "DELIVERED",
                ],
              },
            },
          },
          select: {
            quantity: true,
          },
        },
      },

      orderBy: [
        {
          product: {
            name: "asc",
          },
        },
        {
          createdAt: "asc",
        },
      ],
    });

    function recentSalesQty(
      variant: (typeof variants)[number],
    ) {
      return variant.orderItems.reduce(
        (sum, item) =>
          sum + item.quantity,
        0,
      );
    }

    function isSlowStock(
      variant: (typeof variants)[number],
    ) {
      const availableStock =
        variant.stock -
        variant.reservedStock;

      const sold =
        recentSalesQty(
          variant,
        );

      return (
        availableStock > 5 &&
        variant.createdAt <=
          slowStockCutoff &&
        sold <=
          SLOW_STOCK_MAX_SALES
      );
    }

    const filtered = variants.filter((variant) => {
      const availableStock =
        variant.stock - variant.reservedStock;

      if (filter === "IN_STOCK") {
        return availableStock > 0;
      }

      if (filter === "LOW_STOCK") {
        return availableStock > 0 && availableStock <= 5;
      }

      if (filter === "OUT_OF_STOCK") {
        return availableStock <= 0;
      }

      if (filter === "SLOW_STOCK") {
        return isSlowStock(
          variant,
        );
      }

      return true;
    });

    const totalStock = variants.reduce(
      (sum, variant) => sum + variant.stock,
      0,
    );

    const totalReserved = variants.reduce(
      (sum, variant) => sum + variant.reservedStock,
      0,
    );

    const lowStock = variants.filter((variant) => {
      const available =
        variant.stock - variant.reservedStock;

      return available > 0 && available <= 5;
    }).length;

    const outOfStock = variants.filter(
      (variant) =>
        variant.stock - variant.reservedStock <= 0,
    ).length;

    const slowStock =
      variants.filter(
        (variant) =>
          isSlowStock(
            variant,
          ),
      ).length;

    return NextResponse.json({
      variants: filtered.map((variant) => ({
        id: variant.id,
        productId: variant.productId,
        product: variant.product,
        color: variant.color,
        size: variant.size,
        sku: variant.sku,
        stock: variant.stock,
        reservedStock: variant.reservedStock,
        availableStock:
          variant.stock - variant.reservedStock,
        recentSalesQty:
          recentSalesQty(
            variant,
          ),
        isSlowStock:
          isSlowStock(
            variant,
          ),
        slowStockDays:
          SLOW_STOCK_DAYS,
        costPrice: variant.costPrice
          ? Number(variant.costPrice)
          : null,
        retailPrice: variant.retailPrice
          ? Number(variant.retailPrice)
          : null,
        resellerPrice: variant.resellerPrice
          ? Number(variant.resellerPrice)
          : null,
        isActive: variant.isActive,
        updatedAt: variant.updatedAt,
      })),

      summary: {
        totalVariants: variants.length,
        totalStock,
        totalReserved,
        totalAvailable:
          totalStock - totalReserved,
        lowStock,
        outOfStock,
        slowStock,
      },
    });
  } catch (error) {
    console.error("GET /api/inventory failed:", error);

    return NextResponse.json(
      {
        error: "Failed to load inventory.",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/inventory
 *
 * Directly adjusts ProductVariant.stock.
 *
 * This endpoint is intentionally separate from
 * Product PUT so product editing cannot silently
 * recreate inventory variants.
 */
export async function PATCH(request: Request) {
  /* ADMIN_GUARD_PATCH */
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body = await request.json();

    const variantId = cleanString(body.variantId);
    const adjustment = toInt(body.adjustment);
    const reason = cleanString(body.reason);

    if (!variantId) {
      return NextResponse.json(
        {
          error: "Variant ID is required.",
        },
        { status: 400 },
      );
    }

    if (adjustment === null || adjustment === 0) {
      return NextResponse.json(
        {
          error:
            "Adjustment must be a non-zero whole number.",
        },
        { status: 400 },
      );
    }

    const variant = await prisma.productVariant.findUnique({
      where: {
        id: variantId,
      },
    });

    if (!variant) {
      return NextResponse.json(
        {
          error: "Inventory variant not found.",
        },
        { status: 404 },
      );
    }

    const newStock = variant.stock + adjustment;

    if (newStock < 0) {
      return NextResponse.json(
        {
          error: "Stock cannot be negative.",
        },
        { status: 400 },
      );
    }

    if (newStock < variant.reservedStock) {
      return NextResponse.json(
        {
          error: `Stock cannot be lower than reserved stock (${variant.reservedStock}).`,
        },
        { status: 400 },
      );
    }

    const updated =
      await prisma.productVariant.update({
        where: {
          id: variantId,
        },

        data: {
          stock: newStock,
        },

        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },

          color: {
            select: {
              id: true,
              name: true,
            },
          },

          size: {
            select: {
              id: true,
              name: true,
              inches: true,
            },
          },
        },
      });

    const result = {
      variant: updated,
      previousStock: variant.stock,
      adjustment,
      reason: reason || "MANUAL_ADJUSTMENT",
    };

    return NextResponse.json({
      success: true,

      inventory: {
        id: result.variant.id,
        product: result.variant.product,
        color: result.variant.color,
        size: result.variant.size,
        sku: result.variant.sku,
        previousStock: result.previousStock,
        adjustment: result.adjustment,
        stock: result.variant.stock,
        reservedStock:
          result.variant.reservedStock,
        availableStock:
          result.variant.stock -
          result.variant.reservedStock,
        reason: result.reason,
        updatedAt:
          result.variant.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "PATCH /api/inventory failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update inventory.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}

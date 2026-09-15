import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const LOW_STOCK_SETTING_KEY =
  "inventoryLowStockThreshold";

const CRITICAL_STOCK_SETTING_KEY =
  "inventoryCriticalStockThreshold";

const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const DEFAULT_CRITICAL_STOCK_THRESHOLD = 2;

const STOCK_SALES_STATUSES = [
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
] as const;

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const products =
      await prisma.product.count();

    const categories =
      await prisma.category.count({
        where: {
          isActive: true,
        },
      });

    const colors =
      await prisma.color.count({
        where: {
          isActive: true,
        },
      });

    const sizes =
      await prisma.size.count({
        where: {
          isActive: true,
        },
      });

    const salesMode =
      await prisma.salesMode.findFirst({
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          retailStatus: true,
          resellerStatus: true,
        },
      });

    const inventorySettings =
      await prisma.siteSetting.findMany({
        where: {
          key: {
            in: [
              LOW_STOCK_SETTING_KEY,
              CRITICAL_STOCK_SETTING_KEY,
            ],
          },
        },
        select: {
          key: true,
          value: true,
        },
      });

    const settingMap =
      new Map(
        inventorySettings.map(
          (item) => [
            item.key,
            item.value,
          ],
        ),
      );

    const parsedLow =
      Number(
        settingMap.get(
          LOW_STOCK_SETTING_KEY,
        ),
      );

    const lowStockThreshold =
      Number.isInteger(
        parsedLow,
      ) &&
      parsedLow >= 1 &&
      parsedLow <= 100
        ? parsedLow
        : DEFAULT_LOW_STOCK_THRESHOLD;

    const parsedCritical =
      Number(
        settingMap.get(
          CRITICAL_STOCK_SETTING_KEY,
        ),
      );

    const criticalStockThreshold =
      Number.isInteger(
        parsedCritical,
      ) &&
      parsedCritical >= 0 &&
      parsedCritical <
        lowStockThreshold
        ? parsedCritical
        : Math.min(
            DEFAULT_CRITICAL_STOCK_THRESHOLD,
            lowStockThreshold - 1,
          );

    const salesCutoff =
      new Date(
        Date.now() -
          30 *
            24 *
            60 *
            60 *
            1000,
      );

    const inventoryVariants =
      await prisma.productVariant.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          productId: true,
          sku: true,
          stock: true,
          reservedStock: true,

          product: {
            select: {
              name: true,
              sku: true,
            },
          },

          color: {
            select: {
              name: true,
            },
          },

          size: {
            select: {
              name: true,
            },
          },

          orderItems: {
            where: {
              order: {
                createdAt: {
                  gte:
                    salesCutoff,
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
      });

    type InventoryHealth =
      | "OUT_OF_STOCK"
      | "CRITICAL"
      | "LOW";

    const inventoryAlerts =
      inventoryVariants
        .map((variant) => {
          const availableStock =
            variant.stock -
            variant.reservedStock;

          let health:
            | InventoryHealth
            | null = null;

          if (
            availableStock <= 0
          ) {
            health =
              "OUT_OF_STOCK";
          } else if (
            availableStock <=
            criticalStockThreshold
          ) {
            health =
              "CRITICAL";
          } else if (
            availableStock <=
            lowStockThreshold
          ) {
            health = "LOW";
          }

          if (!health) {
            return null;
          }

          const recentSalesQty =
            variant.orderItems.reduce(
              (
                total,
                item,
              ) =>
                total +
                item.quantity,
              0,
            );

          const targetStock =
            Math.max(
              lowStockThreshold *
                2,
              recentSalesQty,
              lowStockThreshold +
                1,
            );

          const recommendedReorderQty =
            Math.max(
              0,
              targetStock -
                Math.max(
                  0,
                  availableStock,
                ),
            );

          return {
            variantId:
              variant.id,
            productId:
              variant.productId,
            productName:
              variant.product.name,
            sku:
              variant.sku ??
              variant.product.sku,
            colorName:
              variant.color.name,
            sizeName:
              variant.size.name,
            availableStock,
            health,
            recentSalesQty,
            recommendedReorderQty,
          };
        })
        .filter(
          (
            item,
          ): item is NonNullable<
            typeof item
          > => Boolean(item),
        )
        .sort(
          (a, b) => {
            const priority = {
              OUT_OF_STOCK: 0,
              CRITICAL: 1,
              LOW: 2,
            };

            const healthDiff =
              priority[a.health] -
              priority[b.health];

            if (
              healthDiff !== 0
            ) {
              return healthDiff;
            }

            return (
              a.availableStock -
              b.availableStock
            );
          },
        );

    const outOfStock =
      inventoryAlerts.filter(
        (item) =>
          item.health ===
          "OUT_OF_STOCK",
      ).length;

    const criticalStock =
      inventoryAlerts.filter(
        (item) =>
          item.health ===
          "CRITICAL",
      ).length;

    const lowStock =
      inventoryAlerts.filter(
        (item) =>
          item.health ===
          "LOW",
      ).length;

    return NextResponse.json({
      success: true,
      stats: {
        products,
        categories,
        colors,
        sizes,
      },
      salesMode: {
        retailStatus:
          salesMode?.retailStatus ??
          "OPEN",
        resellerStatus:
          salesMode?.resellerStatus ??
          "OPEN",
      },

      inventory: {
        lowStock,
        criticalStock,
        outOfStock,

        alertCount:
          inventoryAlerts.length,

        lowStockThreshold,
        criticalStockThreshold,

        alerts:
          inventoryAlerts.slice(
            0,
            8,
          ),
      },
    });
  } catch (error) {
    console.error(
      "GET admin dashboard summary failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load dashboard summary.",
      },
      { status: 500 },
    );
  }
}

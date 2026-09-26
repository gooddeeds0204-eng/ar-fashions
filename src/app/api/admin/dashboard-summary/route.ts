import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { ensureProductSoftDeleteStorage } from "@/lib/product-soft-delete-storage";

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

const DAY_MS =
  24 *
  60 *
  60 *
  1000;

const HIGH_VALUE_PENDING_THRESHOLD =
  10000;

function calendarDayStamp(
  value: Date,
) {
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

function calendarDayDifference(
  from: Date,
  to: Date,
) {
  return Math.round(
    (
      calendarDayStamp(
        to,
      ) -
      calendarDayStamp(
        from,
      )
    ) /
      DAY_MS,
  );
}

function roundMoney(
  value: number,
) {
  return Math.round(
    value * 100,
  ) / 100;
}

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    await ensureProductSoftDeleteStorage();

    const products =
      await prisma.product.count({
        where: {
          deletedAt: null,
        },
      });

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

          purchaseOrderItems: {
            where: {
              purchaseOrder: {
                status: {
                  in: [
                    "DRAFT",
                    "ORDERED",
                    "PARTIALLY_RECEIVED",
                  ],
                },
              },
            },

            select: {
              orderedQty:
                true,

              receivedQty:
                true,

              purchaseOrder: {
                select: {
                  status:
                    true,
                },
              },
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

          const grossRecommendedReorderQty =
            Math.max(
              0,
              targetStock -
                Math.max(
                  0,
                  availableStock,
                ),
            );

          let draftStock = 0;
          let incomingStock = 0;

          for (
            const item of
            variant.purchaseOrderItems
          ) {
            const remaining =
              Math.max(
                0,
                item.orderedQty -
                  item.receivedQty,
              );

            if (
              item.purchaseOrder.status ===
              "DRAFT"
            ) {
              draftStock +=
                remaining;
            } else {
              incomingStock +=
                remaining;
            }
          }

          const protectedStock =
            draftStock +
            incomingStock;

          const recommendedReorderQty =
            Math.max(
              0,
              grossRecommendedReorderQty -
                protectedStock,
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

            grossRecommendedReorderQty,

            draftStock,

            incomingStock,

            protectedStock,

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

    /*
     * Procurement risk intelligence.
     */
    const incomingPurchaseOrders =
      await prisma.purchaseOrder.findMany({
        where: {
          status: {
            in: [
              "ORDERED",
              "PARTIALLY_RECEIVED",
            ],
          },
        },
        orderBy: {
          expectedAt: "asc",
        },
        select: {
          id: true,
          poNumber: true,
          status: true,
          expectedAt: true,
          orderedAt: true,
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            select: {
              orderedQty: true,
              receivedQty: true,
              unitCost: true,
            },
          },
        },
      });

    const supplierRiskRows =
      await prisma.supplier.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          purchaseOrders: {
            where: {
              status: "RECEIVED",
            },
            orderBy: {
              receivedAt: "desc",
            },
            take: 20,
            select: {
              expectedAt: true,
              orderedAt: true,
              receivedAt: true,
            },
          },
          variantCosts: {
            where: {
              isActive: true,
            },
            select: {
              supplierCost: true,
              lastPurchaseCost: true,
            },
          },
        },
      });

    const today =
      new Date();

    const incomingRiskRows =
      incomingPurchaseOrders.map(
        (order) => {
          const pendingPieces =
            order.items.reduce(
              (
                total,
                item,
              ) =>
                total +
                Math.max(
                  0,
                  item.orderedQty -
                    item.receivedQty,
                ),
              0,
            );

          const pendingValue =
            order.items.reduce(
              (
                total,
                item,
              ) =>
                total +
                Math.max(
                  0,
                  item.orderedQty -
                    item.receivedQty,
                ) *
                  Number(
                    item.unitCost,
                  ),
              0,
            );

          const daysRemaining =
            order.expectedAt
              ? calendarDayDifference(
                  today,
                  order.expectedAt,
                )
              : null;

          return {
            id: order.id,
            poNumber:
              order.poNumber,
            supplierId:
              order.supplier.id,
            supplierName:
              order.supplier.name,
            expectedAt:
              order.expectedAt,
            pendingPieces,
            pendingValue:
              roundMoney(
                pendingValue,
              ),
            daysRemaining,
            overdue:
              daysRemaining !==
                null &&
              daysRemaining < 0,
            dueSoon:
              daysRemaining !==
                null &&
              daysRemaining >= 0 &&
              daysRemaining <= 2,
            highValue:
              pendingValue >=
              HIGH_VALUE_PENDING_THRESHOLD,
          };
        },
      );

    const overduePOCount =
      incomingRiskRows.filter(
        (item) =>
          item.overdue,
      ).length;

    const dueSoonPOCount =
      incomingRiskRows.filter(
        (item) =>
          item.dueSoon,
      ).length;

    const pendingIncomingValue =
      roundMoney(
        incomingRiskRows.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.pendingValue,
          0,
        ),
      );

    const pendingIncomingPieces =
      incomingRiskRows.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.pendingPieces,
        0,
      );

    const highValuePendingPOCount =
      incomingRiskRows.filter(
        (item) =>
          item.highValue,
      ).length;

    const supplierRiskSummary =
      supplierRiskRows.map(
        (supplier) => {
          const etaTracked =
            supplier.purchaseOrders.filter(
              (order) =>
                Boolean(
                  order.expectedAt,
                ) &&
                Boolean(
                  order.receivedAt,
                ),
            );

          const onTimeCount =
            etaTracked.filter(
              (order) =>
                calendarDayDifference(
                  order.expectedAt!,
                  order.receivedAt!,
                ) <= 0,
            ).length;

          const onTimeRate =
            etaTracked.length >
            0
              ? Math.round(
                  (
                    onTimeCount /
                    etaTracked.length
                  ) *
                    100,
                )
              : null;

          const reliabilityLevel =
            etaTracked.length < 2
              ? "BUILDING_HISTORY"
              : onTimeRate !==
                    null &&
                  onTimeRate >= 90
                ? "EXCELLENT"
                : onTimeRate !==
                      null &&
                    onTimeRate >= 75
                  ? "RELIABLE"
                  : onTimeRate !==
                        null &&
                      onTimeRate >= 50
                    ? "WATCH"
                    : "NEEDS_ATTENTION";

          const costIncreases =
            supplier.variantCosts
              .map((cost) => {
                if (
                  cost.lastPurchaseCost ===
                  null
                ) {
                  return null;
                }

                const last =
                  Number(
                    cost.lastPurchaseCost,
                  );

                const current =
                  Number(
                    cost.supplierCost,
                  );

                if (
                  !Number.isFinite(
                    last,
                  ) ||
                  last <= 0 ||
                  !Number.isFinite(
                    current,
                  ) ||
                  current <= last
                ) {
                  return null;
                }

                const increasePercent =
                  (
                    (current -
                      last) /
                    last
                  ) *
                  100;

                if (
                  increasePercent < 5
                ) {
                  return null;
                }

                return increasePercent;
              })
              .filter(
                (
                  value,
                ): value is number =>
                  value !== null,
              );

          return {
            supplierId:
              supplier.id,
            supplierName:
              supplier.name,
            etaTracked:
              etaTracked.length,
            onTimeRate,
            reliabilityLevel,
            costIncreaseCount:
              costIncreases.length,
            maxCostIncreasePercent:
              costIncreases.length >
              0
                ? Math.round(
                    Math.max(
                      ...costIncreases,
                    ) *
                      100,
                  ) / 100
                : 0,
          };
        },
      );

    const needsAttentionSupplierCount =
      supplierRiskSummary.filter(
        (supplier) =>
          supplier.reliabilityLevel ===
          "NEEDS_ATTENTION",
      ).length;

    const supplierReliabilityRiskCount =
      supplierRiskSummary.filter(
        (supplier) =>
          supplier.reliabilityLevel ===
            "WATCH" ||
          supplier.reliabilityLevel ===
            "NEEDS_ATTENTION",
      ).length;

    const costIncreaseSupplierCount =
      supplierRiskSummary.filter(
        (supplier) =>
          supplier.costIncreaseCount >
          0,
      ).length;

    type ProcurementAlert = {
      id: string;
      severity:
        | "HIGH"
        | "MEDIUM"
        | "LOW";
      title: string;
      detail: string;
      href: string;
    };

    const procurementAlerts:
      ProcurementAlert[] = [];

    for (
      const po of
      incomingRiskRows
    ) {
      if (po.overdue) {
        const overdueDays =
          Math.abs(
            po.daysRemaining ?? 0,
          );

        procurementAlerts.push({
          id: `overdue-${po.id}`,
          severity: "HIGH",
          title:
            `${po.poNumber} is overdue`,
          detail:
            `${po.supplierName} · ${overdueDays} day${
              overdueDays === 1
                ? ""
                : "s"
            } overdue · ₹${Math.round(
              po.pendingValue,
            ).toLocaleString(
              "en-IN",
            )} still incoming`,
          href:
            "/admin/purchase-orders",
        });

        continue;
      }

      if (po.dueSoon) {
        procurementAlerts.push({
          id: `due-${po.id}`,
          severity: "MEDIUM",
          title:
            `${po.poNumber} is due soon`,
          detail:
            `${po.supplierName} · ${
              po.daysRemaining === 0
                ? "expected today"
                : `${po.daysRemaining} day${
                    po.daysRemaining === 1
                      ? ""
                      : "s"
                  } remaining`
            }`,
          href:
            "/admin/purchase-orders",
        });

        continue;
      }

      if (po.highValue) {
        procurementAlerts.push({
          id: `value-${po.id}`,
          severity: "MEDIUM",
          title:
            "High-value incoming purchase",
          detail:
            `${po.poNumber} · ${po.supplierName} · ₹${Math.round(
              po.pendingValue,
            ).toLocaleString(
              "en-IN",
            )} pending`,
          href:
            "/admin/purchase-orders",
        });
      }
    }

    for (
      const supplier of
      supplierRiskSummary
    ) {
      const reliabilityRisk =
        supplier.reliabilityLevel ===
          "WATCH" ||
        supplier.reliabilityLevel ===
          "NEEDS_ATTENTION";

      const costRisk =
        supplier.costIncreaseCount >
        0;

      if (
        !reliabilityRisk &&
        !costRisk
      ) {
        continue;
      }

      const details: string[] =
        [];

      if (reliabilityRisk) {
        details.push(
          supplier.onTimeRate ===
          null
            ? "delivery reliability needs review"
            : `on-time delivery ${supplier.onTimeRate}%`,
        );
      }

      if (costRisk) {
        details.push(
          `${supplier.costIncreaseCount} quote${
            supplier.costIncreaseCount ===
            1
              ? ""
              : "s"
          } increased · max +${supplier.maxCostIncreasePercent}%`,
        );
      }

      procurementAlerts.push({
        id:
          `supplier-${supplier.supplierId}`,
        severity:
          supplier.reliabilityLevel ===
          "NEEDS_ATTENTION"
            ? "HIGH"
            : "MEDIUM",
        title:
          `${supplier.supplierName} needs procurement review`,
        detail:
          details.join(
            " · ",
          ),
        href:
          "/admin/suppliers",
      });
    }

    const severityPriority = {
      HIGH: 0,
      MEDIUM: 1,
      LOW: 2,
    };

    procurementAlerts.sort(
      (a, b) =>
        severityPriority[
          a.severity
        ] -
        severityPriority[
          b.severity
        ],
    );

    const procurementRiskLevel =
      overduePOCount > 0 ||
      needsAttentionSupplierCount >
        0
        ? "HIGH"
        : dueSoonPOCount > 0 ||
            supplierReliabilityRiskCount >
              0 ||
            costIncreaseSupplierCount >
              0 ||
            highValuePendingPOCount >
              0
          ? "MEDIUM"
          : "LOW";

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

        incomingProtectedCount:
          inventoryAlerts.filter(
            (item) =>
              item.protectedStock >
                0 &&
              item.recommendedReorderQty ===
                0,
          ).length,

        totalIncomingStock:
          inventoryAlerts.reduce(
            (total, item) =>
              total +
              item.incomingStock,
            0,
          ),

        totalDraftStock:
          inventoryAlerts.reduce(
            (total, item) =>
              total +
              item.draftStock,
            0,
          ),

        lowStockThreshold,
        criticalStockThreshold,

        alerts:
          inventoryAlerts.slice(
            0,
            8,
          ),
      },

      procurement: {
        riskLevel:
          procurementRiskLevel,
        alertCount:
          procurementAlerts.length,
        incomingPOCount:
          incomingRiskRows.length,
        overduePOCount,
        dueSoonPOCount,
        highValuePendingPOCount,
        pendingIncomingValue,
        pendingIncomingPieces,
        needsAttentionSupplierCount,
        supplierReliabilityRiskCount,
        costIncreaseSupplierCount,
        alerts:
          procurementAlerts.slice(
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

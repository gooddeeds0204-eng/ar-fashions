import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const VALID_RANGES = [7, 30, 90];

function amount(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function maskPhone(
  phone: string | null,
) {
  if (!phone) {
    return null;
  }

  const clean =
    phone.replace(/\D/g, "");

  if (clean.length <= 4) {
    return clean;
  }

  return `••••${clean.slice(-4)}`;
}

export async function GET(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const { searchParams } =
      new URL(request.url);

    const requestedDays =
      Number(
        searchParams.get("days"),
      );

    const days =
      VALID_RANGES.includes(
        requestedDays,
      )
        ? requestedDays
        : 30;

    const now = new Date();

    const startDate =
      new Date(now);

    startDate.setUTCDate(
      startDate.getUTCDate() -
        (days - 1),
    );

    startDate.setUTCHours(
      0,
      0,
      0,
      0,
    );

    const orders =
      await prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },

        orderBy: {
          createdAt: "asc",
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },

          items: true,
        },
      });

    const purchaseOrders =
      await prisma.purchaseOrder.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },

        orderBy: {
          createdAt: "asc",
        },

        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },

          items: {
            select: {
              variantId: true,
              productName: true,
              colorName: true,
              sizeName: true,
              orderedQty: true,
              receivedQty: true,
              unitCost: true,
              totalCost: true,
            },
          },
        },
      });

    const supplierCostRows =
      await prisma.supplierVariantCost.findMany({
        where: {
          isActive: true,
        },

        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },

          variant: {
            select: {
              id: true,
              sku: true,
              preferredSupplierId:
                true,

              product: {
                select: {
                  name: true,
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
            },
          },
        },
      });

    /*
     * Revenue recognition rule for
     * this dashboard:
     *
     * DELIVERED = completed sales.
     * CANCELLED / RETURNED / REFUNDED
     * are excluded from recognized sales.
     */
    const deliveredOrders =
      orders.filter(
        (order) =>
          order.status ===
          "DELIVERED",
      );

    const activeStatuses =
      new Set([
        "PENDING",
        "CONFIRMED",
        "PACKED",
        "SHIPPED",
      ]);

    const pipelineOrders =
      orders.filter(
        (order) =>
          activeStatuses.has(
            order.status,
          ),
      );

    const deliveredSales =
      round(
        deliveredOrders.reduce(
          (total, order) =>
            total +
            amount(
              order.totalAmount,
            ),
          0,
        ),
      );

    const deliveredCount =
      deliveredOrders.length;

    const averageOrderValue =
      deliveredCount > 0
        ? round(
            deliveredSales /
              deliveredCount,
          )
        : 0;

    const pipelineValue =
      round(
        pipelineOrders.reduce(
          (total, order) =>
            total +
            amount(
              order.totalAmount,
            ),
          0,
        ),
      );

    const discountTotal =
      round(
        deliveredOrders.reduce(
          (total, order) =>
            total +
            amount(
              order.discountAmount,
            ),
          0,
        ),
      );

    const deliveryRevenue =
      round(
        deliveredOrders.reduce(
          (total, order) =>
            total +
            amount(
              order.deliveryCharge,
            ),
          0,
        ),
      );

    /*
     * Retail vs reseller completed sales.
     */
    const salesByType = {
      RETAIL: {
        orders: 0,
        sales: 0,
      },

      RESELLER: {
        orders: 0,
        sales: 0,
      },
    };

    for (
      const order of
      deliveredOrders
    ) {
      const type =
        order.type ===
        "RESELLER"
          ? "RESELLER"
          : "RETAIL";

      salesByType[type].orders +=
        1;

      salesByType[type].sales +=
        amount(
          order.totalAmount,
        );
    }

    salesByType.RETAIL.sales =
      round(
        salesByType.RETAIL.sales,
      );

    salesByType.RESELLER.sales =
      round(
        salesByType.RESELLER
          .sales,
      );

    /*
     * Current status breakdown.
     */
    const statusMap =
      new Map<
        string,
        {
          status: string;
          orders: number;
          value: number;
        }
      >();

    for (const order of orders) {
      const current =
        statusMap.get(
          order.status,
        ) ?? {
          status:
            order.status,
          orders: 0,
          value: 0,
        };

      current.orders += 1;

      current.value +=
        amount(
          order.totalAmount,
        );

      statusMap.set(
        order.status,
        current,
      );
    }

    const statusBreakdown =
      Array.from(
        statusMap.values(),
      )
        .map((item) => ({
          ...item,
          value:
            round(
              item.value,
            ),
        }))
        .sort(
          (a, b) =>
            b.orders -
            a.orders,
        );

    /*
     * Daily delivered sales trend.
     * We use order createdAt because
     * the current schema has no
     * deliveredAt timestamp.
     */
    const dailyMap =
      new Map<
        string,
        {
          date: string;
          orders: number;
          sales: number;
        }
      >();

    for (
      let index = 0;
      index < days;
      index += 1
    ) {
      const date =
        new Date(startDate);

      date.setUTCDate(
        startDate.getUTCDate() +
          index,
      );

      const key =
        date
          .toISOString()
          .slice(0, 10);

      dailyMap.set(key, {
        date: key,
        orders: 0,
        sales: 0,
      });
    }

    for (
      const order of
      deliveredOrders
    ) {
      const key =
        order.createdAt
          .toISOString()
          .slice(0, 10);

      const current =
        dailyMap.get(key);

      if (!current) {
        continue;
      }

      current.orders += 1;

      current.sales +=
        amount(
          order.totalAmount,
        );
    }

    const dailyTrend =
      Array.from(
        dailyMap.values(),
      ).map((item) => ({
        ...item,
        sales:
          round(
            item.sales,
          ),
      }));

    /*
     * Top products use OrderItem
     * snapshot values from DELIVERED
     * orders.
     */
    const productMap =
      new Map<
        string,
        {
          productId: string;
          name: string;
          quantity: number;
          itemSales: number;
        }
      >();

    for (
      const order of
      deliveredOrders
    ) {
      for (
        const item of
        order.items
      ) {
        const current =
          productMap.get(
            item.productId,
          ) ?? {
            productId:
              item.productId,
            name:
              item.productName,
            quantity: 0,
            itemSales: 0,
          };

        current.quantity +=
          item.quantity;

        current.itemSales +=
          amount(
            item.totalPrice,
          );

        productMap.set(
          item.productId,
          current,
        );
      }
    }

    const topProducts =
      Array.from(
        productMap.values(),
      )
        .map((item) => ({
          ...item,
          itemSales:
            round(
              item.itemSales,
            ),
        }))
        .sort(
          (a, b) =>
            b.quantity -
            a.quantity ||
            b.itemSales -
              a.itemSales,
        )
        .slice(0, 10);

    /*
     * Top customers based on
     * delivered final order values.
     */
    const customerMap =
      new Map<
        string,
        {
          userId: string;
          name: string;
          phone: string | null;
          orders: number;
          sales: number;
        }
      >();

    for (
      const order of
      deliveredOrders
    ) {
      const current =
        customerMap.get(
          order.userId,
        ) ?? {
          userId:
            order.userId,

          name:
            order.user.name ??
            "Customer",

          phone:
            maskPhone(
              order.user.phone,
            ),

          orders: 0,
          sales: 0,
        };

      current.orders += 1;

      current.sales +=
        amount(
          order.totalAmount,
        );

      customerMap.set(
        order.userId,
        current,
      );
    }

    const topCustomers =
      Array.from(
        customerMap.values(),
      )
        .map((item) => ({
          ...item,
          sales:
            round(
              item.sales,
            ),
        }))
        .sort(
          (a, b) =>
            b.sales -
            a.sales,
        )
        .slice(0, 10);

    /*
     * Purchase analytics.
     *
     * Cancelled POs are excluded from committed
     * purchase values. Received value is calculated
     * from PO-item unit-cost snapshots, preserving
     * historical supplier pricing.
     */
    const activePurchaseOrders =
      purchaseOrders.filter(
        (order) =>
          order.status !==
          "CANCELLED",
      );

    const purchaseSpend =
      round(
        activePurchaseOrders.reduce(
          (total, order) =>
            total +
            amount(
              order.subtotal,
            ),
          0,
        ),
      );

    let receivedPurchaseValue = 0;
    let pendingIncomingValue = 0;
    let draftPurchaseValue = 0;

    let receivedPurchasePieces = 0;
    let pendingIncomingPieces = 0;
    let draftPurchasePieces = 0;

    const supplierPurchaseMap =
      new Map<
        string,
        {
          supplierId: string;
          supplierName: string;
          purchaseOrders: number;
          committedValue: number;
          receivedValue: number;
          incomingValue: number;
          draftValue: number;
          receivedPieces: number;
        }
      >();

    const purchasedProductMap =
      new Map<
        string,
        {
          name: string;
          quantity: number;
          purchaseValue: number;
        }
      >();

    const purchaseTrendMap =
      new Map<
        string,
        {
          date: string;
          purchaseOrders: number;
          committedValue: number;
          receivedValue: number;
        }
      >();

    for (
      let index = 0;
      index < days;
      index += 1
    ) {
      const date =
        new Date(startDate);

      date.setUTCDate(
        startDate.getUTCDate() +
          index,
      );

      const key =
        date
          .toISOString()
          .slice(0, 10);

      purchaseTrendMap.set(
        key,
        {
          date: key,
          purchaseOrders: 0,
          committedValue: 0,
          receivedValue: 0,
        },
      );
    }

    for (
      const order of
      activePurchaseOrders
    ) {
      const supplierStats =
        supplierPurchaseMap.get(
          order.supplierId,
        ) ?? {
          supplierId:
            order.supplierId,
          supplierName:
            order.supplier.name,
          purchaseOrders: 0,
          committedValue: 0,
          receivedValue: 0,
          incomingValue: 0,
          draftValue: 0,
          receivedPieces: 0,
        };

      supplierStats.purchaseOrders +=
        1;

      supplierStats.committedValue +=
        amount(
          order.subtotal,
        );

      const trendKey =
        order.createdAt
          .toISOString()
          .slice(0, 10);

      const trend =
        purchaseTrendMap.get(
          trendKey,
        );

      if (trend) {
        trend.purchaseOrders +=
          1;

        trend.committedValue +=
          amount(
            order.subtotal,
          );
      }

      for (
        const item of
        order.items
      ) {
        const unitCost =
          amount(
            item.unitCost,
          );

        const receivedValue =
          item.receivedQty *
          unitCost;

        const remainingQty =
          Math.max(
            0,
            item.orderedQty -
              item.receivedQty,
          );

        receivedPurchaseValue +=
          receivedValue;

        receivedPurchasePieces +=
          item.receivedQty;

        supplierStats.receivedValue +=
          receivedValue;

        supplierStats.receivedPieces +=
          item.receivedQty;

        if (trend) {
          trend.receivedValue +=
            receivedValue;
        }

        if (
          order.status ===
          "DRAFT"
        ) {
          const draftValue =
            remainingQty *
            unitCost;

          draftPurchaseValue +=
            draftValue;

          draftPurchasePieces +=
            remainingQty;

          supplierStats.draftValue +=
            draftValue;
        }

        if (
          order.status ===
            "ORDERED" ||
          order.status ===
            "PARTIALLY_RECEIVED"
        ) {
          const incomingValue =
            remainingQty *
            unitCost;

          pendingIncomingValue +=
            incomingValue;

          pendingIncomingPieces +=
            remainingQty;

          supplierStats.incomingValue +=
            incomingValue;
        }

        if (
          item.receivedQty >
          0
        ) {
          const current =
            purchasedProductMap.get(
              item.productName,
            ) ?? {
              name:
                item.productName,
              quantity: 0,
              purchaseValue: 0,
            };

          current.quantity +=
            item.receivedQty;

          current.purchaseValue +=
            receivedValue;

          purchasedProductMap.set(
            item.productName,
            current,
          );
        }
      }

      supplierPurchaseMap.set(
        order.supplierId,
        supplierStats,
      );
    }

    receivedPurchaseValue =
      round(
        receivedPurchaseValue,
      );

    pendingIncomingValue =
      round(
        pendingIncomingValue,
      );

    draftPurchaseValue =
      round(
        draftPurchaseValue,
      );

    const supplierSpend =
      Array.from(
        supplierPurchaseMap.values(),
      )
        .map((item) => ({
          ...item,

          committedValue:
            round(
              item.committedValue,
            ),

          receivedValue:
            round(
              item.receivedValue,
            ),

          incomingValue:
            round(
              item.incomingValue,
            ),

          draftValue:
            round(
              item.draftValue,
            ),
        }))
        .sort(
          (a, b) =>
            b.receivedValue -
              a.receivedValue ||
            b.committedValue -
              a.committedValue,
        )
        .slice(0, 10);

    const topPurchasedProducts =
      Array.from(
        purchasedProductMap.values(),
      )
        .map((item) => ({
          ...item,

          purchaseValue:
            round(
              item.purchaseValue,
            ),
        }))
        .sort(
          (a, b) =>
            b.quantity -
              a.quantity ||
            b.purchaseValue -
              a.purchaseValue,
        )
        .slice(0, 10);

    const purchaseTrend =
      Array.from(
        purchaseTrendMap.values(),
      ).map((item) => ({
        ...item,

        committedValue:
          round(
            item.committedValue,
          ),

        receivedValue:
          round(
            item.receivedValue,
          ),
      }));

    const costAlerts =
      supplierCostRows
        .filter(
          (row) =>
            row.supplier.isActive &&
            row.lastPurchaseCost !==
              null &&
            amount(
              row.lastPurchaseCost,
            ) > 0,
        )
        .map((row) => {
          const quotedCost =
            amount(
              row.supplierCost,
            );

          const lastPurchaseCost =
            amount(
              row.lastPurchaseCost,
            );

          const difference =
            round(
              quotedCost -
                lastPurchaseCost,
            );

          const percentChange =
            lastPurchaseCost > 0
              ? round(
                  (difference /
                    lastPurchaseCost) *
                    100,
                )
              : 0;

          return {
            supplierId:
              row.supplierId,

            supplierName:
              row.supplier.name,

            variantId:
              row.variantId,

            productName:
              row.variant.product
                .name,

            colorName:
              row.variant.color.name,

            sizeName:
              row.variant.size.name,

            sku:
              row.variant.sku,

            quotedCost,

            lastPurchaseCost,

            difference,

            percentChange,

            direction:
              difference > 0
                ? "INCREASE"
                : difference < 0
                  ? "DROP"
                  : "SAME",

            preferred:
              row.variant
                .preferredSupplierId ===
              row.supplierId,

            lastPurchasedAt:
              row.lastPurchasedAt,
          };
        })
        .filter(
          (item) =>
            item.direction !==
            "SAME",
        )
        .sort(
          (a, b) =>
            Math.abs(
              b.percentChange,
            ) -
            Math.abs(
              a.percentChange,
            ),
        )
        .slice(0, 20);

    const purchaseAnalytics = {
      summary: {
        purchaseOrders:
          activePurchaseOrders.length,

        purchaseSpend,

        receivedPurchaseValue,

        receivedPurchasePieces,

        pendingIncomingValue,

        pendingIncomingPieces,

        draftPurchaseValue,

        draftPurchasePieces,

        cancelledPurchaseOrders:
          purchaseOrders.filter(
            (order) =>
              order.status ===
              "CANCELLED",
          ).length,
      },

      supplierSpend,

      topPurchasedProducts,

      purchaseTrend,

      costAlerts,
    };

    return NextResponse.json({
      success: true,

      range: {
        days,
        from:
          startDate.toISOString(),
        to:
          now.toISOString(),
      },

      summary: {
        totalOrders:
          orders.length,

        deliveredOrders:
          deliveredCount,

        deliveredSales,

        averageOrderValue,

        pipelineOrders:
          pipelineOrders.length,

        pipelineValue,

        discountTotal,

        deliveryRevenue,
      },

      salesByType,

      statusBreakdown,

      dailyTrend,

      topProducts,

      topCustomers,

      purchaseAnalytics,

      notes: {
        salesRule:
          "Delivered orders only. Cancelled, returned and refunded orders are excluded from completed sales.",

        trendRule:
          "Trend uses order creation date because deliveredAt is not currently stored.",

        profitRule:
          "Profit is intentionally not shown because historical sales order-item cost snapshots are not currently stored.",

        purchaseRule:
          "Purchase spend excludes cancelled purchase orders. Received purchase value uses purchase-order item unit-cost snapshots.",

        purchaseTrendRule:
          "Purchase trend is grouped by purchase-order creation date.",

        costAlertRule:
          "Cost alerts compare the current supplier quote against the last received purchase cost for that supplier and variant.",
      },
    });
  } catch (error) {
    console.error(
      "GET /api/admin/reports failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load reports.",
      },
      {
        status: 500,
      },
    );
  }
}

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

      notes: {
        salesRule:
          "Delivered orders only. Cancelled, returned and refunded orders are excluded from completed sales.",

        trendRule:
          "Trend uses order creation date because deliveredAt is not currently stored.",

        profitRule:
          "Profit is intentionally not shown because historical order-item cost snapshots are not currently stored.",
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

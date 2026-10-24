import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { ensureProductSoftDeleteStorage } from "@/lib/product-soft-delete-storage";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;
const PAID_EXCLUDED = new Set(["CANCELLED", "REFUNDED", "RETURNED"]);

function indiaDateKey(value: Date) {
  return new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    await ensureProductSoftDeleteStorage();

    const now = new Date();
    const todayIndia = new Date(now.getTime() + IST_OFFSET_MS);
    const todayStartUtc = new Date(
      Date.UTC(
        todayIndia.getUTCFullYear(),
        todayIndia.getUTCMonth(),
        todayIndia.getUTCDate(),
      ) - IST_OFFSET_MS,
    );
    const sevenDayStart = new Date(todayStartUtc.getTime() - 6 * DAY_MS);

    const [statusGroups, recentOrders, lastSevenDays, variants, products, salesMode] =
      await Promise.all([
        prisma.order.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            type: true,
            status: true,
            totalAmount: true,
            user: { select: { name: true } },
          },
        }),
        prisma.order.findMany({
          where: { createdAt: { gte: sevenDayStart } },
          select: {
            createdAt: true,
            totalAmount: true,
            paymentStatus: true,
            status: true,
          },
        }),
        prisma.productVariant.findMany({
          where: {
            isActive: true,
            product: { deletedAt: null, status: "ACTIVE" },
          },
          select: { stock: true, reservedStock: true },
        }),
        prisma.product.count({ where: { deletedAt: null, status: "ACTIVE" } }),
        prisma.salesMode.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { retailStatus: true, resellerStatus: true },
        }),
      ]);

    const statusCounts = Object.fromEntries(
      statusGroups.map((group) => [group.status, group._count._all]),
    );
    const countStatus = (status: string) => Number(statusCounts[status] ?? 0);
    const daily = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sevenDayStart.getTime() + index * DAY_MS);
      const key = indiaDateKey(date);
      return { date: key, orders: 0, paidSales: 0 };
    });
    const dailyIndex = new Map(daily.map((row) => [row.date, row]));

    let todayOrders = 0;
    let todayPaidSales = 0;
    let paidSales7d = 0;
    for (const order of lastSevenDays) {
      const key = indiaDateKey(order.createdAt);
      const day = dailyIndex.get(key);
      if (!day) continue;
      day.orders += 1;
      if (key === indiaDateKey(now)) todayOrders += 1;

      if (order.paymentStatus === "PAID" && !PAID_EXCLUDED.has(order.status)) {
        const total = Number(order.totalAmount);
        day.paidSales += total;
        paidSales7d += total;
        if (key === indiaDateKey(now)) todayPaidSales += total;
      }
    }

    const stock = variants.reduce(
      (counts, variant) => {
        const available = Math.max(0, variant.stock - variant.reservedStock);
        if (available === 0) counts.outOfStock += 1;
        else if (available <= 5) counts.lowStock += 1;
        return counts;
      },
      { outOfStock: 0, lowStock: 0 },
    );

    return NextResponse.json(
      {
        success: true,
        orders: {
          all: statusGroups.reduce((sum, row) => sum + row._count._all, 0),
          pending: countStatus("PENDING"),
          toPack: countStatus("CONFIRMED"),
          readyToShip: countStatus("PACKED"),
          shipped: countStatus("SHIPPED"),
          returns: countStatus("RETURN_REQUESTED"),
          refundsDue: countStatus("RETURNED"),
          delivered: countStatus("DELIVERED"),
        },
        insights: {
          todayOrders,
          todayPaidSales,
          sevenDayOrders: lastSevenDays.length,
          sevenDayPaidSales: paidSales7d,
          daily,
        },
        stock,
        products,
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          type: order.type,
          createdAt: order.createdAt,
          customerName: order.user.name || "Customer",
          totalAmount: Number(order.totalAmount),
        })),
        salesMode: {
          retailStatus: salesMode?.retailStatus ?? "OPEN",
          resellerStatus: salesMode?.resellerStatus ?? "OPEN",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Admin overview failed:", error);
    return NextResponse.json(
      { error: "Unable to load dashboard. Please refresh." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

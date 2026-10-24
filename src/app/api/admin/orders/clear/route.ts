import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { verifyProductDeletePin } from "@/lib/product-delete-pin";
import { requireSameOriginJson } from "@/lib/public-write-security";

export const dynamic = "force-dynamic";

/**
 * Deliberately never runs on deployment, startup or a GET request.
 * The logged-in administrator must confirm each irreversible deletion
 * in the Orders UI using their account password and an exact phrase.
 */
export async function DELETE(request: Request) {
  const originError = requireSameOriginJson(request);
  if (originError) return originError;

  const sessionAdmin = await getAuthenticatedAdmin();
  if (!sessionAdmin) {
    return NextResponse.json(
      { error: "Admin sign-in is required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const phrase = String(body?.confirmation ?? "").trim();
    const password = String(body?.password ?? "");
    const deletePin = String(body?.deletePin ?? "").trim();
    const expectedCount = Number(body?.expectedCount);
    const acknowledged = body?.acknowledgePermanentLoss === true;

    if (
      phrase !== "DELETE ALL ORDERS" ||
      !acknowledged ||
      (!password && !deletePin) ||
      !Number.isSafeInteger(expectedCount) ||
      expectedCount < 1
    ) {
      return NextResponse.json(
        { error: "Enter the exact confirmation phrase, your admin password or delete PIN, and acknowledge the permanent deletion." },
        { status: 400 },
      );
    }

    const admin = await prisma.user.findFirst({
      where: { id: sessionAdmin.id, role: "ADMIN", status: "ACTIVE" },
      select: { passwordHash: true },
    });

    const passwordValid = Boolean(
      password && admin?.passwordHash && await verifyPassword(password, admin.passwordHash),
    );
    const pinCheck = deletePin ? await verifyProductDeletePin(deletePin) : null;
    if (!passwordValid && !pinCheck?.valid) {
      return NextResponse.json(
        { error: "Admin password or product delete PIN is incorrect." },
        { status: 403 },
      );
    }

    const count = await prisma.order.count();
    if (count !== expectedCount) {
      return NextResponse.json(
        { error: `The order count changed from ${expectedCount} to ${count}. Refresh orders and confirm again.`, actualCount: count },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.order.findMany({
        select: { id: true, paymentStatus: true, status: true },
      });

      if (rows.length !== expectedCount) {
        throw new Error("Order count changed while preparing deletion. Refresh orders and try again.");
      }

      const orderIds = rows.map((row) => row.id);
      const paid = rows.filter((row) => row.paymentStatus === "PAID" || row.paymentStatus === "PARTIAL").length;
      const shipped = rows.filter((row) => ["SHIPPED", "DELIVERED", "RETURN_REQUESTED"].includes(row.status)).length;

      // Keep non-order reseller content and campaign records, but unlink
      // references before the orders are deleted.
      await tx.resellerContent.updateMany({
        where: { orderId: { in: orderIds } },
        data: { orderId: null },
      });
      await tx.campaignClaim.updateMany({
        where: { orderId: { in: orderIds } },
        data: { orderId: null },
      });

      // Remove saved local shipment snapshots for these orders.
      await tx.siteSetting.deleteMany({
        where: { key: { in: orderIds.map((id) => `shipment_v1_${id}`) } },
      });

      // OrderItem and Payment have ON DELETE CASCADE relations.
      const deleted = await tx.order.deleteMany({
        where: { id: { in: orderIds } },
      });

      if (deleted.count !== rows.length) {
        throw new Error("Not all orders were deleted. The transaction was rolled back.");
      }

      // Non-personal operational audit; do not retain deleted order details.
      await tx.siteSetting.upsert({
        where: { key: "last_admin_orders_reset_v1" },
        create: {
          key: "last_admin_orders_reset_v1",
          value: JSON.stringify({
            date: new Date().toISOString(),
            adminId: sessionAdmin.id,
            deletedCount: deleted.count,
            paidOrders: paid,
            shippedOrders: shipped,
          }),
        },
        update: {
          value: JSON.stringify({
            date: new Date().toISOString(),
            adminId: sessionAdmin.id,
            deletedCount: deleted.count,
            paidOrders: paid,
            shippedOrders: shipped,
          }),
        },
      });

      return { deletedCount: deleted.count, paidOrders: paid, shippedOrders: shipped };
    }, { maxWait: 10000, timeout: 30000 });

    const remaining = await prisma.order.count();

    return NextResponse.json(
      {
        success: true,
        ...result,
        remainingOrders: remaining,
        message: remaining === 0
          ? "All orders permanently deleted. Active order count is 0."
          : `${result.deletedCount} orders deleted. ${remaining} new orders remain.`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("DELETE /api/admin/orders/clear failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error && error.message.includes("Order count changed")
          ? error.message
          : "Order deletion failed. No completion was confirmed; refresh and check orders before trying again.",
      },
      { status: 500 },
    );
  }
}

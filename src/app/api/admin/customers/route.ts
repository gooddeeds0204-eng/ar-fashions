import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const users =
      await prisma.user.findMany({
        where: {
          role: {
            in: [
              "CUSTOMER",
              "RESELLER",
            ],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          orders: {
            select: {
              id: true,
              type: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              addresses: true,
              reviews: true,
              wishlist: true,
            },
          },
        },
      });

    const customers =
      users.map((user) => {
        const deliveredOrders =
          user.orders.filter(
            (order) =>
              order.status ===
              "DELIVERED",
          );

        const totalSpent =
          deliveredOrders.reduce(
            (total, order) =>
              total +
              Number(
                order.totalAmount,
              ),
            0,
          );

        const retailOrders =
          user.orders.filter(
            (order) =>
              order.type ===
              "RETAIL",
          ).length;

        const resellerOrders =
          user.orders.filter(
            (order) =>
              order.type ===
              "RESELLER",
          ).length;

        const lastOrderAt =
          user.orders.length > 0
            ? user.orders
                .map(
                  (order) =>
                    order.createdAt,
                )
                .sort(
                  (a, b) =>
                    b.getTime() -
                    a.getTime(),
                )[0]
            : null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          isReseller:
            user.isReseller,
          resellerLevel:
            user.resellerLevel,
          createdAt:
            user.createdAt,
          updatedAt:
            user.updatedAt,

          totalOrders:
            user.orders.length,

          deliveredOrders:
            deliveredOrders.length,

          retailOrders,
          resellerOrders,

          totalSpent,

          lastOrderAt,

          addressesCount:
            user._count.addresses,

          reviewsCount:
            user._count.reviews,

          wishlistCount:
            user._count.wishlist,
        };
      });

    return NextResponse.json({
      success: true,
      customers,
      count: customers.length,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/customers failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load customers.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const customerId =
      cleanString(
        body.customerId,
      );

    const status =
      cleanString(
        body.status,
      );

    const hasResellerValue =
      typeof body.isReseller ===
      "boolean";

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "Customer ID is required.",
        },
        { status: 400 },
      );
    }

    const validStatuses = [
      "ACTIVE",
      "BLOCKED",
      "PENDING",
    ];

    if (
      status &&
      !validStatuses.includes(
        status,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid account status.",
        },
        { status: 400 },
      );
    }

    if (
      !status &&
      !hasResellerValue
    ) {
      return NextResponse.json(
        {
          error:
            "No customer changes supplied.",
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.user.findFirst({
        where: {
          id: customerId,
          role: {
            in: [
              "CUSTOMER",
              "RESELLER",
            ],
          },
        },
        select: {
          id: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Customer not found.",
        },
        { status: 404 },
      );
    }

    const updated =
      await prisma.user.update({
        where: {
          id: customerId,
        },
        data: {
          ...(status
            ? {
                status:
                  status as
                    | "ACTIVE"
                    | "BLOCKED"
                    | "PENDING",
              }
            : {}),
          ...(hasResellerValue
            ? {
                isReseller:
                  body.isReseller,
                role:
                  body.isReseller
                    ? "RESELLER"
                    : "CUSTOMER",
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          isReseller: true,
          resellerLevel: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,
      customer: updated,
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/customers failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update customer.",
      },
      { status: 500 },
    );
  }
}

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
          resellerApplication: {
            select: {
              id: true,
              businessName: true,
              businessPhone: true,
              gstNumber: true,
              addressLine: true,
              city: true,
              state: true,
              pincode: true,
              mapsUrl: true,
              latitude: true,
              longitude: true,
              locationAccuracy: true,
              locationCapturedAt: true,
              visitingCardUrl: true,
              shopPhotoUrls: true,
              status: true,
              rejectionReason: true,
              reviewedAt: true,
              createdAt: true,
              updatedAt: true,
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

          resellerApplication:
            user.resellerApplication
              ? {
                  id:
                    user.resellerApplication.id,

                  businessName:
                    user.resellerApplication.businessName,

                  businessPhone:
                    user.resellerApplication.businessPhone,

                  gstNumber:
                    user.resellerApplication.gstNumber,

                  addressLine:
                    user.resellerApplication.addressLine,

                  city:
                    user.resellerApplication.city,

                  state:
                    user.resellerApplication.state,

                  pincode:
                    user.resellerApplication.pincode,

                  mapsUrl:
                    user.resellerApplication.mapsUrl,

                  latitude:
                    user.resellerApplication.latitude,

                  longitude:
                    user.resellerApplication.longitude,

                  locationAccuracy:
                    user.resellerApplication.locationAccuracy,

                  locationCapturedAt:
                    user.resellerApplication.locationCapturedAt,

                  visitingCardUrl:
                    user.resellerApplication.visitingCardUrl,

                  shopPhotoUrls:
                    user.resellerApplication.shopPhotoUrls,

                  status:
                    user.resellerApplication.status,

                  rejectionReason:
                    user.resellerApplication.rejectionReason,

                  reviewedAt:
                    user.resellerApplication.reviewedAt,

                  createdAt:
                    user.resellerApplication.createdAt,
                }
              : null,

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

    const action =
      cleanString(
        body.action,
      ).toUpperCase();

    const rejectionReason =
      cleanString(
        body.rejectionReason,
      );

    const resellerReviewAction =
      action ===
        "APPROVE_RESELLER" ||
      action ===
        "REJECT_RESELLER";

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
      !hasResellerValue &&
      !resellerReviewAction
    ) {
      return NextResponse.json(
        {
          error:
            "No customer changes supplied.",
        },
        { status: 400 },
      );
    }

    if (
      action ===
        "REJECT_RESELLER" &&
      rejectionReason.length < 3
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a short reason for rejecting this retailer application.",
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

    if (resellerReviewAction) {
      const reviewed =
        await prisma.$transaction(
          async (tx) => {
            const application =
              await tx.resellerApplication.findUnique({
                where: {
                  userId:
                    customerId,
                },
              });

            if (!application) {
              throw new Error(
                "Retailer application was not found.",
              );
            }

            if (
              application.status !==
              "PENDING"
            ) {
              throw new Error(
                `This retailer application is already ${application.status.toLowerCase()}.`,
              );
            }

            const approved =
              action ===
              "APPROVE_RESELLER";

            await tx.resellerApplication.update({
              where: {
                userId:
                  customerId,
              },
              data: {
                status:
                  approved
                    ? "APPROVED"
                    : "REJECTED",

                rejectionReason:
                  approved
                    ? null
                    : rejectionReason,

                reviewedAt:
                  new Date(),
              },
            });

            return tx.user.update({
              where: {
                id:
                  customerId,
              },

              data: {
                isReseller:
                  approved,

                role:
                  approved
                    ? "RESELLER"
                    : "CUSTOMER",
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

                resellerApplication: {
                  select: {
                    id: true,
                    businessName: true,
                    gstNumber: true,
                    city: true,
                    state: true,
                    status: true,
                    rejectionReason: true,
                    reviewedAt: true,
                    createdAt: true,
                  },
                },
              },
            });
          },
        );

      return NextResponse.json({
        success: true,
        customer:
          reviewed,
        message:
          action ===
          "APPROVE_RESELLER"
            ? "Retailer approved. Reseller pricing is now unlocked."
            : "Retailer application rejected.",
      });
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

          resellerApplication: {
            select: {
              id: true,
              businessName: true,
              businessPhone: true,
              gstNumber: true,
              addressLine: true,
              city: true,
              state: true,
              pincode: true,
              mapsUrl: true,
              latitude: true,
              longitude: true,
              locationAccuracy: true,
              locationCapturedAt: true,
              visitingCardUrl: true,
              shopPhotoUrls: true,
              status: true,
              rejectionReason: true,
              reviewedAt: true,
              createdAt: true,
            },
          },
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const { id } =
      await context.params;

    const customer =
      await prisma.user.findFirst({
        where: {
          id,
          role: {
            in: [
              "CUSTOMER",
              "RESELLER",
            ],
          },
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
          createdAt: true,
          updatedAt: true,

          addresses: {
            orderBy: [
              {
                isDefault:
                  "desc",
              },
              {
                createdAt:
                  "desc",
              },
            ],
            select: {
              id: true,
              name: true,
              phone: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              pincode: true,
              landmark: true,
              isDefault: true,
              createdAt: true,
            },
          },

          orders: {
            orderBy: {
              createdAt:
                "desc",
            },
            select: {
              id: true,
              orderNumber: true,
              type: true,
              status: true,
              paymentStatus: true,
              paymentMethod: true,
              subtotal: true,
              discountAmount: true,
              deliveryCharge: true,
              totalAmount: true,
              couponCode: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
              address: {
                select: {
                  name: true,
                  phone: true,
                  addressLine1:
                    true,
                  addressLine2:
                    true,
                  city: true,
                  state: true,
                  pincode: true,
                  landmark: true,
                },
              },
              items: {
                select: {
                  id: true,
                  productName:
                    true,
                  colorName: true,
                  sizeName: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                },
              },
            },
          },

          wishlist: {
            orderBy: {
              createdAt:
                "desc",
            },
            select: {
              id: true,
              createdAt: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                  retailPrice:
                    true,
                  resellerPrice:
                    true,
                  category: {
                    select: {
                      name: true,
                    },
                  },
                  media: {
                    where: {
                      isActive:
                        true,
                    },
                    orderBy: {
                      sortOrder:
                        "asc",
                    },
                    take: 1,
                    select: {
                      type: true,
                      url: true,
                      thumbnailUrl:
                        true,
                    },
                  },
                },
              },
            },
          },

          reviews: {
            orderBy: {
              createdAt:
                "desc",
            },
            select: {
              id: true,
              rating: true,
              title: true,
              comment: true,
              status: true,
              createdAt: true,
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
              locationAccuracy:
                true,
              locationCapturedAt:
                true,
              visitingCardUrl:
                true,
              shopPhotoUrls:
                true,
              status: true,
              rejectionReason:
                true,
              reviewedAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          offerReferrals: {
            orderBy: {
              createdAt:
                "desc",
            },
            select: {
              id: true,
              referralCode: true,
              status: true,
              clickedAt: true,
              qualifiedAt:
                true,
              createdAt: true,
              campaign: {
                select: {
                  id: true,
                  title: true,
                },
              },
              _count: {
                select: {
                  visits: true,
                },
              },
            },
          },

          campaignClaims: {
            orderBy: {
              createdAt:
                "desc",
            },
            select: {
              id: true,
              status: true,
              groupJoinAcknowledged:
                true,
              orderId: true,
              claimedAt: true,
              createdAt: true,
              campaign: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },

          campaignReferralVisits: {
            orderBy: {
              createdAt:
                "desc",
            },
            select: {
              id: true,
              status: true,
              clickedAt: true,
              qualifiedAt:
                true,
              createdAt: true,
              campaign: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "Customer not found.",
        },
        {
          status: 404,
        },
      );
    }

    const deliveredOrders =
      customer.orders.filter(
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

    const totalOrderValue =
      customer.orders.reduce(
        (total, order) =>
          total +
          Number(
            order.totalAmount,
          ),
        0,
      );

    return NextResponse.json({
      success: true,

      customer: {
        ...customer,

        metrics: {
          totalOrders:
            customer.orders.length,
          deliveredOrders:
            deliveredOrders.length,
          totalSpent,
          totalOrderValue,
          addresses:
            customer.addresses.length,
          wishlist:
            customer.wishlist.length,
          reviews:
            customer.reviews.length,
          referrals:
            customer.offerReferrals
              .length,
          referralVisits:
            customer.offerReferrals.reduce(
              (
                total,
                referral,
              ) =>
                total +
                referral._count
                  .visits,
              0,
            ),
          claims:
            customer
              .campaignClaims
              .length,
        },
      },
    });
  } catch (error) {
    console.error(
      "GET /api/admin/customers/[id] failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load customer profile.",
      },
      {
        status: 500,
      },
    );
  }
}

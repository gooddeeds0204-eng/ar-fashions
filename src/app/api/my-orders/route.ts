import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedCustomerId,
} from "@/lib/customer-auth";

export async function GET() {
  try {
    const userId =
      await getAuthenticatedCustomerId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please place an order or sign in to view your orders.",
        },
        { status: 401 },
      );
    }

    const orders =
      await prisma.order.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          address: true,
          items: {
            include: {
              product: {
                select: {
                  media: {
                    where: {
                      isActive: true,
                    },
                    orderBy: {
                      sortOrder: "asc",
                    },
                    select: {
                      url: true,
                      thumbnailUrl: true,
                      type: true,
                    },
                  },
                },
              },
            },
          },
          payment: true,
        },
      });

    const shipmentKeys =
      orders.map(
        (order) =>
          `shipment_v1_${order.id}`,
      );

    const shipmentRows =
      shipmentKeys.length > 0
        ? await prisma.siteSetting.findMany({
            where: {
              key: {
                in:
                  shipmentKeys,
              },
            },
          })
        : [];

    const shipmentByKey =
      new Map<
        string,
        Record<string, unknown>
      >();

    for (
      const row of
      shipmentRows
    ) {
      try {
        shipmentByKey.set(
          row.key,
          JSON.parse(
            row.value,
          ) as Record<
            string,
            unknown
          >,
        );
      } catch {}
    }

    const data = orders.map(
      (order) => ({
        id: order.id,
        orderNumber:
          order.orderNumber,
        type: order.type,
        status: order.status,
        paymentStatus:
          order.paymentStatus,
        paymentMethod:
          order.paymentMethod,
        subtotal:
          Number(order.subtotal),
        discountAmount:
          Number(
            order.discountAmount,
          ),
        deliveryCharge:
          Number(
            order.deliveryCharge,
          ),
        totalAmount:
          Number(
            order.totalAmount,
          ),
        createdAt:
          order.createdAt,
        updatedAt:
          order.updatedAt,

        address: order.address
          ? {
              name:
                order.address.name,
              phone:
                order.address.phone,
              addressLine1:
                order.address
                  .addressLine1,
              addressLine2:
                order.address
                  .addressLine2,
              city:
                order.address.city,
              state:
                order.address.state,
              pincode:
                order.address.pincode,
              landmark:
                order.address.landmark,
            }
          : null,

        items: order.items.map(
          (item) => ({
            id: item.id,
            productId:
              item.productId,
            variantId:
              item.variantId,
            productName:
              item.productName,
            colorName:
              item.colorName,
            sizeName:
              item.sizeName,
            quantity:
              item.quantity,
            unitPrice:
              Number(
                item.unitPrice,
              ),
            totalPrice:
              Number(
                item.totalPrice,
              ),

            image:
              item.product.media.find(
                (media) =>
                  media.type ===
                  "IMAGE",
              )?.url ??
              item.product.media.find(
                (media) =>
                  Boolean(
                    media.thumbnailUrl,
                  ),
              )?.thumbnailUrl ??
              item.product.media[0]
                ?.url ??
              null,
          }),
        ),

        payment: order.payment
          ? {
              provider:
                order.payment
                  .provider,
              status:
                order.payment.status,
              amount:
                Number(
                  order.payment
                    .amount,
                ),
            }
          : null,

        shipment:
          shipmentByKey.get(
            `shipment_v1_${order.id}`,
          ) ?? null,
      }),
    );

    return NextResponse.json({
      success: true,
      orders: data,
      count: data.length,
    });
  } catch (error) {
    console.error(
      "GET /api/my-orders failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load your orders.",
      },
      { status: 500 },
    );
  }
}

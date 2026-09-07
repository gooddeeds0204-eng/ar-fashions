import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  verifyCustomerSessionToken,
} from "@/lib/customer-session";

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        CUSTOMER_SESSION_COOKIE,
      )?.value;

    const userId =
      verifyCustomerSessionToken(
        token,
      );

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
          items: true,
          payment: true,
        },
      });

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

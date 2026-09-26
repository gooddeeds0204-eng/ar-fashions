import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getAuthenticatedCustomerId } from "@/lib/customer-auth";

const SITE_SETTINGS_KEY = "site_settings_v1";

function invoiceNumber(orderNumber: string) {
  const token = orderNumber
    .replace(/^ASF-/i, "")
    .replace(/[^A-Z0-9-]/gi, "")
    .toUpperCase();

  return `ASF-INV-${token}`;
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      orderNumber: string;
    }>;
  },
) {
  try {
    const [
      admin,
      customerId,
    ] = await Promise.all([
      getAuthenticatedAdmin(),
      getAuthenticatedCustomerId(),
    ]);

    if (!admin && !customerId) {
      return NextResponse.json(
        {
          error:
            "Please sign in to view this invoice.",
        },
        { status: 401 },
      );
    }

    const { orderNumber } =
      await context.params;

    const order =
      await prisma.order.findUnique({
        where: {
          orderNumber:
            decodeURIComponent(
              orderNumber,
            ),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          address: true,
          items: true,
          payment: true,
        },
      });

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Invoice order not found.",
        },
        { status: 404 },
      );
    }

    if (
      !admin &&
      customerId !==
        order.userId
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have access to this invoice.",
        },
        { status: 403 },
      );
    }

    const settingsRow =
      await prisma.siteSetting.findUnique({
        where: {
          key: SITE_SETTINGS_KEY,
        },
        select: {
          value: true,
        },
      });

    let seller = {
      storeName:
        "AS FASHIONS",
      supportPhone: "",
      supportEmail: "",
      whatsappNumber: "",
    };

    if (settingsRow?.value) {
      try {
        const parsed =
          JSON.parse(
            settingsRow.value,
          ) as Record<
            string,
            unknown
          >;

        seller = {
          storeName:
            String(
              parsed.storeName ??
                "AS FASHIONS",
            ).trim() ||
            "AS FASHIONS",
          supportPhone:
            String(
              parsed.supportPhone ??
                "",
            ).trim(),
          supportEmail:
            String(
              parsed.supportEmail ??
                "",
            ).trim(),
          whatsappNumber:
            String(
              parsed.whatsappNumber ??
                "",
            ).trim(),
        };
      } catch {}
    }

    return NextResponse.json({
      success: true,
      invoice: {
        invoiceNumber:
          invoiceNumber(
            order.orderNumber,
          ),
        invoiceDate:
          order.createdAt,
        orderNumber:
          order.orderNumber,
        orderDate:
          order.createdAt,
        orderType:
          order.type,
        orderStatus:
          order.status,
        paymentStatus:
          order.paymentStatus,
        paymentMethod:
          order.paymentMethod,
        subtotal:
          Number(
            order.subtotal,
          ),
        discountAmount:
          Number(
            order.discountAmount,
          ),
        deliveryCharge:
          Number(
            order.deliveryCharge,
          ),
        deliveryChargePending:
          order.deliveryChargePending,
        totalAmount:
          Number(
            order.totalAmount,
          ),
        couponCode:
          order.couponCode,
        seller,
        customer: {
          name:
            order.address
              ?.name ??
            order.user.name ??
            "Customer",
          phone:
            order.address
              ?.phone ??
            order.user.phone ??
            "",
          email:
            order.user.email ??
            "",
          address:
            order.address
              ? {
                  addressLine1:
                    order.address
                      .addressLine1,
                  addressLine2:
                    order.address
                      .addressLine2,
                  city:
                    order.address
                      .city,
                  state:
                    order.address
                      .state,
                  pincode:
                    order.address
                      .pincode,
                  landmark:
                    order.address
                      .landmark,
                }
              : null,
        },
        items:
          order.items.map(
            (
              item,
              index,
            ) => ({
              line:
                index + 1,
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
        payment:
          order.payment
            ? {
                provider:
                  order.payment
                    .provider,
                transactionId:
                  order.payment
                    .transactionId,
                amount:
                  Number(
                    order.payment
                      .amount,
                  ),
                status:
                  order.payment
                    .status,
                paidAt:
                  order.payment
                    .paidAt,
              }
            : null,
      },
    });
  } catch (error) {
    console.error(
      "GET invoice failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load invoice.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type OrderItemInput = {
  productId?: unknown;
  variantId?: unknown;
  quantity?: unknown;
  mode?: unknown;
};

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function validQuantity(value: unknown) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0
    ? number
    : null;
}

function generateOrderNumber() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  const random = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `ARF-${year}${month}${day}-${random}`;
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "RETURN_REQUESTED",
      "RETURNED",
      "REFUNDED",
    ];

    const orders = await prisma.order.findMany({
      where: {
        ...(status && validStatuses.includes(status)
          ? { status: status as any }
          : {}),
        ...(type === "RETAIL" || type === "RESELLER"
          ? { type: type as any }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: true,
        address: true,
        items: true,
        payment: true,
      },
    });

    const data = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      deliveryCharge: Number(order.deliveryCharge),
      totalAmount: Number(order.totalAmount),
      couponCode: order.couponCode,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,

      customer: {
        id: order.user.id,
        name: order.user.name,
        phone: order.user.phone,
      },

      address: order.address
        ? {
            name: order.address.name,
            phone: order.address.phone,
            addressLine1: order.address.addressLine1,
            addressLine2: order.address.addressLine2,
            city: order.address.city,
            state: order.address.state,
            pincode: order.address.pincode,
            landmark: order.address.landmark,
          }
        : null,

      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        colorName: item.colorName,
        sizeName: item.sizeName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        inventoryRestored: item.inventoryRestored,
      })),

      payment: order.payment
        ? {
            provider: order.payment.provider,
            transactionId: order.payment.transactionId,
            amount: Number(order.payment.amount),
            status: order.payment.status,
            paidAt: order.payment.paidAt,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      orders: data,
      count: data.length,
    });
  } catch (error) {
    console.error("GET /api/orders failed:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch orders.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const orderId = cleanString(body.orderId);
    const status = cleanString(body.status);

    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "RETURN_REQUESTED",
      "RETURNED",
      "REFUNDED",
    ];

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 },
      );
    }

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid order status." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          items: true,
          payment: true,
        },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      const oldStatus = order.status;

      /*
       * Prevent meaningless status updates.
       */
      if (oldStatus === status) {
        return {
          order: {
            id: order.id,
            status: order.status,
            updatedAt: order.updatedAt,
          },
          stockRestored: false,
        };
      }

      /*
       * Allowed order lifecycle transitions.
       *
       * This prevents invalid jumps such as:
       * PENDING -> RETURNED
       * DELIVERED -> CANCELLED
       * RETURN_REQUESTED -> DELIVERED
       */
      const allowedTransitions: Record<string, string[]> = {
        PENDING: [
          "CONFIRMED",
          "CANCELLED",
        ],

        CONFIRMED: [
          "PACKED",
          "CANCELLED",
        ],

        PACKED: [
          "SHIPPED",
          "CANCELLED",
        ],

        SHIPPED: [
          "DELIVERED",
          "RETURN_REQUESTED",
        ],

        DELIVERED: [
          "RETURN_REQUESTED",
        ],

        RETURN_REQUESTED: [
          "RETURNED",
        ],

        RETURNED: [
          "REFUNDED",
        ],

        CANCELLED: [],
        REFUNDED: [],
      };

      const allowedNextStatuses =
        allowedTransitions[oldStatus] ?? [];

      if (!allowedNextStatuses.includes(status)) {
        throw new Error(
          `Invalid order status transition: ${oldStatus} -> ${status}.`,
        );
      }

      /*
       * Stock should be restored only when an order
       * becomes CANCELLED or RETURNED.
       *
       * RETURN_REQUESTED does NOT restore stock because
       * the return has not yet been approved/completed.
       *
       * REFUNDED does NOT restore stock because the stock
       * was already restored when the order became RETURNED.
       */
      const shouldRestoreStock =
        status === "CANCELLED" ||
        status === "RETURNED";

      let stockRestored = false;

      if (shouldRestoreStock) {
        for (const item of order.items) {
          /*
           * Items without a variant cannot safely restore
           * variant inventory.
           */
          if (!item.variantId) {
            continue;
          }

          /*
           * inventoryRestored makes this operation idempotent.
           * If the same order is patched again, stock will
           * not be incremented twice.
           */
          if (item.inventoryRestored) {
            continue;
          }

          /*
           * Atomically claim this order item for stock restore.
           * This prevents two simultaneous CANCEL/RETURN requests
           * from restoring the same inventory twice.
           */
          const claimed = await tx.orderItem.updateMany({
            where: {
              id: item.id,
              inventoryRestored: false,
            },
            data: {
              inventoryRestored: true,
            },
          });

          if (claimed.count === 0) {
            continue;
          }

          const restored = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
            },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });

          if (restored.count !== 1) {
            throw new Error(
              `Failed to restore stock for ${item.productName}.`,
            );
          }

          stockRestored = true;
        }
      }

      /*
       * Update order status.
       */
      const updated = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: status as any,
        },
      });

      /*
       * If an order is refunded, keep payment state
       * synchronized when a payment record exists.
       */
      if (
        status === "REFUNDED" &&
        order.payment
      ) {
        await tx.payment.update({
          where: {
            orderId,
          },
          data: {
            status: "REFUNDED",
          },
        });
      }

      return {
        order: {
          id: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt,
        },
        stockRestored,
      };
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      stockRestored: result.stockRestored,
    });
  } catch (error) {
    console.error("PATCH /api/orders failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update order.";

    const status =
      message === "Order not found."
        ? 404
        : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const type = cleanString(body.type);
    const paymentMethod = cleanString(
      body.paymentMethod,
    );

    if (
      type !== "RETAIL" &&
      type !== "RESELLER"
    ) {
      return NextResponse.json(
        {
          error: "Invalid order type.",
        },
        { status: 400 },
      );
    }

    if (paymentMethod !== "COD") {
      return NextResponse.json(
        {
          error:
            "Only Cash on Delivery is available right now.",
        },
        { status: 400 },
      );
    }

    const customer = body.customer ?? {};

    const name = cleanString(customer.name);
    const phone = cleanString(customer.phone);
    const addressLine1 = cleanString(
      customer.addressLine1,
    );
    const addressLine2 = cleanString(
      customer.addressLine2,
    );
    const city = cleanString(customer.city);
    const state = cleanString(customer.state);
    const pincode = cleanString(customer.pincode);
    const landmark = cleanString(customer.landmark);

    if (!name) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 },
      );
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "Valid mobile number is required." },
        { status: 400 },
      );
    }

    if (!addressLine1) {
      return NextResponse.json(
        { error: "Address is required." },
        { status: 400 },
      );
    }

    if (!city) {
      return NextResponse.json(
        { error: "City is required." },
        { status: 400 },
      );
    }

    if (!state) {
      return NextResponse.json(
        { error: "State is required." },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: "Valid 6-digit pincode is required." },
        { status: 400 },
      );
    }

    const rawItems = Array.isArray(body.items)
      ? body.items
      : [];

    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "Your cart is empty." },
        { status: 400 },
      );
    }

    const items: OrderItemInput[] = rawItems;

    const result = await prisma.$transaction(
      async (tx) => {
        /*
         * 1. Find existing customer by phone
         *    or create a new customer.
         */
        const user = await tx.user.upsert({
          where: {
            phone,
          },
          update: {
            name,
          },
          create: {
            name,
            phone,
            role: "CUSTOMER",
            status: "ACTIVE",
          },
        });

        /*
         * 2. Create delivery address.
         */
        const address = await tx.address.create({
          data: {
            userId: user.id,
            name,
            phone,
            addressLine1,
            addressLine2:
              addressLine2 || null,
            city,
            state,
            pincode,
            landmark:
              landmark || null,
            isDefault: true,
          },
        });

        /*
         * 3. Validate products and calculate
         *    prices directly from database.
         */
        const orderItems: Array<{
          productId: string;
          variantId: string;
          productName: string;
          colorName: string;
          sizeName: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }> = [];

        let subtotal = 0;

        const resellerProductTotals =
          new Map<
            string,
            {
              productName: string;
              quantity: number;
              moq: number;
            }
          >();

        for (const item of items) {
          const productId = cleanString(
            item.productId,
          );

          const variantId = cleanString(
            item.variantId,
          );

          const quantity = validQuantity(
            item.quantity,
          );

          if (
            !productId ||
            !variantId ||
            !quantity
          ) {
            throw new Error(
              "Invalid cart item.",
            );
          }

          const itemMode =
            cleanString(item.mode) || "RETAIL";

          if (itemMode !== type) {
            throw new Error(
              "Retail and reseller items cannot be mixed in the same order.",
            );
          }

          const variant =
            await tx.productVariant.findUnique({
              where: {
                id: variantId,
              },
              include: {
                product: true,
                color: true,
                size: true,
              },
            });

          if (!variant) {
            throw new Error(
              "One of the selected variants no longer exists.",
            );
          }

          if (
            variant.productId !== productId
          ) {
            throw new Error(
              "Invalid product variant.",
            );
          }

          if (!variant.isActive) {
            throw new Error(
              `${variant.product.name} variant is unavailable.`,
            );
          }

          if (
            variant.product.status !== "ACTIVE"
          ) {
            throw new Error(
              `${variant.product.name} is currently unavailable.`,
            );
          }

          if (
            type === "RETAIL" &&
            variant.product.salesMode !== "RETAIL" &&
            variant.product.salesMode !== "BOTH"
          ) {
            throw new Error(
              `${variant.product.name} is not available for retail purchase.`,
            );
          }

          if (
            type === "RESELLER" &&
            variant.product.salesMode !== "BULK" &&
            variant.product.salesMode !== "BOTH"
          ) {
            throw new Error(
              `${variant.product.name} is not available for reseller purchase.`,
            );
          }

          /*
           * Price always comes from database.
           */
          const rawPrice =
            type === "RESELLER"
              ? variant.resellerPrice ??
                variant.product.resellerPrice
              : variant.retailPrice ??
                variant.product.retailPrice;

          if (
            rawPrice === null ||
            rawPrice === undefined
          ) {
            throw new Error(
              `Price is not configured for ${variant.product.name}.`,
            );
          }

          const price = Number(rawPrice);

          if (
            !Number.isFinite(price) ||
            price < 0
          ) {
            throw new Error(
              `Invalid price for ${variant.product.name}.`,
            );
          }

          /*
           * First stock check.
           */
          if (variant.stock < quantity) {
            throw new Error(
              `Only ${variant.stock} pieces available for ${variant.product.name} (${variant.color.name}, ${variant.size.name}).`,
            );
          }

          if (type === "RESELLER") {
            const moq = Math.max(
              1,
              variant.product.resellerMOQ ?? 1,
            );

            const existing =
              resellerProductTotals.get(productId);

            if (existing) {
              existing.quantity += quantity;
              existing.moq = Math.max(
                existing.moq,
                moq,
              );
            } else {
              resellerProductTotals.set(
                productId,
                {
                  productName:
                    variant.product.name,
                  quantity,
                  moq,
                },
              );
            }
          }

          const totalPrice =
            price * quantity;

          subtotal += totalPrice;

          orderItems.push({
            productId,
            variantId,
            productName:
              variant.product.name,
            colorName:
              variant.color.name,
            sizeName:
              variant.size.name,
            quantity,
            unitPrice: price,
            totalPrice,
          });
        }

        if (type === "RESELLER") {
          for (const group of resellerProductTotals.values()) {
            if (group.quantity < group.moq) {
              throw new Error(
                `Reseller MOQ not reached for ${group.productName}: ${group.quantity}/${group.moq} pieces.`,
              );
            }
          }
        }

        /*
         * 4. Delivery charge.
         */
        const deliveryCharge =
          subtotal >= 999 ? 0 : 79;

        const totalAmount =
          subtotal + deliveryCharge;

        /*
         * 5. Generate order number.
         */
        let orderNumber =
          generateOrderNumber();

        /*
         * Extremely unlikely collision protection.
         */
        while (
          await tx.order.findUnique({
            where: {
              orderNumber,
            },
            select: {
              id: true,
            },
          })
        ) {
          orderNumber =
            generateOrderNumber();
        }

        /*
         * 6. Create order.
         */
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: user.id,
            addressId: address.id,
            type:
              type === "RESELLER"
                ? "RESELLER"
                : "RETAIL",
            status: "PENDING",
            paymentStatus: "PENDING",
            paymentMethod: "COD",
            subtotal,
            discountAmount: 0,
            deliveryCharge,
            totalAmount,
            items: {
              create: orderItems.map(
                (item) => ({
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
                    item.unitPrice,
                  totalPrice:
                    item.totalPrice,
                }),
              ),
            },
          },
          include: {
            items: true,
          },
        });

        /*
         * 7. Safely reduce stock.
         *
         * WHERE stock >= quantity prevents
         * negative stock during simultaneous orders.
         */
        for (const item of orderItems) {
          const stockUpdate =
            await tx.productVariant.updateMany({
              where: {
                id: item.variantId,
                stock: {
                  gte: item.quantity,
                },
              },
              data: {
                stock: {
                  decrement:
                    item.quantity,
                },
              },
            });

          if (
            stockUpdate.count !== 1
          ) {
            throw new Error(
              `Stock changed for ${item.productName}. Please try again.`,
            );
          }
        }

        /*
         * 8. Create pending COD payment record.
         */
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: "COD",
            amount: totalAmount,
            status: "PENDING",
          },
        });

        return {
          orderId: order.id,
          orderNumber:
            order.orderNumber,
          subtotal,
          deliveryCharge,
          totalAmount,
        };
      },
      {
        maxWait: 10000,
        timeout: 15000,
      },
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Order placed successfully.",
        ...result,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/orders failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to place order.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}

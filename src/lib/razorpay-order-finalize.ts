import "server-only";

import { prisma } from "@/lib/prisma";
import {
  mapRazorpayMethod,
  refundRazorpayPayment,
} from "@/lib/razorpay";

export class PaidOrderStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name =
      "PaidOrderStockError";
  }
}

function amountToPaise(
  value: unknown,
) {
  return Math.round(
    Number(value) * 100,
  );
}

export async function finalizeRazorpayPayment(
  input: {
    providerOrderId: string;
    paymentId: string;
    paymentMethod: string;
    amountPaise: number;
  },
) {
  const payment =
    await prisma.payment.findFirst({
      where: {
        provider:
          "RAZORPAY",
        providerOrderId:
          input.providerOrderId,
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });

  if (!payment) {
    throw new Error(
      "Payment order was not found.",
    );
  }

  const expectedAmount =
    amountToPaise(
      payment.amount,
    );

  if (
    expectedAmount !==
    input.amountPaise
  ) {
    throw new Error(
      "Payment amount does not match the order.",
    );
  }

  if (
    payment.status ===
      "PAID" &&
    payment.order
      .paymentStatus ===
      "PAID"
  ) {
    return {
      orderId:
        payment.order.id,
      orderNumber:
        payment.order
          .orderNumber,
      alreadyPaid: true,
    };
  }

  const mappedMethod =
    mapRazorpayMethod(
      input.paymentMethod,
    );

  return prisma.$transaction(
    async (tx) => {
      const currentPayment =
        await tx.payment.findUnique({
          where: {
            orderId:
              payment.orderId,
          },
          include: {
            order: {
              include: {
                items: true,
              },
            },
          },
        });

      if (!currentPayment) {
        throw new Error(
          "Payment record was not found.",
        );
      }

      if (
        currentPayment.status ===
          "PAID" &&
        currentPayment.order
          .paymentStatus ===
          "PAID"
      ) {
        return {
          orderId:
            currentPayment
              .order.id,
          orderNumber:
            currentPayment
              .order
              .orderNumber,
          alreadyPaid: true,
        };
      }

      if (
        currentPayment.order
          .status ===
        "CANCELLED"
      ) {
        throw new Error(
          "This order is cancelled.",
        );
      }

      /*
       * Online payments do not reserve stock
       * before payment. The successful
       * verification transaction atomically
       * claims stock so abandoned checkouts
       * never block inventory.
       */
      for (
        const item of
        currentPayment.order
          .items
      ) {
        if (!item.variantId) {
          throw new PaidOrderStockError(
            `Variant unavailable for ${item.productName}.`,
          );
        }

        const updated =
          await tx.productVariant.updateMany({
            where: {
              id:
                item.variantId,
              stock: {
                gte:
                  item.quantity,
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
          updated.count !== 1
        ) {
          throw new PaidOrderStockError(
            `Stock changed for ${item.productName} after payment.`,
          );
        }
      }

      const updatedOrder =
        await tx.order.update({
          where: {
            id:
              currentPayment
                .order.id,
          },
          data: {
            paymentStatus:
              "PAID",
            paymentMethod:
              mappedMethod,
            status:
              currentPayment
                .order
                .status ===
              "PENDING"
                ? "CONFIRMED"
                : currentPayment
                    .order
                    .status,
          },
        });

      await tx.payment.update({
        where: {
          orderId:
            currentPayment
              .order.id,
        },
        data: {
          transactionId:
            input.paymentId,
          status: "PAID",
          paidAt:
            new Date(),
        },
      });

      return {
        orderId:
          updatedOrder.id,
        orderNumber:
          updatedOrder
            .orderNumber,
        alreadyPaid: false,
      };
    },
    {
      maxWait: 10000,
      timeout: 15000,
    },
  );
}

export async function refundAndCancelRazorpayOrder(
  input: {
    providerOrderId: string;
    paymentId: string;
    amountPaise: number;
    reason: string;
  },
) {
  const payment =
    await prisma.payment.findFirst({
      where: {
        provider:
          "RAZORPAY",
        providerOrderId:
          input.providerOrderId,
      },
      include: {
        order: true,
      },
    });

  if (!payment) {
    throw new Error(
      "Payment order was not found.",
    );
  }

  if (
    payment.status ===
    "REFUNDED"
  ) {
    return {
      orderId:
        payment.orderId,
      orderNumber:
        payment.order
          .orderNumber,
      refunded: true,
    };
  }

  await refundRazorpayPayment(
    input.paymentId,
    input.amountPaise,
  );

  await prisma.$transaction([
    prisma.payment.update({
      where: {
        orderId:
          payment.orderId,
      },
      data: {
        transactionId:
          input.paymentId,
        status:
          "REFUNDED",
      },
    }),

    prisma.order.update({
      where: {
        id:
          payment.orderId,
      },
      data: {
        paymentStatus:
          "REFUNDED",
        status:
          "CANCELLED",
        notes: payment.order
          .notes
          ? `${payment.order.notes}\n${input.reason}`
          : input.reason,
      },
    }),
  ]);

  return {
    orderId:
      payment.orderId,
    orderNumber:
      payment.order
        .orderNumber,
    refunded: true,
  };
}

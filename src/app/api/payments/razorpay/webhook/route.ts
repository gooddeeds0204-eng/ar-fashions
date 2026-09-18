import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyRazorpayWebhookSignature,
} from "@/lib/razorpay";
import {
  PaidOrderStockError,
  finalizeRazorpayPayment,
  refundAndCancelRazorpayOrder,
} from "@/lib/razorpay-order-finalize";

type Entity = Record<
  string,
  unknown
>;

function objectValue(
  value: unknown,
) {
  return value &&
    typeof value ===
      "object"
    ? (value as Entity)
    : {};
}

export async function POST(
  request: Request,
) {
  const rawBody =
    await request.text();

  const signature =
    request.headers.get(
      "x-razorpay-signature",
    ) ?? "";

  if (
    !verifyRazorpayWebhookSignature(
      rawBody,
      signature,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid webhook signature.",
      },
      { status: 401 },
    );
  }

  try {
    const event =
      JSON.parse(
        rawBody,
      ) as Entity;

    const eventName =
      String(
        event.event ?? "",
      );

    const payload =
      objectValue(
        event.payload,
      );

    const paymentEnvelope =
      objectValue(
        payload.payment,
      );

    const payment =
      objectValue(
        paymentEnvelope.entity,
      );

    const paymentId =
      String(
        payment.id ?? "",
      );

    const providerOrderId =
      String(
        payment.order_id ??
          "",
      );

    if (
      eventName ===
        "payment.captured" ||
      eventName ===
        "order.paid"
    ) {
      if (
        paymentId &&
        providerOrderId
      ) {
        try {
          await finalizeRazorpayPayment({
            providerOrderId,
            paymentId,
            paymentMethod:
              String(
                payment.method ??
                  "",
              ),
            amountPaise:
              Number(
                payment.amount,
              ),
          });
        } catch (error) {
          if (
            error instanceof
            PaidOrderStockError
          ) {
            await refundAndCancelRazorpayOrder({
              providerOrderId,
              paymentId,
              amountPaise:
                Number(
                  payment.amount,
                ),
              reason:
                "Automatic refund: stock changed before webhook finalization.",
            });
          } else {
            throw error;
          }
        }
      }
    }

    if (
      eventName ===
        "payment.failed" &&
      providerOrderId
    ) {
      const record =
        await prisma.payment.findFirst({
          where: {
            provider:
              "RAZORPAY",
            providerOrderId,
          },
        });

      if (
        record &&
        record.status !==
          "PAID" &&
        record.status !==
          "REFUNDED"
      ) {
        await prisma.payment.update({
          where: {
            orderId:
              record.orderId,
          },
          data: {
            transactionId:
              paymentId ||
              undefined,
            status:
              "FAILED",
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Razorpay webhook failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}

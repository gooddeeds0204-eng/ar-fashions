import { NextResponse } from "next/server";
import {
  getAuthenticatedCustomerId,
} from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import {
  fetchRazorpayPayment,
  verifyRazorpayPaymentSignature,
} from "@/lib/razorpay";
import {
  PaidOrderStockError,
  finalizeRazorpayPayment,
  refundAndCancelRazorpayOrder,
} from "@/lib/razorpay-order-finalize";
import {
  enforcePublicRateLimit,
  requireSameOriginJson,
} from "@/lib/public-write-security";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(
  request: Request,
) {
  const guard =
    requireSameOriginJson(
      request,
    );

  if (guard) return guard;

  const limited =
    await enforcePublicRateLimit(
      request,
      {
        scope:
          "razorpay-verify",
        limit: 10,
        windowSeconds:
          60 * 10,
      },
    );

  if (limited) {
    return limited;
  }

  try {
    const body =
      await request.json();

    const orderId =
      clean(body.orderId);

    const providerOrderId =
      clean(
        body.razorpay_order_id,
      );

    const paymentId =
      clean(
        body.razorpay_payment_id,
      );

    const signature =
      clean(
        body.razorpay_signature,
      );

    if (
      !orderId ||
      !providerOrderId ||
      !paymentId ||
      !signature
    ) {
      return NextResponse.json(
        {
          error:
            "Payment verification details are incomplete.",
        },
        { status: 400 },
      );
    }

    const userId =
      await getAuthenticatedCustomerId();

    const localOrder =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          payment: true,
        },
      });

    if (
      !localOrder ||
      !userId ||
      localOrder.userId !==
        userId
    ) {
      return NextResponse.json(
        {
          error:
            "Order session is invalid.",
        },
        { status: 403 },
      );
    }

    if (
      localOrder.payment
        ?.provider !==
        "RAZORPAY" ||
      localOrder.payment
        .providerOrderId !==
        providerOrderId
    ) {
      return NextResponse.json(
        {
          error:
            "Payment order does not match.",
        },
        { status: 400 },
      );
    }

    if (
      !verifyRazorpayPaymentSignature(
        providerOrderId,
        paymentId,
        signature,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Payment signature is invalid.",
        },
        { status: 400 },
      );
    }

    const providerPayment =
      await fetchRazorpayPayment(
        paymentId,
      );

    if (
      providerPayment.order_id !==
        providerOrderId ||
      providerPayment.currency !==
        "INR" ||
      providerPayment.status !==
        "captured" ||
      providerPayment.captured !==
        true
    ) {
      return NextResponse.json(
        {
          error:
            "Payment is not captured yet.",
        },
        { status: 409 },
      );
    }

    try {
      const result =
        await finalizeRazorpayPayment({
          providerOrderId,
          paymentId,
          paymentMethod:
            providerPayment.method,
          amountPaise:
            providerPayment.amount,
        });

      return NextResponse.json({
        success: true,
        message:
          "Payment verified successfully.",
        ...result,
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
            providerPayment.amount,
          reason:
            "Automatic refund: stock changed before online payment finalization.",
        });

        return NextResponse.json(
          {
            error:
              "Payment was successful, but stock changed before confirmation. A full refund has been initiated.",
            refunded: true,
          },
          { status: 409 },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error(
      "Razorpay verify failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed.",
      },
      { status: 400 },
    );
  }
}

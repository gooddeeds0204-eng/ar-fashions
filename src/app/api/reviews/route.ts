import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  verifyCustomerSessionToken,
} from "@/lib/customer-session";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

async function getSessionUserId() {
  const cookieStore = await cookies();

  return verifyCustomerSessionToken(
    cookieStore.get(
      CUSTOMER_SESSION_COOKIE,
    )?.value,
  );
}

export async function GET(
  request: Request,
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const productId =
      cleanString(
        searchParams.get(
          "productId",
        ),
      );

    const mine =
      searchParams.get("mine") ===
      "1";

    /*
     * Customer's own reviews.
     * These may include PENDING/HIDDEN
     * so they require secure session.
     */
    if (mine) {
      const userId =
        await getSessionUserId();

      if (!userId) {
        return NextResponse.json(
          {
            error:
              "No customer session found.",
          },
          { status: 401 },
        );
      }

      const reviews =
        await prisma.review.findMany({
          where: {
            userId,
            ...(productId
              ? { productId }
              : {}),
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

      return NextResponse.json({
        success: true,
        reviews,
        count: reviews.length,
      });
    }

    /*
     * Public product reviews.
     * Only APPROVED reviews are shown.
     */
    if (!productId) {
      return NextResponse.json(
        {
          error:
            "Product ID is required.",
        },
        { status: 400 },
      );
    }

    const reviews =
      await prisma.review.findMany({
        where: {
          productId,
          status: "APPROVED",
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce(
            (total, review) =>
              total +
              review.rating,
            0,
          ) / reviews.length
        : 0;

    return NextResponse.json({
      success: true,
      reviews: reviews.map(
        (review) => ({
          id: review.id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          createdAt:
            review.createdAt,
          customerName:
            review.user.name ||
            "Verified Customer",
        }),
      ),
      count: reviews.length,
      averageRating:
        Number(
          averageRating.toFixed(1),
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/reviews failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load reviews.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const userId =
      await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in to review this product.",
        },
        { status: 401 },
      );
    }

    const body =
      await request.json();

    const productId =
      cleanString(
        body.productId,
      );

    const rating =
      Number(body.rating);

    const title =
      cleanString(
        body.title,
      ).slice(0, 100);

    const comment =
      cleanString(
        body.comment,
      ).slice(0, 1000);

    if (!productId) {
      return NextResponse.json(
        {
          error:
            "Product ID is required.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        {
          error:
            "Rating must be between 1 and 5.",
        },
        { status: 400 },
      );
    }

    if (!comment) {
      return NextResponse.json(
        {
          error:
            "Please write a review comment.",
        },
        { status: 400 },
      );
    }

    /*
     * Only customers with a DELIVERED
     * order containing this product
     * can submit a review.
     */
    const deliveredPurchase =
      await prisma.order.findFirst({
        where: {
          userId,
          status: "DELIVERED",
          items: {
            some: {
              productId,
            },
          },
        },
        select: {
          id: true,
        },
      });

    if (!deliveredPurchase) {
      return NextResponse.json(
        {
          error:
            "You can review this product only after delivery.",
        },
        { status: 403 },
      );
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          error:
            "Product not found.",
        },
        { status: 404 },
      );
    }

    /*
     * One review per customer/product.
     * Editing an existing review sends
     * it back to moderation.
     */
    const review =
      await prisma.review.upsert({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        update: {
          rating,
          title:
            title || null,
          comment,
          status: "PENDING",
        },
        create: {
          userId,
          productId,
          rating,
          title:
            title || null,
          comment,
          status: "PENDING",
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Review submitted for approval.",
        review,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/reviews failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to submit review.",
      },
      { status: 500 },
    );
  }
}

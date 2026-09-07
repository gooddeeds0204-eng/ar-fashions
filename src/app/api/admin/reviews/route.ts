import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(
  request: Request,
) {
  try {
    const admin =
      await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "Admin authentication required.",
        },
        { status: 401 },
      );
    }

    const { searchParams } =
      new URL(request.url);

    const status =
      cleanString(
        searchParams.get("status"),
      );

    const validStatuses = [
      "PENDING",
      "APPROVED",
      "HIDDEN",
    ];

    const reviews =
      await prisma.review.findMany({
        where: {
          ...(validStatuses.includes(
            status,
          )
            ? {
                status:
                  status as
                    | "PENDING"
                    | "APPROVED"
                    | "HIDDEN",
              }
            : {}),
        },
        orderBy: {
          createdAt: "desc",
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
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      reviews: reviews.map(
        (review) => ({
          id: review.id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          status: review.status,
          createdAt:
            review.createdAt,
          updatedAt:
            review.updatedAt,

          customer: {
            id: review.user.id,
            name:
              review.user.name,
            email:
              review.user.email,
            phone:
              review.user.phone,
          },

          product: {
            id:
              review.product.id,
            name:
              review.product.name,
            sku:
              review.product.sku,
          },
        }),
      ),
      count: reviews.length,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/reviews failed:",
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

export async function PATCH(
  request: Request,
) {
  try {
    const admin =
      await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "Admin authentication required.",
        },
        { status: 401 },
      );
    }

    const body =
      await request.json();

    const reviewId =
      cleanString(
        body.reviewId,
      );

    const status =
      cleanString(
        body.status,
      );

    if (!reviewId) {
      return NextResponse.json(
        {
          error:
            "Review ID is required.",
        },
        { status: 400 },
      );
    }

    if (
      status !== "APPROVED" &&
      status !== "HIDDEN"
    ) {
      return NextResponse.json(
        {
          error:
            "Review status must be APPROVED or HIDDEN.",
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.review.findUnique({
        where: {
          id: reviewId,
        },
        select: {
          id: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Review not found.",
        },
        { status: 404 },
      );
    }

    const nextStatus =
      status === "APPROVED"
        ? "APPROVED"
        : "HIDDEN";

    const review =
      await prisma.review.update({
        where: {
          id: reviewId,
        },
        data: {
          status: nextStatus,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      message:
        status === "APPROVED"
          ? "Review approved."
          : "Review hidden.",
      review: {
        id: review.id,
        status: review.status,
        product:
          review.product,
        customer:
          review.user,
      },
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/reviews failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update review.",
      },
      { status: 500 },
    );
  }
}

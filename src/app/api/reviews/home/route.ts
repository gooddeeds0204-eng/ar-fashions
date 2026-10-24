import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const publicReviewWhere = {
  status: "APPROVED" as const,
  product: {
    status: "ACTIVE" as const,
    deletedAt: null,
  },
};

function customerDisplayName(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AS Customer";
  return parts[0] + (parts.length > 1 ? ` ${parts[1][0]}.` : "");
}

/**
 * Home testimonials come from approved product reviews only.
 * Customers can create reviews only after a delivered order via /api/reviews.
 * Never generate placeholder ratings or fictitious testimonials.
 */
export async function GET() {
  try {
    const [summary, reviews] = await Promise.all([
      prisma.review.aggregate({
        where: publicReviewWhere,
        _count: { _all: true },
        _avg: { rating: true },
      }),
      prisma.review.findMany({
        where: publicReviewWhere,
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          comment: true,
          rating: true,
          createdAt: true,
          user: { select: { name: true } },
          product: {
            select: {
              id: true,
              name: true,
              media: {
                where: { type: "IMAGE", isActive: true },
                orderBy: { sortOrder: "asc" },
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        count: summary._count._all,
        averageRating: summary._avg.rating == null
          ? null
          : Number(summary._avg.rating.toFixed(1)),
        reviews: reviews.map((review) => ({
          id: review.id,
          title: review.title,
          comment: review.comment,
          rating: review.rating,
          createdAt: review.createdAt,
          customerName: customerDisplayName(review.user.name),
          productId: review.product.id,
          productName: review.product.name,
          productImageUrl: review.product.media[0]?.url ?? null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/reviews/home failed:", error);
    return NextResponse.json(
      { error: "Customer reviews are temporarily unavailable." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const products =
      await prisma.product.count();

    const categories =
      await prisma.category.count({
        where: {
          isActive: true,
        },
      });

    const colors =
      await prisma.color.count({
        where: {
          isActive: true,
        },
      });

    const sizes =
      await prisma.size.count({
        where: {
          isActive: true,
        },
      });

    const salesMode =
      await prisma.salesMode.findFirst({
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          retailStatus: true,
          resellerStatus: true,
        },
      });

    return NextResponse.json({
      success: true,
      stats: {
        products,
        categories,
        colors,
        sizes,
      },
      salesMode: {
        retailStatus:
          salesMode?.retailStatus ??
          "OPEN",
        resellerStatus:
          salesMode?.resellerStatus ??
          "OPEN",
      },
    });
  } catch (error) {
    console.error(
      "GET admin dashboard summary failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load dashboard summary.",
      },
      { status: 500 },
    );
  }
}

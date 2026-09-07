import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    const banners =
      await prisma.banner.findMany({
        where: {
          isActive: true,
          AND: [
            {
              OR: [
                { startsAt: null },
                {
                  startsAt: {
                    lte: now,
                  },
                },
              ],
            },
            {
              OR: [
                { expiresAt: null },
                {
                  expiresAt: {
                    gte: now,
                  },
                },
              ],
            },
          ],
        },
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          title: true,
          subtitle: true,
          imageUrl: true,
          videoUrl: true,
          buttonText: true,
          buttonUrl: true,
          sortOrder: true,
        },
      });

    return NextResponse.json({
      success: true,
      banners,
    });
  } catch (error) {
    console.error(
      "GET public banners failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load banners.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories =
      await prisma.category.findMany({
        where: {
          parentId: null,
          isActive: true,

          OR: [
            {
              products: {
                some: {
                  status: "ACTIVE",
                },
              },
            },

            {
              children: {
                some: {
                  isActive: true,

                  products: {
                    some: {
                      status: "ACTIVE",
                    },
                  },
                },
              },
            },
          ],
        },

        orderBy: [
          { sortOrder: "asc" },
          { name: "asc" },
        ],

        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,

          children: {
            where: {
              isActive: true,

              products: {
                some: {
                  status: "ACTIVE",
                },
              },
            },

            orderBy: [
              { sortOrder: "asc" },
              { name: "asc" },
            ],

            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
            },
          },
        },
      });

    return NextResponse.json({
      categories,
    });
  } catch (error) {
    console.error(
      "GET storefront categories failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load categories.",
      },
      {
        status: 500,
      },
    );
  }
}

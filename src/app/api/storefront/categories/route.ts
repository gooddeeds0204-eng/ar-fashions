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

    const homeCategoryNames = [
      "Women",
      "Men",
      "Kids",
      "Kurtis",
      "Jeans",
      "Girls Dresses",
    ];

    const homeImageCategories =
      await prisma.category.findMany({
        where: {
          isActive: true,
          imageUrl: {
            not: null,
          },
          name: {
            in: homeCategoryNames,
          },
        },

        select: {
          name: true,
          imageUrl: true,
        },

        orderBy: [
          {
            updatedAt: "desc",
          },
        ],
      });

    const homeCategoryImages:
      Record<string, string> = {};

    for (
      const category of
      homeImageCategories
    ) {
      const key =
        category.name
          .trim()
          .toLowerCase();

      if (
        category.imageUrl &&
        !homeCategoryImages[key]
      ) {
        homeCategoryImages[key] =
          category.imageUrl;
      }
    }

    return NextResponse.json({
      categories,
      homeCategoryImages,
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

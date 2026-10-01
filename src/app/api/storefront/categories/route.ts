import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const HOME_CARDS_KEY =
  "home_category_cards_v1";

type PublicHomeCategoryCard = {
  id: string;
  label: string;
  categoryId: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

function normalizeHomeCards(
  value: unknown,
): PublicHomeCategoryCard[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap(
      (raw, index) => {
        if (
          !raw ||
          typeof raw !==
            "object"
        ) {
          return [];
        }

        const item =
          raw as Record<
            string,
            unknown
          >;

        const label =
          String(
            item.label ??
              "",
          ).trim();

        const categoryId =
          String(
            item.categoryId ??
              "",
          ).trim();

        if (
          !label ||
          !categoryId
        ) {
          return [];
        }

        const sortOrder =
          Number(
            item.sortOrder,
          );

        return [
          {
            id:
              String(
                item.id ??
                  `home-card-${index + 1}`,
              ).trim() ||
              `home-card-${index + 1}`,
            label,
            categoryId,
            imageUrl:
              String(
                item.imageUrl ??
                  "",
              ).trim() ||
              null,
            isActive:
              item.isActive !==
              false,
            sortOrder:
              Number.isFinite(
                sortOrder,
              )
                ? Math.trunc(
                    sortOrder,
                  )
                : index,
          },
        ];
      },
    )
    .sort(
      (a, b) =>
        a.sortOrder -
        b.sortOrder,
    );
}

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

    const [
      homeImageCategories,
      homeCardsRow,
    ] = await Promise.all([
      prisma.category.findMany({
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
      }),
      prisma.siteSetting.findUnique({
        where: {
          key:
            HOME_CARDS_KEY,
        },
      }),
    ]);

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

    let homeCategoryCards:
      PublicHomeCategoryCard[] =
      [];

    if (homeCardsRow) {
      try {
        homeCategoryCards =
          normalizeHomeCards(
            JSON.parse(
              homeCardsRow.value,
            ),
          ).filter(
            (card) =>
              card.isActive,
          );
      } catch {
        homeCategoryCards = [];
      }
    }

    if (
      homeCategoryCards.length ===
      0
    ) {
      const flattened = [
        ...categories,
        ...categories.flatMap(
          (main) =>
            main.children,
        ),
      ];

      homeCategoryCards =
        homeCategoryNames.flatMap(
          (
            name,
            index,
          ) => {
            const wanted =
              name
                .trim()
                .toLowerCase();

            const matches =
              flattened.filter(
                (item) =>
                  item.name
                    .trim()
                    .toLowerCase() ===
                  wanted,
              );

            const match =
              matches.find(
                (item) =>
                  Boolean(
                    item.imageUrl,
                  ),
              ) ??
              matches[0];

            if (!match) {
              return [];
            }

            return [
              {
                id:
                  `legacy-${match.id}-${index}`,
                label: name,
                categoryId:
                  match.id,
                imageUrl:
                  homeCategoryImages[
                    wanted
                  ] ??
                  match.imageUrl ??
                  null,
                isActive:
                  true,
                sortOrder:
                  index,
              },
            ];
          },
        );
    }

    return NextResponse.json({
      categories,
      homeCategoryImages,
      homeCategoryCards,
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

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const HOME_CARDS_KEY =
  "home_category_cards_v1";

const CORE_MAIN_CATEGORIES = [
  {
    key: "women",
    name: "Women",
    sortOrder: 0,
  },
  {
    key: "men",
    name: "Men",
    sortOrder: 1,
  },
  {
    key: "girl-kids",
    name: "Girl Kids",
    sortOrder: 2,
  },
  {
    key: "boy-kids",
    name: "Boy Kids",
    sortOrder: 3,
  },
] as const;

type StoredCard = {
  id?: string;
  label?: string;
  categoryId?: string;
  navigationCategoryIds?: string[];
  imageUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

function normalizeName(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugBase(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") ||
    "category";
}

function parseCards(
  raw: string | null | undefined,
): StoredCard[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function firstCardImage(
  cards: StoredCard[],
  aliases: string[],
) {
  const wanted =
    new Set(
      aliases.map(
        normalizeName,
      ),
    );

  const card =
    cards.find(
      (item) =>
        wanted.has(
          normalizeName(
            item.label,
          ),
        ) &&
        Boolean(
          item.imageUrl,
        ),
    );

  return card?.imageUrl
    ? String(
        card.imageUrl,
      )
    : null;
}

function kidsTarget(
  name: string,
):
  | "girl"
  | "boy"
  | null {
  const clean =
    normalizeName(name);

  const girlSignals = [
    "girl",
    "girls",
    "frock",
    "ghagra",
    "lehenga",
    "gown",
    "skirt",
    "punjabi",
  ];

  const boySignals = [
    "boy",
    "boys",
    "sherwani",
    "jodhpuri",
    "waistcoat",
  ];

  if (
    girlSignals.some(
      (signal) =>
        clean.includes(
          signal,
        ),
    )
  ) {
    return "girl";
  }

  if (
    boySignals.some(
      (signal) =>
        clean.includes(
          signal,
        ),
    )
  ) {
    return "boy";
  }

  return null;
}

export async function POST() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const [
      existingMains,
      homeCardsRow,
    ] = await Promise.all([
      prisma.category.findMany({
        where: {
          parentId: null,
        },
        include: {
          children: {
            orderBy: [
              {
                sortOrder:
                  "asc",
              },
              {
                name:
                  "asc",
              },
            ],
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
        orderBy: [
          {
            sortOrder:
              "asc",
          },
          {
            name: "asc",
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

    const storedCards =
      parseCards(
        homeCardsRow?.value,
      );

    const mainByName =
      new Map(
        existingMains.map(
          (category) => [
            normalizeName(
              category.name,
            ),
            category,
          ],
        ),
      );

    const legacyKids =
      existingMains.find(
        (category) =>
          normalizeName(
            category.name,
          ) === "kids",
      ) ?? null;

    const girlFallbackImage =
      firstCardImage(
        storedCards,
        [
          "Girl Kids",
          "Girls Kids",
          "Girls Dresses",
        ],
      ) ??
      legacyKids?.children.find(
        (child) =>
          kidsTarget(
            child.name,
          ) === "girl" &&
          Boolean(
            child.imageUrl,
          ),
      )?.imageUrl ??
      null;

    const boyFallbackImage =
      firstCardImage(
        storedCards,
        [
          "Boy Kids",
          "Boys Kids",
          "Kids",
        ],
      ) ??
      legacyKids?.children.find(
        (child) =>
          kidsTarget(
            child.name,
          ) === "boy" &&
          Boolean(
            child.imageUrl,
          ),
      )?.imageUrl ??
      legacyKids?.imageUrl ??
      null;

    const resolved: Array<{
      key:
        | "women"
        | "men"
        | "girl-kids"
        | "boy-kids";
      id: string;
      name: string;
      imageUrl: string | null;
      sortOrder: number;
    }> = [];

    for (
      let index = 0;
      index <
      CORE_MAIN_CATEGORIES.length;
      index += 1
    ) {
      const core =
        CORE_MAIN_CATEGORIES[
          index
        ];

      const aliases =
        core.key ===
        "girl-kids"
          ? [
              "girl kids",
              "girls kids",
            ]
          : core.key ===
              "boy-kids"
            ? [
                "boy kids",
                "boys kids",
              ]
            : [
                normalizeName(
                  core.name,
                ),
              ];

      let existing =
        aliases
          .map(
            (alias) =>
              mainByName.get(
                alias,
              ),
          )
          .find(Boolean) ??
        null;

      const imageFallback =
        core.key ===
        "women"
          ? firstCardImage(
              storedCards,
              ["Women"],
            )
          : core.key ===
              "men"
            ? firstCardImage(
                storedCards,
                ["Men"],
              )
            : core.key ===
                "girl-kids"
              ? girlFallbackImage
              : boyFallbackImage;

      if (!existing) {
        existing =
          await prisma.category.create({
            data: {
              name:
                core.name,
              slug:
                `${slugBase(
                  core.name,
                )}-${Date.now()}-${index}`,
              imageUrl:
                imageFallback,
              isActive:
                true,
              sortOrder:
                core.sortOrder,
              parentId:
                null,
            },
            include: {
              children: true,
              _count: {
                select: {
                  products:
                    true,
                  children:
                    true,
                },
              },
            },
          });
      } else {
        existing =
          await prisma.category.update({
            where: {
              id:
                existing.id,
            },
            data: {
              name:
                core.name,
              isActive:
                true,
              sortOrder:
                core.sortOrder,
              ...(existing.imageUrl
                ? {}
                : imageFallback
                  ? {
                      imageUrl:
                        imageFallback,
                    }
                  : {}),
            },
            include: {
              children: true,
              _count: {
                select: {
                  products:
                    true,
                  children:
                    true,
                },
              },
            },
          });
      }

      resolved.push({
        key: core.key,
        id: existing.id,
        name:
          core.name,
        imageUrl:
          existing.imageUrl ??
          imageFallback ??
          null,
        sortOrder:
          core.sortOrder,
      });
    }

    const girlMain =
      resolved.find(
        (item) =>
          item.key ===
          "girl-kids",
      );

    const boyMain =
      resolved.find(
        (item) =>
          item.key ===
          "boy-kids",
      );

    const movedToGirl:
      string[] = [];
    const movedToBoy:
      string[] = [];

    if (
      legacyKids &&
      girlMain &&
      boyMain
    ) {
      for (
        const child of
        legacyKids.children
      ) {
        const target =
          kidsTarget(
            child.name,
          );

        if (
          target === "girl"
        ) {
          await prisma.category.update({
            where: {
              id:
                child.id,
            },
            data: {
              parentId:
                girlMain.id,
            },
          });

          movedToGirl.push(
            child.name,
          );
        }

        if (
          target === "boy"
        ) {
          await prisma.category.update({
            where: {
              id:
                child.id,
            },
            data: {
              parentId:
                boyMain.id,
            },
          });

          movedToBoy.push(
            child.name,
          );
        }
      }

      const remaining =
        await prisma.category.count({
          where: {
            parentId:
              legacyKids.id,
          },
        });

      if (
        remaining === 0 &&
        legacyKids._count
          .products === 0
      ) {
        await prisma.category.update({
          where: {
            id:
              legacyKids.id,
          },
          data: {
            isActive:
              false,
          },
        });
      }
    }

    const women =
      resolved.find(
        (item) =>
          item.key ===
          "women",
      )!;

    const men =
      resolved.find(
        (item) =>
          item.key ===
          "men",
      )!;

    const girlKids =
      resolved.find(
        (item) =>
          item.key ===
          "girl-kids",
      )!;

    const boyKids =
      resolved.find(
        (item) =>
          item.key ===
          "boy-kids",
      )!;

    const existingImageFor = (
      aliases: string[],
      fallback:
        string | null,
    ) =>
      firstCardImage(
        storedCards,
        aliases,
      ) ??
      fallback;

    const coreCards = [
      {
        id:
          `core-home-${women.id}`,
        label:
          "Women",
        categoryId:
          women.id,
        navigationCategoryIds:
          [
            women.id,
          ],
        imageUrl:
          existingImageFor(
            ["Women"],
            women.imageUrl,
          ),
        isActive:
          true,
        sortOrder: 0,
      },
      {
        id:
          `core-home-${men.id}`,
        label:
          "Men",
        categoryId:
          men.id,
        navigationCategoryIds:
          [
            men.id,
          ],
        imageUrl:
          existingImageFor(
            ["Men"],
            men.imageUrl,
          ),
        isActive:
          true,
        sortOrder: 1,
      },
      {
        id:
          `core-home-${girlKids.id}`,
        label:
          "Girl Kids",
        categoryId:
          girlKids.id,
        navigationCategoryIds:
          [
            girlKids.id,
          ],
        imageUrl:
          existingImageFor(
            [
              "Girl Kids",
              "Girls Kids",
              "Girls Dresses",
            ],
            girlKids.imageUrl,
          ),
        isActive:
          true,
        sortOrder: 2,
      },
      {
        id:
          `core-home-${boyKids.id}`,
        label:
          "Boy Kids",
        categoryId:
          boyKids.id,
        navigationCategoryIds:
          [
            boyKids.id,
          ],
        imageUrl:
          existingImageFor(
            [
              "Boy Kids",
              "Boys Kids",
              "Kids",
            ],
            boyKids.imageUrl,
          ),
        isActive:
          true,
        sortOrder: 3,
      },
    ];

    await prisma.siteSetting.upsert({
      where: {
        key:
          HOME_CARDS_KEY,
      },
      update: {
        value:
          JSON.stringify(
            coreCards,
          ),
      },
      create: {
        key:
          HOME_CARDS_KEY,
        value:
          JSON.stringify(
            coreCards,
          ),
      },
    });

    const categories =
      await prisma.category.findMany({
        where: {
          parentId: null,
        },
        orderBy: [
          {
            sortOrder:
              "asc",
          },
          {
            name: "asc",
          },
        ],
        include: {
          children: {
            orderBy: [
              {
                sortOrder:
                  "asc",
              },
              {
                name:
                  "asc",
              },
            ],
            include: {
              _count: {
                select: {
                  products:
                    true,
                },
              },
            },
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      cards:
        coreCards,
      categories,
      moved: {
        girl:
          movedToGirl,
        boy:
          movedToBoy,
      },
    });
  } catch (error) {
    console.error(
      "POST core category structure failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to prepare core category structure.",
      },
      {
        status: 500,
      },
    );
  }
}

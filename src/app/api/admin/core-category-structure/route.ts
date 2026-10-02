import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const HOME_CARDS_KEY =
  "home_category_cards_v1";

const SUBCATEGORY_SEED_KEY =
  "core_subcategories_seed_v2";

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

const SUBCATEGORY_BLUEPRINT: Record<
  "women" | "men" | "girl-kids" | "boy-kids",
  Array<{
    name: string;
    aliases?: string[];
  }>
> = {
  women: [
    { name: "Kurta Sets", aliases: ["Kurti Sets", "Kurtis Sets", "Kurta Set", "Kurti Set"] },
    { name: "Kurtis & Tunics", aliases: ["Kurtas & Tunics", "Kurtis", "Kurti", "Kurtas", "Tunics"] },
    { name: "Skirts, Palazzos & Jeggings", aliases: ["Palazzo", "Palazzos", "Palazzo Set", "Plazo Set", "Skirts", "Jeggings"] },
    { name: "Leggings", aliases: ["Legging"] },
    { name: "Salwar Suits", aliases: ["Salwar Suit", "Salwar"] },
    { name: "Dupattas", aliases: ["Dupatta"] },
    { name: "Western Wear", aliases: ["Western"] },
    { name: "T-Shirts, Sweatshirts & Shrugs", aliases: ["T-Shirts", "T Shirts", "TShirts", "Sweatshirts", "Shrugs"] },
    { name: "Jeans" },
    { name: "Shirts" },
    { name: "Shorts & 3/4ths", aliases: ["Shorts", "3/4ths", "Shorts 3/4ths"] },
    { name: "Nightwear", aliases: ["Night Wear"] },
    { name: "Ethnic & Party Wear", aliases: ["Ethnic Wear", "Party Wear", "Ethnic Party Wear"] },
    { name: "Frocks & Dresses", aliases: ["Dresses", "Frocks", "Frock Dresses"] },
    { name: "Sarees", aliases: ["Saree"] },
    { name: "Night & Lounge Wear", aliases: ["Lounge Wear", "Night Lounge Wear"] },
  ],
  men: [
    { name: "Men's Shirts", aliases: ["Men Shirts", "Mens Shirts", "Shirts"] },
    { name: "Men's Jeans", aliases: ["Men Jeans", "Mens Jeans", "Jeans"] },
    { name: "Trousers & Pants", aliases: ["Trousers", "Pants", "Trousers Pants"] },
    { name: "Men's T-Shirts", aliases: ["Men T-Shirts", "Mens T-Shirts", "T-Shirts", "T Shirts", "TShirts"] },
    { name: "Tracksuits", aliases: ["Track Suits", "Tracksuit"] },
    { name: "Shorts", aliases: ["Short"] },
    { name: "Night Suits", aliases: ["Night Suit", "Nightwear"] },
    { name: "Suits & Blazers", aliases: ["Suits", "Blazers", "Suits Blazers"] },
    { name: "Ethnic Wear", aliases: ["Ethnic"] },
    { name: "Undergarments", aliases: ["Under Garments", "Innerwear"] },
  ],
  "girl-kids": [
    { name: "Girls' 3-Piece Sets / Punjabi Dresses", aliases: ["Girls 3 Piece Sets", "3 Piece Sets", "Punjabi Dresses", "Girls Punjabi Dresses"] },
    { name: "Girls' Dresses & Frocks", aliases: ["Girls Dresses", "Dresses", "Frocks", "Girls Dresses Frocks"] },
    { name: "Girls' T-Shirts", aliases: ["Girls T-Shirts", "Girls T Shirts", "T-Shirts", "T Shirts", "TShirts"] },
    { name: "Girls' Tracksuits", aliases: ["Girls Tracksuits", "Tracksuits", "Track Suits"] },
    { name: "Girls' Shorts & 3/4ths", aliases: ["Girls Shorts", "Shorts", "3/4ths", "Shorts 3/4ths"] },
    { name: "Girls' Night Suits", aliases: ["Girls Night Suits", "Night Suits", "Night Suit"] },
    { name: "Palazzos & Jeggings", aliases: ["Palazzos", "Palazzo", "Jeggings"] },
    { name: "Kurtis & Kurtas", aliases: ["Kurtis", "Kurtas", "Kurtis Kurtas"] },
    { name: "Tops" },
    { name: "Jeans" },
    { name: "Pants" },
    { name: "Leggings" },
    { name: "Western Wear & Jackets", aliases: ["Western Wear", "Jackets", "Western Wear Jackets"] },
    { name: "Ethnic Wear", aliases: ["Ghagra", "Lehenga", "Lehengas"] },
    { name: "Party Wear Frocks", aliases: ["Party Wear", "Party Frocks", "Party Wear Frocks"] },
  ],
  "boy-kids": [
    { name: "Boys' Shirts", aliases: ["Boys Shirts", "Boy Shirts", "Shirts"] },
    { name: "Boys' Jeans", aliases: ["Boys Jeans", "Boy Jeans", "Jeans"] },
    { name: "Boys' Pants & Trousers", aliases: ["Boys Pants", "Boys Trousers", "Pants", "Trousers"] },
    { name: "Boys' T-Shirts", aliases: ["Boys T-Shirts", "Boys T Shirts", "T-Shirts", "T Shirts", "TShirts"] },
    { name: "Boys' Tracksuits", aliases: ["Boys Tracksuits", "Tracksuits", "Track Suits"] },
    { name: "Boys' Shorts & 3/4ths", aliases: ["Boys Shorts", "Shorts", "3/4ths", "Shorts 3/4ths"] },
    { name: "Boys' Night Suits", aliases: ["Boys Night Suits", "Night Suits", "Night Suit"] },
    { name: "Boys' Ethnic Wear", aliases: ["Boys Ethnic Wear", "Ethnic Wear", "Sherwani", "Jodhpuri"] },
    { name: "Boys' Western Wear", aliases: ["Boys Western Wear", "Western Wear"] },
    { name: "Boys' Suits & Blazers", aliases: ["Boys Suits", "Boys Blazers", "Suits", "Blazers", "Suits Blazers"] },
  ],
};

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

async function ensureSubcategories(
  main: {
    key: "women" | "men" | "girl-kids" | "boy-kids";
    id: string;
    name: string;
  },
) {
  const existingChildren =
    await prisma.category.findMany({
      where: {
        parentId: main.id,
      },
      orderBy: [
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });

  const usedIds =
    new Set<string>();

  const ids: string[] = [];

  for (
    let index = 0;
    index <
    SUBCATEGORY_BLUEPRINT[
      main.key
    ].length;
    index += 1
  ) {
    const desired =
      SUBCATEGORY_BLUEPRINT[
        main.key
      ][index];

    const wanted =
      new Set(
        [
          desired.name,
          ...(desired.aliases ?? []),
        ].map(
          normalizeName,
        ),
      );

    let existing =
      existingChildren.find(
        (child) =>
          !usedIds.has(
            child.id,
          ) &&
          wanted.has(
            normalizeName(
              child.name,
            ),
          ),
      ) ?? null;

    if (existing) {
      existing =
        await prisma.category.update({
          where: {
            id:
              existing.id,
          },
          data: {
            name:
              desired.name,
            sortOrder:
              index,
            isActive:
              true,
          },
        });

      usedIds.add(
        existing.id,
      );

      ids.push(
        existing.id,
      );

      continue;
    }

    const created =
      await prisma.category.create({
        data: {
          name:
            desired.name,
          slug:
            `${slugBase(
              desired.name,
            )}-${slugBase(
              main.name,
            )}-${Date.now()}-${index}`,
          parentId:
            main.id,
          sortOrder:
            index,
          isActive:
            true,
        },
      });

    usedIds.add(
      created.id,
    );

    ids.push(
      created.id,
    );
  }

  return ids;
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
      subcategorySeedRow,
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
      prisma.siteSetting.findUnique({
        where: {
          key:
            SUBCATEGORY_SEED_KEY,
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

    if (!subcategorySeedRow) {
      await Promise.all([
        ensureSubcategories({
          key: "women",
          id: women.id,
          name: women.name,
        }),
        ensureSubcategories({
          key: "men",
          id: men.id,
          name: men.name,
        }),
        ensureSubcategories({
          key: "girl-kids",
          id: girlKids.id,
          name: girlKids.name,
        }),
        ensureSubcategories({
          key: "boy-kids",
          id: boyKids.id,
          name: boyKids.name,
        }),
      ]);

      await prisma.siteSetting.upsert({
        where: {
          key:
            SUBCATEGORY_SEED_KEY,
        },
        update: {
          value:
            new Date().toISOString(),
        },
        create: {
          key:
            SUBCATEGORY_SEED_KEY,
          value:
            new Date().toISOString(),
        },
      });
    }

    async function activeChildIds(
      parentId: string,
    ) {
      const children =
        await prisma.category.findMany({
          where: {
            parentId,
            isActive:
              true,
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
          select: {
            id: true,
          },
        });

      return children.map(
        (child) =>
          child.id,
      );
    }

    const [
      womenSubcategoryIds,
      menSubcategoryIds,
      girlSubcategoryIds,
      boySubcategoryIds,
    ] = await Promise.all([
      activeChildIds(
        women.id,
      ),
      activeChildIds(
        men.id,
      ),
      activeChildIds(
        girlKids.id,
      ),
      activeChildIds(
        boyKids.id,
      ),
    ]);

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
          womenSubcategoryIds,
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
          menSubcategoryIds,
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
          girlSubcategoryIds,
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
          boySubcategoryIds,
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

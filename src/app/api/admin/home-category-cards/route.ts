import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const SETTINGS_KEY =
  "home_category_cards_v1";

const DEFAULT_NAMES = [
  "Women",
  "Men",
  "Kids",
  "Kurtis",
  "Jeans",
  "Girls Dresses",
] as const;

type HomeCategoryCard = {
  id: string;
  label: string;
  categoryId: string;
  navigationCategoryIds: string[];
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

function cleanText(
  value: unknown,
  max = 120,
) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function normalizeCards(
  value: unknown,
): HomeCategoryCard[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const cards: HomeCategoryCard[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index];

    if (
      !raw ||
      typeof raw !== "object"
    ) {
      continue;
    }

    const item =
      raw as Record<string, unknown>;

    const id =
      cleanText(item.id, 100) ||
      `home-card-${index + 1}`;

    const label =
      cleanText(item.label, 80);

    const categoryId =
      cleanText(
        item.categoryId,
        100,
      );

    if (
      !label ||
      !categoryId ||
      seen.has(id)
    ) {
      continue;
    }

    seen.add(id);

    const sortOrder =
      Number(item.sortOrder);

    const navigationCategoryIds =
      Array.isArray(
        item.navigationCategoryIds,
      )
        ? Array.from(
            new Set(
              item.navigationCategoryIds
                .map((value) =>
                  cleanText(
                    value,
                    100,
                  ),
                )
                .filter(Boolean),
            ),
          )
        : [];

    cards.push({
      id,
      label,
      categoryId,
      navigationCategoryIds,
      imageUrl:
        cleanText(
          item.imageUrl,
          2000,
        ) || null,
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
    });
  }

  return cards.sort(
    (a, b) =>
      a.sortOrder -
      b.sortOrder,
  );
}

async function fallbackCards() {
  const categories =
    await prisma.category.findMany({
      where: {
        isActive: true,
        name: {
          in: [
            ...DEFAULT_NAMES,
          ],
        },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        sortOrder: true,
      },
      orderBy: [
        {
          updatedAt:
            "desc",
        },
      ],
    });

  return DEFAULT_NAMES.flatMap(
    (name, index) => {
      const matches =
        categories.filter(
          (category) =>
            category.name
              .trim()
              .toLowerCase() ===
            name.toLowerCase(),
        );

      const match =
        matches.find(
          (category) =>
            Boolean(
              category.imageUrl,
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
          navigationCategoryIds:
            [],
          imageUrl:
            match.imageUrl,
          isActive: true,
          sortOrder:
            index,
        },
      ];
    },
  );
}

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const row =
      await prisma.siteSetting.findUnique({
        where: {
          key: SETTINGS_KEY,
        },
      });

    if (row) {
      try {
        const cards =
          normalizeCards(
            JSON.parse(
              row.value,
            ),
          );

        if (
          cards.length > 0
        ) {
          return NextResponse.json({
            cards,
            configured: true,
          });
        }
      } catch {
        // Fall through to legacy storefront cards.
      }
    }

    return NextResponse.json({
      cards:
        await fallbackCards(),
      configured: false,
    });
  } catch (error) {
    console.error(
      "GET admin home category cards failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load home category cards.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const cards =
      normalizeCards(
        body.cards,
      );

    if (
      cards.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one home category card is required.",
        },
        {
          status: 400,
        },
      );
    }

    const categoryIds =
      Array.from(
        new Set(
          cards.flatMap(
            (card) => [
              card.categoryId,
              ...card.navigationCategoryIds,
            ],
          ),
        ),
      );

    const categories =
      await prisma.category.findMany({
        where: {
          id: {
            in: categoryIds,
          },
        },
        select: {
          id: true,
        },
      });

    const validIds =
      new Set(
        categories.map(
          (category) =>
            category.id,
        ),
      );

    const invalid =
      cards.find(
        (card) =>
          !validIds.has(
            card.categoryId,
          ),
      );

    if (invalid) {
      return NextResponse.json(
        {
          error:
            `Linked category not found for "${invalid.label}".`,
        },
        {
          status: 400,
        },
      );
    }

    await prisma.siteSetting.upsert({
      where: {
        key: SETTINGS_KEY,
      },
      update: {
        value:
          JSON.stringify(
            cards,
          ),
      },
      create: {
        key: SETTINGS_KEY,
        value:
          JSON.stringify(
            cards,
          ),
      },
    });

    return NextResponse.json({
      success: true,
      cards,
    });
  } catch (error) {
    console.error(
      "PATCH admin home category cards failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to save home category cards.",
      },
      {
        status: 500,
      },
    );
  }
}

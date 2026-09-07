import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const SET_TYPES = [
  "FIXED",
  "MIXED",
  "ASSORTED",
] as const;

const SET_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "SOLD_OUT",
] as const;

type SetType = (typeof SET_TYPES)[number];
type SetStatus = (typeof SET_STATUSES)[number];

type IncomingItem = {
  productId?: unknown;
  quantity?: unknown;
};

function cleanString(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function optionalString(value: unknown) {
  const cleaned = cleanString(value);
  return cleaned || null;
}

function validType(
  value: unknown,
): value is SetType {
  return (
    typeof value === "string" &&
    SET_TYPES.includes(value as SetType)
  );
}

function validStatus(
  value: unknown,
): value is SetStatus {
  return (
    typeof value === "string" &&
    SET_STATUSES.includes(
      value as SetStatus,
    )
  );
}

function nonNegativeInteger(
  value: unknown,
) {
  const number = Number(value);

  return Number.isInteger(number) &&
    number >= 0
    ? number
    : null;
}

function positiveInteger(
  value: unknown,
) {
  const number = Number(value);

  return Number.isInteger(number) &&
    number > 0
    ? number
    : null;
}

function positiveMoney(
  value: unknown,
) {
  const number = Number(value);

  return Number.isFinite(number) &&
    number > 0
    ? Math.round(number * 100) / 100
    : null;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "reseller-set"
  );
}

async function uniqueSlug(
  name: string,
  excludeId?: string,
) {
  const base = slugify(name);
  let slug = base;
  let counter = 2;

  while (true) {
    const existing =
      await prisma.resellerSet.findUnique({
        where: { slug },
        select: { id: true },
      });

    if (
      !existing ||
      existing.id === excludeId
    ) {
      return slug;
    }

    slug = `${base}-${counter}`;
    counter += 1;
  }
}

function normalizeItems(
  rawItems: unknown,
) {
  if (!Array.isArray(rawItems)) {
    return null;
  }

  const quantities =
    new Map<string, number>();

  for (const rawItem of rawItems) {
    const item =
      (rawItem ?? {}) as IncomingItem;

    const productId = cleanString(
      item.productId,
    );

    const quantity = positiveInteger(
      item.quantity,
    );

    if (!productId || !quantity) {
      return null;
    }

    quantities.set(
      productId,
      (quantities.get(productId) ?? 0) +
        quantity,
    );
  }

  return Array.from(
    quantities.entries(),
  ).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

async function loadCatalogProducts(
  productIds: string[],
) {
  return prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      status: true,
      retailPrice: true,
      resellerPrice: true,
    },
  });
}

function serializeSet(set: any) {
  return {
    id: set.id,
    name: set.name,
    slug: set.slug,
    description: set.description,
    type: set.type,
    pieces: set.pieces,
    setPrice: Number(set.setPrice),
    perPiecePrice: Number(
      set.perPiecePrice,
    ),
    moq: set.moq,
    videoUrl: set.videoUrl,
    thumbnailUrl: set.thumbnailUrl,
    status: set.status,
    isFeatured: set.isFeatured,
    sortOrder: set.sortOrder,
    createdAt: set.createdAt,
    updatedAt: set.updatedAt,
    items: (set.items ?? []).map(
      (item: any) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(
          item.unitPrice,
        ),
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              sku: item.product.sku,
              status:
                item.product.status,
              retailPrice: Number(
                item.product
                  .retailPrice,
              ),
              resellerPrice:
                item.product
                  .resellerPrice ===
                null
                  ? null
                  : Number(
                      item.product
                        .resellerPrice,
                    ),
              image:
                item.product
                  .media?.[0]?.url ??
                null,
            }
          : null,
      }),
    ),
    colors: (set.colors ?? []).map(
      (entry: any) => ({
        id: entry.id,
        quantity: entry.quantity,
        color: entry.color,
      }),
    ),
    sizes: (set.sizes ?? []).map(
      (entry: any) => ({
        id: entry.id,
        quantity: entry.quantity,
        size: entry.size,
      }),
    ),
    contentCount:
      set._count?.contents ?? 0,
  };
}

const setInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          status: true,
          retailPrice: true,
          resellerPrice: true,
          media: {
            where: {
              isActive: true,
            },
            orderBy: {
              sortOrder: "asc" as const,
            },
            take: 1,
            select: {
              url: true,
            },
          },
        },
      },
    },
    orderBy: {
      id: "asc" as const,
    },
  },
  colors: {
    include: {
      color: true,
    },
  },
  sizes: {
    include: {
      size: true,
    },
  },
  _count: {
    select: {
      contents: true,
    },
  },
};

export async function GET() {
  const auth = await requireAdmin();

  if (auth) {
    return auth;
  }

  try {
    const [sets, products] =
      await Promise.all([
        prisma.resellerSet.findMany({
          orderBy: [
            { sortOrder: "asc" },
            { createdAt: "desc" },
          ],
          include: setInclude,
        }),

        prisma.product.findMany({
          orderBy: [
            { sortOrder: "asc" },
            { createdAt: "desc" },
          ],
          select: {
            id: true,
            name: true,
            sku: true,
            status: true,
            retailPrice: true,
            resellerPrice: true,

            media: {
              where: {
                isActive: true,
              },
              orderBy: {
                sortOrder: "asc",
              },
              take: 1,
              select: {
                url: true,
              },
            },
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      sets: sets.map(serializeSet),
      products: products.map(
        (product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          status: product.status,
          retailPrice: Number(
            product.retailPrice,
          ),
          resellerPrice:
            product.resellerPrice ===
            null
              ? null
              : Number(
                  product.resellerPrice,
                ),

          image:
            product.media[0]?.url ??
            null,
        }),
      ),
    });
  } catch (error) {
    console.error(
      "GET /api/admin/reseller-sets failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load reseller sets.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  const auth = await requireAdmin();

  if (auth) {
    return auth;
  }

  try {
    const body = await request.json();

    const name = cleanString(body.name);
    const description =
      optionalString(body.description);

    const type = body.type;
    const status =
      body.status ?? "DRAFT";

    const setPrice = positiveMoney(
      body.setPrice,
    );

    const moq =
      positiveInteger(body.moq ?? 1);

    const sortOrder =
      nonNegativeInteger(
        body.sortOrder ?? 0,
      );

    const items = normalizeItems(
      body.items,
    );

    if (!name) {
      return NextResponse.json(
        {
          error: "Set name is required.",
        },
        { status: 400 },
      );
    }

    if (!validType(type)) {
      return NextResponse.json(
        {
          error:
            "Invalid reseller set type.",
        },
        { status: 400 },
      );
    }

    if (!validStatus(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid reseller set status.",
        },
        { status: 400 },
      );
    }

    if (setPrice === null) {
      return NextResponse.json(
        {
          error:
            "Set price must be greater than 0.",
        },
        { status: 400 },
      );
    }

    if (moq === null) {
      return NextResponse.json(
        {
          error:
            "MOQ must be at least 1 set.",
        },
        { status: 400 },
      );
    }

    if (sortOrder === null) {
      return NextResponse.json(
        {
          error:
            "Sort order must be 0 or greater.",
        },
        { status: 400 },
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        {
          error:
            "Add at least one product to the set.",
        },
        { status: 400 },
      );
    }

    const products =
      await loadCatalogProducts(
        items.map(
          (item) => item.productId,
        ),
      );

    if (
      products.length !==
      items.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more selected products no longer exist.",
        },
        { status: 400 },
      );
    }

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ]),
    );

    const pieces = items.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    );

    const slug = await uniqueSlug(
      name,
    );

    const set =
      await prisma.resellerSet.create({
        data: {
          name,
          slug,
          description,
          type,
          pieces,
          setPrice,
          perPiecePrice:
            Math.round(
              (setPrice / pieces) *
                100,
            ) / 100,
          moq,
          videoUrl: optionalString(
            body.videoUrl,
          ),
          thumbnailUrl:
            optionalString(
              body.thumbnailUrl,
            ),
          status,
          isFeatured:
            body.isFeatured === true,
          sortOrder,
          items: {
            create: items.map(
              (item) => {
                const product =
                  productMap.get(
                    item.productId,
                  )!;

                return {
                  productId:
                    item.productId,
                  quantity:
                    item.quantity,
                  unitPrice:
                    product.resellerPrice ??
                    product.retailPrice,
                };
              },
            ),
          },
        },
        include: setInclude,
      });

    return NextResponse.json(
      {
        success: true,
        set: serializeSet(set),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/admin/reseller-sets failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to create reseller set.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  const auth = await requireAdmin();

  if (auth) {
    return auth;
  }

  try {
    const body = await request.json();
    const id = cleanString(body.id);

    if (!id) {
      return NextResponse.json(
        {
          error: "Set id is required.",
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.resellerSet.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Reseller set not found.",
        },
        { status: 404 },
      );
    }

    const name =
      body.name === undefined
        ? existing.name
        : cleanString(body.name);

    if (!name) {
      return NextResponse.json(
        {
          error: "Set name is required.",
        },
        { status: 400 },
      );
    }

    const type =
      body.type === undefined
        ? existing.type
        : body.type;

    if (!validType(type)) {
      return NextResponse.json(
        {
          error:
            "Invalid reseller set type.",
        },
        { status: 400 },
      );
    }

    const status =
      body.status === undefined
        ? existing.status
        : body.status;

    if (!validStatus(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid reseller set status.",
        },
        { status: 400 },
      );
    }

    const setPrice =
      body.setPrice === undefined
        ? Number(existing.setPrice)
        : positiveMoney(
            body.setPrice,
          );

    if (setPrice === null) {
      return NextResponse.json(
        {
          error:
            "Set price must be greater than 0.",
        },
        { status: 400 },
      );
    }

    const moq =
      body.moq === undefined
        ? existing.moq
        : positiveInteger(body.moq);

    if (moq === null) {
      return NextResponse.json(
        {
          error:
            "MOQ must be at least 1 set.",
        },
        { status: 400 },
      );
    }

    const sortOrder =
      body.sortOrder === undefined
        ? existing.sortOrder
        : nonNegativeInteger(
            body.sortOrder,
          );

    if (sortOrder === null) {
      return NextResponse.json(
        {
          error:
            "Sort order must be 0 or greater.",
        },
        { status: 400 },
      );
    }

    const incomingItems =
      body.items === undefined
        ? existing.items.map(
            (item) => ({
              productId:
                item.productId,
              quantity:
                item.quantity,
            }),
          )
        : normalizeItems(body.items);

    if (
      !incomingItems ||
      incomingItems.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Add at least one product to the set.",
        },
        { status: 400 },
      );
    }

    const products =
      await loadCatalogProducts(
        incomingItems.map(
          (item) => item.productId,
        ),
      );

    if (
      products.length !==
      incomingItems.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more selected products no longer exist.",
        },
        { status: 400 },
      );
    }

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ]),
    );

    const pieces =
      incomingItems.reduce(
        (total, item) =>
          total + item.quantity,
        0,
      );

    const slug =
      name === existing.name
        ? existing.slug
        : await uniqueSlug(
            name,
            id,
          );

    const updated =
      await prisma.$transaction(
        async (tx) => {
          await tx.resellerSetItem.deleteMany(
            {
              where: {
                setId: id,
              },
            },
          );

          return tx.resellerSet.update({
            where: { id },
            data: {
              name,
              slug,
              description:
                body.description ===
                undefined
                  ? existing.description
                  : optionalString(
                      body.description,
                    ),
              type,
              pieces,
              setPrice,
              perPiecePrice:
                Math.round(
                  (setPrice /
                    pieces) *
                    100,
                ) / 100,
              moq,
              videoUrl:
                body.videoUrl ===
                undefined
                  ? existing.videoUrl
                  : optionalString(
                      body.videoUrl,
                    ),
              thumbnailUrl:
                body.thumbnailUrl ===
                undefined
                  ? existing.thumbnailUrl
                  : optionalString(
                      body.thumbnailUrl,
                    ),
              status,
              isFeatured:
                body.isFeatured ===
                undefined
                  ? existing.isFeatured
                  : body.isFeatured ===
                    true,
              sortOrder,
              items: {
                create:
                  incomingItems.map(
                    (item) => {
                      const product =
                        productMap.get(
                          item.productId,
                        )!;

                      return {
                        productId:
                          item.productId,
                        quantity:
                          item.quantity,
                        unitPrice:
                          product.resellerPrice ??
                          product.retailPrice,
                      };
                    },
                  ),
              },
            },
            include: setInclude,
          });
        },
        {
          maxWait: 10000,
          timeout: 15000,
        },
      );

    return NextResponse.json({
      success: true,
      set: serializeSet(updated),
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/reseller-sets failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update reseller set.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
) {
  const auth = await requireAdmin();

  if (auth) {
    return auth;
  }

  try {
    const body = await request.json();
    const id = cleanString(body.id);

    if (!id) {
      return NextResponse.json(
        {
          error: "Set id is required.",
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.resellerSet.findUnique({
        where: { id },
        select: {
          id: true,
          _count: {
            select: {
              contents: true,
            },
          },
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Reseller set not found.",
        },
        { status: 404 },
      );
    }

    if (
      existing._count.contents > 0
    ) {
      return NextResponse.json(
        {
          error:
            "This set has reseller purchase/content history. Mark it INACTIVE instead of deleting it.",
        },
        { status: 409 },
      );
    }

    await prisma.resellerSet.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/reseller-sets failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete reseller set.",
      },
      { status: 500 },
    );
  }
}

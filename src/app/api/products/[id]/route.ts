import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PRODUCT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "OUT_OF_STOCK",
] as const;

function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function requiredNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : null;
}


function getSkuToken(value: string, fallback: string) {
  const cleaned = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");

  return cleaned.slice(0, 4) || fallback;
}

function getColorSkuCode(colorName: string) {
  const known: Record<string, string> = {
    BLACK: "BLK",
    WHITE: "WHT",
    BLUE: "BLU",
    RED: "RED",
    GREEN: "GRN",
    YELLOW: "YLW",
    PINK: "PNK",
    PURPLE: "PUR",
    ORANGE: "ORG",
    BROWN: "BRN",
    GREY: "GRY",
    GRAY: "GRY",
    NAVY: "NVY",
    MAROON: "MRN",
    BEIGE: "BEG",
    CREAM: "CRM",
  };

  const normalized = String(colorName ?? "")
    .trim()
    .toUpperCase();

  return (
    known[normalized] ??
    getSkuToken(normalized, "COL")
  );
}

function getSizeSkuCode(sizeName: string) {
  const normalized = String(sizeName ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  const known: Record<string, string> = {
    XS: "XS",
    S: "S",
    M: "M",
    L: "L",
    XL: "XL",
    XXL: "XXL",
    XXXL: "3XL",
    "2XL": "2XL",
    "3XL": "3XL",
    "4XL": "4XL",
    FREE: "FS",
    FREESIZE: "FS",
  };

  return (
    known[normalized] ??
    getSkuToken(normalized, "SZ")
  );
}

/**
 * GET /api/products/[id]
 * Load complete product details.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: { id },

      include: {
        category: true,

        variants: {
          include: {
            color: true,
            size: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        media: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },

        _count: {
          select: {
            variants: true,
            media: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error(
      "GET /api/products/[id] failed:",
      error,
    );

    return NextResponse.json(
      { error: "Failed to load product" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/products/[id]
 * Update product + variants.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const existingProduct =
      await prisma.product.findUnique({
        where: { id },
      });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    const name = String(
      body.name ?? existingProduct.name,
    ).trim();

    const categoryId = String(
      body.categoryId ?? existingProduct.categoryId,
    ).trim();

    if (!name) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 },
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 },
      );
    }

    const category =
      await prisma.category.findUnique({
        where: { id: categoryId },
      });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const retailPrice = requiredNumber(
      body.retailPrice ??
        existingProduct.retailPrice,
    );

    if (retailPrice === null) {
      return NextResponse.json(
        { error: "Valid retail price is required" },
        { status: 400 },
      );
    }

    const resellerPrice =
      body.resellerPrice === undefined
        ? existingProduct.resellerPrice
          ? Number(existingProduct.resellerPrice)
          : null
        : optionalNumber(body.resellerPrice);

    const mrp =
      body.mrp === undefined
        ? existingProduct.mrp
          ? Number(existingProduct.mrp)
          : null
        : optionalNumber(body.mrp);

    const resellerMOQ =
      body.resellerMOQ === undefined
        ? existingProduct.resellerMOQ
        : optionalNumber(body.resellerMOQ);

    const status =
      body.status ??
      existingProduct.status;

    if (
      !PRODUCT_STATUSES.includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid product status" },
        { status: 400 },
      );
    }

    const gender =
      body.gender ??
      existingProduct.gender;

    const validGenders = [
      "WOMEN",
      "MEN",
      "KIDS",
      "UNISEX",
    ];

    if (!validGenders.includes(gender)) {
      return NextResponse.json(
        { error: "Invalid product gender" },
        { status: 400 },
      );
    }

    const salesMode =
      body.salesMode ??
      existingProduct.salesMode;

    const validSalesModes = [
      "RETAIL",
      "BULK",
      "BOTH",
    ];

    if (!validSalesModes.includes(salesMode)) {
      return NextResponse.json(
        { error: "Invalid sales mode" },
        { status: 400 },
      );
    }

    type VariantInput = {
      id?: string;
      colorId: string;
      sizeId: string;
      sku?: string | null;
      stock?: number | string | null;
      costPrice?: number | string | null;
      retailPrice?: number | string | null;
      resellerPrice?: number | string | null;
      isActive?: boolean;
    };

    const variants: VariantInput[] =
      Array.isArray(body.variants)
        ? body.variants.map(
            (variant: unknown) => {
              const item =
                variant as Record<
                  string,
                  unknown
                >;

              return {
                id:
                  item.id
                    ? String(item.id)
                    : undefined,

                colorId: String(
                  item.colorId ?? "",
                ).trim(),

                sizeId: String(
                  item.sizeId ?? "",
                ).trim(),

                sku:
                  item.sku === undefined ||
                  item.sku === null ||
                  item.sku === ""
                    ? null
                    : String(
                        item.sku,
                      ).trim(),

                stock:
                  item.stock as
                    | number
                    | string
                    | null
                    | undefined,

                costPrice:
                  item.costPrice as
                    | number
                    | string
                    | null
                    | undefined,

                retailPrice:
                  item.retailPrice as
                    | number
                    | string
                    | null
                    | undefined,

                resellerPrice:
                  item.resellerPrice as
                    | number
                    | string
                    | null
                    | undefined,

                isActive:
                  item.isActive ===
                  undefined
                    ? true
                    : Boolean(
                        item.isActive,
                      ),
              };
            },
          )
        : [];

    const combinationSet =
      new Set<string>();

    for (const variant of variants) {
      if (
        !variant.colorId ||
        !variant.sizeId
      ) {
        return NextResponse.json(
          {
            error:
              "Every variant must have color and size",
          },
          { status: 400 },
        );
      }

      const combination =
        `${variant.colorId}:${variant.sizeId}`;

      if (
        combinationSet.has(
          combination,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Duplicate color and size variant found",
          },
          { status: 400 },
        );
      }

      combinationSet.add(
        combination,
      );

      const stock =
        requiredNumber(
          variant.stock ?? 0,
        );

      if (
        stock === null ||
        !Number.isInteger(stock)
      ) {
        return NextResponse.json(
          {
            error:
              "Variant stock must be a valid whole number",
          },
          { status: 400 },
        );
      }
    }

    const updatedProduct =
      await prisma.$transaction(
        async (tx) => {
          await tx.product.update({
            where: { id },

            data: {
              name,

              gender,

              description:
                body.description !==
                undefined
                  ? String(
                      body.description ??
                        "",
                    ).trim() || null
                  : existingProduct.description,

              fabric:
                body.fabric !==
                undefined
                  ? String(
                      body.fabric ??
                        "",
                    ).trim() || null
                  : existingProduct.fabric,

              retailPrice,

              resellerPrice,

              mrp,

              resellerMOQ:
                resellerMOQ ===
                null
                  ? null
                  : Math.floor(
                      Number(
                        resellerMOQ,
                      ),
                    ),

              salesMode,

              status,

              isFeatured:
                body.isFeatured !==
                undefined
                  ? Boolean(
                      body.isFeatured,
                    )
                  : existingProduct.isFeatured,

              isTrending:
                body.isTrending !==
                undefined
                  ? Boolean(
                      body.isTrending,
                    )
                  : existingProduct.isTrending,

              isNewArrival:
                body.isNewArrival !==
                undefined
                  ? Boolean(
                      body.isNewArrival,
                    )
                  : existingProduct.isNewArrival,

              categoryId,
            },
          });

          /*
           * If variants were supplied,
           * replace the existing variant matrix.
           */
          if (
            Array.isArray(
              body.variants,
            )
          ) {
            await tx.productVariant.deleteMany(
              {
                where: {
                  productId: id,
                },
              },
            );

            if (variants.length > 0) {
              const colorIds = [
                ...new Set(
                  variants.map(
                    (variant) =>
                      variant.colorId,
                  ),
                ),
              ];

              const sizeIds = [
                ...new Set(
                  variants.map(
                    (variant) =>
                      variant.sizeId,
                  ),
                ),
              ];

              const colors =
                await tx.color.findMany({
                  where: {
                    id: {
                      in: colorIds,
                    },
                  },
                  select: {
                    id: true,
                    name: true,
                  },
                });

              const sizes =
                await tx.size.findMany({
                  where: {
                    id: {
                      in: sizeIds,
                    },
                  },
                  select: {
                    id: true,
                    name: true,
                  },
                });

              const colorMap =
                new Map(
                  colors.map(
                    (color) => [
                      color.id,
                      color.name,
                    ],
                  ),
                );

              const sizeMap =
                new Map(
                  sizes.map(
                    (size) => [
                      size.id,
                      size.name,
                    ],
                  ),
                );

              const variantData =
                variants.map(
                  (variant) => {
                    const colorName =
                      colorMap.get(
                        variant.colorId,
                      );

                    const sizeName =
                      sizeMap.get(
                        variant.sizeId,
                      );

                    if (
                      !colorName ||
                      !sizeName
                    ) {
                      throw new Error(
                        `Invalid variant color/size: ${variant.colorId}/${variant.sizeId}`,
                      );
                    }

                    const generatedSku =
                      `${existingProduct.sku}-${getColorSkuCode(
                        colorName,
                      )}-${getSizeSkuCode(
                        sizeName,
                      )}`;

                    return {
                      productId: id,

                      colorId:
                        variant.colorId,

                      sizeId:
                        variant.sizeId,

                      sku:
                        variant.sku ??
                        generatedSku,

                      stock: Math.floor(
                        Number(
                          variant.stock ??
                            0,
                        ),
                      ),

                      reservedStock: 0,

                      costPrice:
                        optionalNumber(
                          variant.costPrice,
                        ),

                      retailPrice:
                        optionalNumber(
                          variant.retailPrice,
                        ),

                      resellerPrice:
                        optionalNumber(
                          variant.resellerPrice,
                        ),

                      isActive:
                        variant.isActive !==
                        false,
                    };
                  },
                );

              await tx.productVariant.createMany(
                {
                  data: variantData,
                },
              );
            }
          }

          return tx.product.findUnique(
            {
              where: { id },

              include: {
                category: true,

                variants: {
                  include: {
                    color: true,
                    size: true,
                  },
                  orderBy: {
                    createdAt: "asc",
                  },
                },

                media: {
                  where: {
                    isActive: true,
                  },
                  orderBy: {
                    sortOrder:
                      "asc",
                  },
                },

                _count: {
                  select: {
                    variants: true,
                    media: true,
                  },
                },
              },
            },
          );
        },
      );

    return NextResponse.json(
      updatedProduct,
    );
  } catch (error) {
    console.error(
      "PUT /api/products/[id] failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update product",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/products/[id]
 */
export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } =
      await context.params;

    const product =
      await prisma.product.findUnique({
        where: { id },
      });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message:
        "Product deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE /api/products/[id] failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete product",
      },
      { status: 500 },
    );
  }
}

import { requireAdmin } from "@/lib/admin-auth";
import { getSalesAccess } from "@/lib/sales-access";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicProductMedia } from "@/lib/product-media-color";

const PRODUCT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "OUT_OF_STOCK",
] as const;

const VALID_GENDERS = [
  "WOMEN",
  "MEN",
  "KIDS",
  "UNISEX",
] as const;

const VALID_SALES_MODES = [
  "RETAIL",
  "BULK",
  "BOTH",
] as const;

function hasValue(value: unknown) {
  return !(
    value === undefined ||
    value === null ||
    value === ""
  );
}

function optionalNumber(value: unknown) {
  if (!hasValue(value)) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? number
    : null;
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

  return known[normalized] ?? getSkuToken(normalized, "COL");
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

  return known[normalized] ?? getSkuToken(normalized, "SZ");
}

function publicVariant(
  variant: Record<string, any>,
  canSeeResellerPricing: boolean,
) {
  return {
    id: variant.id,
    productId: variant.productId,
    colorId: variant.colorId,
    sizeId: variant.sizeId,
    sku: variant.sku,
    stock: variant.stock,
    retailPrice: variant.retailPrice,
    resellerPrice: canSeeResellerPricing
      ? variant.resellerPrice
      : null,
    isActive: variant.isActive,
    color: variant.color,
    size: variant.size,
  };
}

async function uniqueVariantSku(
  tx: any,
  productSku: string,
  colorName: string,
  sizeName: string,
) {
  const baseSku = `${productSku}-${getColorSkuCode(
    colorName,
  )}-${getSizeSkuCode(sizeName)}`;

  let sku = baseSku;
  let suffix = 2;

  while (
    await tx.productVariant.findUnique({
      where: { sku },
      select: { id: true },
    })
  ) {
    sku = `${baseSku}-${suffix}`;
    suffix += 1;
  }

  return sku;
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const access = await getSalesAccess();
    const { id } = await context.params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        ...(access.isAdmin
          ? {}
          : {
              status: "ACTIVE",
            }),
      },
      include: {
        category: true,
        variants: {
          where: access.isAdmin
            ? undefined
            : {
                isActive: true,
              },
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

    if (access.isAdmin) {
      return NextResponse.json({
        ...product,
        media:
          product.media.map(
            publicProductMedia,
          ),
      });
    }

    const canSeeResellerPricing =
      access.isReseller && access.resellerOpen;

    return NextResponse.json({
      ...product,
      resellerPrice: canSeeResellerPricing
        ? product.resellerPrice
        : null,
      resellerMOQ: canSeeResellerPricing
        ? product.resellerMOQ
        : null,
      variants: product.variants.map((variant) =>
        publicVariant(
          variant as unknown as Record<string, any>,
          canSeeResellerPricing,
        ),
      ),
      media:
        product.media.map(
          publicProductMedia,
        ),
    });
  } catch (error) {
    console.error("GET /api/products/[id] failed:", error);

    return NextResponse.json(
      { error: "Failed to load product" },
      { status: 500 },
    );
  }
}

type VariantInput = {
  id?: string;
  colorId: string;
  sizeId: string;
  stock?: number | string | null;
  costPrice?: number | string | null;
  retailPrice?: number | string | null;
  resellerPrice?: number | string | null;
  isActive?: boolean;
};

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            _count: {
              select: {
                cartItems: true,
                orderItems: true,
                inventoryAdjustments: true,
                purchaseOrderItems: true,
                supplierCosts: true,
              },
            },
          },
        },
      },
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

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const retailPrice = requiredNumber(
      body.retailPrice ?? existingProduct.retailPrice,
    );

    if (retailPrice === null) {
      return NextResponse.json(
        { error: "Valid retail price is required" },
        { status: 400 },
      );
    }

    const resellerPrice =
      body.resellerPrice === undefined
        ? existingProduct.resellerPrice === null
          ? null
          : Number(existingProduct.resellerPrice)
        : optionalNumber(body.resellerPrice);

    const mrp =
      body.mrp === undefined
        ? existingProduct.mrp === null
          ? null
          : Number(existingProduct.mrp)
        : optionalNumber(body.mrp);

    const resellerMOQ =
      body.resellerMOQ === undefined
        ? existingProduct.resellerMOQ
        : optionalNumber(body.resellerMOQ);

    if (hasValue(body.resellerPrice) && resellerPrice === null) {
      return NextResponse.json(
        { error: "Invalid reseller price" },
        { status: 400 },
      );
    }

    if (hasValue(body.mrp) && mrp === null) {
      return NextResponse.json(
        { error: "Invalid MRP" },
        { status: 400 },
      );
    }

    if (
      hasValue(body.resellerMOQ) &&
      (resellerMOQ === null || !Number.isInteger(resellerMOQ))
    ) {
      return NextResponse.json(
        { error: "Reseller MOQ must be a valid whole number" },
        { status: 400 },
      );
    }

    const status = body.status ?? existingProduct.status;
    const gender = body.gender ?? existingProduct.gender;
    const salesMode = body.salesMode ?? existingProduct.salesMode;

    if (!PRODUCT_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Invalid product status" },
        { status: 400 },
      );
    }

    if (!VALID_GENDERS.includes(gender)) {
      return NextResponse.json(
        { error: "Invalid product gender" },
        { status: 400 },
      );
    }

    if (!VALID_SALES_MODES.includes(salesMode)) {
      return NextResponse.json(
        { error: "Invalid sales mode" },
        { status: 400 },
      );
    }

    const variants: VariantInput[] = Array.isArray(body.variants)
      ? body.variants.map((variant: unknown) => {
          const item = variant as Record<string, unknown>;

          return {
            id: item.id ? String(item.id) : undefined,
            colorId: String(item.colorId ?? "").trim(),
            sizeId: String(item.sizeId ?? "").trim(),
            stock: item.stock as number | string | null | undefined,
            costPrice:
              item.costPrice as number | string | null | undefined,
            retailPrice:
              item.retailPrice as number | string | null | undefined,
            resellerPrice:
              item.resellerPrice as number | string | null | undefined,
            isActive:
              item.isActive === undefined
                ? true
                : Boolean(item.isActive),
          };
        })
      : [];

    const combinationSet = new Set<string>();
    const incomingIds = new Set<string>();

    for (const variant of variants) {
      if (!variant.colorId || !variant.sizeId) {
        return NextResponse.json(
          { error: "Every variant must have color and size" },
          { status: 400 },
        );
      }

      const combination = `${variant.colorId}:${variant.sizeId}`;

      if (combinationSet.has(combination)) {
        return NextResponse.json(
          { error: "Duplicate color and size variant found" },
          { status: 400 },
        );
      }

      combinationSet.add(combination);

      if (variant.id) {
        if (incomingIds.has(variant.id)) {
          return NextResponse.json(
            { error: "Duplicate variant ID found" },
            { status: 400 },
          );
        }

        incomingIds.add(variant.id);
      }

      const stock = requiredNumber(variant.stock ?? 0);

      if (stock === null || !Number.isInteger(stock)) {
        return NextResponse.json(
          { error: "Variant stock must be a valid whole number" },
          { status: 400 },
        );
      }

      const costPrice = optionalNumber(variant.costPrice);
      const variantRetailPrice = optionalNumber(variant.retailPrice);
      const variantResellerPrice = optionalNumber(
        variant.resellerPrice,
      );

      if (hasValue(variant.costPrice) && costPrice === null) {
        return NextResponse.json(
          { error: "Invalid variant cost price" },
          { status: 400 },
        );
      }

      if (
        hasValue(variant.retailPrice) &&
        variantRetailPrice === null
      ) {
        return NextResponse.json(
          { error: "Invalid variant retail price" },
          { status: 400 },
        );
      }

      if (
        hasValue(variant.resellerPrice) &&
        variantResellerPrice === null
      ) {
        return NextResponse.json(
          { error: "Invalid variant reseller price" },
          { status: 400 },
        );
      }
    }

    const colorIds = [
      ...new Set(variants.map((variant) => variant.colorId)),
    ];
    const sizeIds = [
      ...new Set(variants.map((variant) => variant.sizeId)),
    ];

    const [colors, sizes] = await Promise.all([
      colorIds.length
        ? prisma.color.findMany({
            where: { id: { in: colorIds } },
            select: { id: true, name: true },
          })
        : [],
      sizeIds.length
        ? prisma.size.findMany({
            where: { id: { in: sizeIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const colorMap = new Map(
      colors.map((color) => [color.id, color.name]),
    );
    const sizeMap = new Map(
      sizes.map((size) => [size.id, size.name]),
    );

    for (const variant of variants) {
      if (!colorMap.has(variant.colorId)) {
        return NextResponse.json(
          { error: `Invalid color: ${variant.colorId}` },
          { status: 400 },
        );
      }

      if (!sizeMap.has(variant.sizeId)) {
        return NextResponse.json(
          { error: `Invalid size: ${variant.sizeId}` },
          { status: 400 },
        );
      }
    }

    const currentById = new Map(
      existingProduct.variants.map((variant) => [variant.id, variant]),
    );
    const currentByCombination = new Map(
      existingProduct.variants.map((variant) => [
        `${variant.colorId}:${variant.sizeId}`,
        variant,
      ]),
    );

    for (const variant of variants) {
      if (variant.id && !currentById.has(variant.id)) {
        return NextResponse.json(
          { error: "Variant does not belong to this product" },
          { status: 400 },
        );
      }
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name,
          gender,
          description:
            body.description !== undefined
              ? String(body.description ?? "").trim() || null
              : existingProduct.description,
          fabric:
            body.fabric !== undefined
              ? String(body.fabric ?? "").trim() || null
              : existingProduct.fabric,
          retailPrice,
          resellerPrice,
          mrp,
          resellerMOQ,
          smartStockBalance:
            body.smartStockBalance !== undefined
              ? Boolean(body.smartStockBalance)
              : existingProduct.smartStockBalance,
          salesMode,
          status,
          isFeatured:
            body.isFeatured !== undefined
              ? Boolean(body.isFeatured)
              : existingProduct.isFeatured,
          isTrending:
            body.isTrending !== undefined
              ? Boolean(body.isTrending)
              : existingProduct.isTrending,
          isNewArrival:
            body.isNewArrival !== undefined
              ? Boolean(body.isNewArrival)
              : existingProduct.isNewArrival,
          categoryId,
        },
      });

      if (Array.isArray(body.variants)) {
        const representedExistingIds = new Set<string>();

        for (const variant of variants) {
          const matched = variant.id
            ? currentById.get(variant.id)
            : currentByCombination.get(
                `${variant.colorId}:${variant.sizeId}`,
              );

          const data = {
            colorId: variant.colorId,
            sizeId: variant.sizeId,
            stock: Math.floor(Number(variant.stock ?? 0)),
            costPrice: optionalNumber(variant.costPrice),
            retailPrice: optionalNumber(variant.retailPrice),
            resellerPrice: optionalNumber(variant.resellerPrice),
            isActive: variant.isActive !== false,
          };

          if (matched) {
            representedExistingIds.add(matched.id);

            await tx.productVariant.update({
              where: { id: matched.id },
              data,
            });

            continue;
          }

          const colorName = colorMap.get(variant.colorId);
          const sizeName = sizeMap.get(variant.sizeId);

          if (!colorName || !sizeName || !existingProduct.sku) {
            throw new Error(
              "Unable to generate SKU for the new variant.",
            );
          }

          await tx.productVariant.create({
            data: {
              productId: id,
              ...data,
              reservedStock: 0,
              sku: await uniqueVariantSku(
                tx,
                existingProduct.sku,
                colorName,
                sizeName,
              ),
            },
          });
        }

        const missingVariants =
          existingProduct.variants.filter(
            (variant) =>
              !representedExistingIds.has(
                variant.id,
              ),
          );

        const protectedIds =
          missingVariants
            .filter(
              (variant) => {
                const referenceCount =
                  variant._count.cartItems +
                  variant._count.orderItems +
                  variant._count.inventoryAdjustments +
                  variant._count.purchaseOrderItems +
                  variant._count.supplierCosts;

                return (
                  referenceCount >
                    0 ||
                  Boolean(
                    variant.preferredSupplierId,
                  )
                );
              },
            )
            .map(
              (variant) =>
                variant.id,
            );

        const removableIds =
          missingVariants
            .filter(
              (variant) =>
                !protectedIds.includes(
                  variant.id,
                ),
            )
            .map(
              (variant) =>
                variant.id,
            );

        if (
          protectedIds.length >
          0
        ) {
          await tx.productVariant.updateMany({
            where: {
              id: {
                in:
                  protectedIds,
              },
              productId: id,
            },
            data: {
              isActive:
                false,
            },
          });
        }

        if (
          removableIds.length >
          0
        ) {
          await tx.productVariant.deleteMany({
            where: {
              id: {
                in:
                  removableIds,
              },
              productId: id,
            },
          });
        }
      }

      return tx.product.findUnique({
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
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("PUT /api/products/[id] failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update product";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    const archivedProduct =
      await prisma.product.update({
        where: { id },
        data: {
          status: "INACTIVE",
          isFeatured: false,
          isTrending: false,
          isNewArrival: false,
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Product archived successfully",
      product: archivedProduct,
    });
  } catch (error) {
    console.error("DELETE /api/products/[id] failed:", error);

    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}

import { requireAdmin } from "@/lib/admin-auth";
import { getSalesAccess } from "@/lib/sales-access";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicProductMedia } from "@/lib/product-media-color";
import { ensureProductSoftDeleteStorage } from "@/lib/product-soft-delete-storage";
import {
  ensureProductKidsSizeMeasurementStorage,
  getProductKidsSizeMeasurements,
} from "@/lib/product-kids-size-measurements";
import {
  buildProductSku,
  buildVariantSku,
  getMainSkuCode,
  normalizeProductTypeCode,
  formatDesignNumber,
} from "@/lib/sku-system";

const PRODUCT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "OUT_OF_STOCK",
] as const;

const PRODUCT_SALES_MODES = [
  "RETAIL",
  "BULK",
  "BOTH",
] as const;

const PRODUCT_GENDERS = [
  "WOMEN",
  "MEN",
  "KIDS",
  "UNISEX",
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

export async function GET() {
  try {
    await ensureProductSoftDeleteStorage();

    const access = await getSalesAccess();

    const products = await prisma.product.findMany({
      where: access.isAdmin
        ? {
            deletedAt: null,
          }
        : {
            status: "ACTIVE",
            deletedAt: null,
          },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
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

    if (access.isAdmin) {
      return NextResponse.json(
        products.map(
          (product) => ({
            ...product,
            media:
              product.media.map(
                publicProductMedia,
              ),
          }),
        ),
      );
    }

    const canSeeResellerPricing =
      access.isReseller && access.resellerOpen;

    return NextResponse.json(
      products.map((product) => ({
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
      })),
    );
  } catch (error) {
    console.error("GET /api/products failed:", error);

    return NextResponse.json(
      {
        error: "Failed to load products",
      },
      {
        status: 500,
      },
    );
  }
}

function getGenderSkuCode(gender: string) {
  switch (gender) {
    case "WOMEN":
      return "W";
    case "MEN":
      return "M";
    case "KIDS":
      return "K";
    default:
      return "U";
  }
}

function getSkuToken(value: string, fallback: string) {
  const cleaned = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");

  return cleaned.slice(0, 4) || fallback;
}

async function generateProductSku(
  tx: any,
  gender: string,
) {
  const prefix = `AR-${getGenderSkuCode(gender)}-`;

  const products = await tx.product.findMany({
    where: {
      sku: {
        startsWith: prefix,
      },
    },
    select: {
      sku: true,
    },
  });

  let maxNumber = 0;

  for (const product of products) {
    const match = product.sku?.match(
      new RegExp(`^${prefix}(\\d+)$`),
    );

    if (match) {
      maxNumber = Math.max(
        maxNumber,
        Number(match[1]),
      );
    }
  }

  return `${prefix}${String(maxNumber + 1).padStart(3, "0")}`;
}

async function generateVariantSku(
  tx: any,
  productSku: string,
  colorName: string,
  sizeName: string,
  reservedSkus: Set<string>,
) {
  const sku =
    buildVariantSku(
      productSku,
      colorName,
      sizeName,
    );

  if (!sku) {
    throw new Error(
      "Unable to generate variant SKU.",
    );
  }

  if (
    reservedSkus.has(sku) ||
    (await tx.productVariant.findUnique({
      where: { sku },
      select: { id: true },
    }))
  ) {
    throw new Error(
      `Variant SKU already exists: ${sku}`,
    );
  }

  reservedSkus.add(sku);
  return sku;
}

type ProductKidsSizeMeasurementInput = {
  sizeId: string;
  chestIn?: string | null;
  waistIn?: string | null;
  garmentLengthIn?: string | null;
};

type ProductVariantInput = {
  colorId: string;
  sizeId: string;
  stock?: number | string | null;
  costPrice?: number | string | null;
  retailPrice?: number | string | null;
  resellerPrice?: number | string | null;
  isActive?: boolean;
};

export async function POST(request: Request) {
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    await ensureProductKidsSizeMeasurementStorage();

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const categoryId = String(body.categoryId ?? "").trim();

    const gender = PRODUCT_GENDERS.includes(body.gender)
      ? body.gender
      : "UNISEX";

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
      select: {
        id: true,
        name: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const skuProductTypeCode =
      normalizeProductTypeCode(
        body.skuProductTypeCode,
      );

    const designNumber =
      formatDesignNumber(
        body.designNumber,
      );

    const mainCategoryName =
      category.parent?.name ??
      category.name;

    const mainSkuCode =
      getMainSkuCode(
        mainCategoryName,
      );

    const usesUnifiedSku =
      Boolean(
        skuProductTypeCode ||
        designNumber,
      );

    if (
      usesUnifiedSku &&
      !mainSkuCode
    ) {
      return NextResponse.json(
        {
          error:
            "Select a category under Women, Men, Girl Kids or Boy Kids for AS FASHIONS SKU.",
        },
        { status: 400 },
      );
    }

    if (
      usesUnifiedSku &&
      !skuProductTypeCode
    ) {
      return NextResponse.json(
        {
          error:
            "SKU product type is required.",
        },
        { status: 400 },
      );
    }

    if (
      usesUnifiedSku &&
      !designNumber
    ) {
      return NextResponse.json(
        {
          error:
            "Design number is required.",
        },
        { status: 400 },
      );
    }

    const unifiedProductSku =
      usesUnifiedSku &&
      mainSkuCode
        ? buildProductSku(
            mainSkuCode,
            skuProductTypeCode,
            designNumber,
          )
        : "";

    const retailPrice = requiredNumber(body.retailPrice);

    if (retailPrice === null) {
      return NextResponse.json(
        { error: "Valid retail price is required" },
        { status: 400 },
      );
    }

    const resellerPrice = optionalNumber(body.resellerPrice);
    const mrp = optionalNumber(body.mrp);
    const resellerMOQ = optionalNumber(body.resellerMOQ);

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

    const salesMode = body.salesMode ?? "BOTH";

    if (!PRODUCT_SALES_MODES.includes(salesMode)) {
      return NextResponse.json(
        { error: "Invalid sales mode" },
        { status: 400 },
      );
    }

    const status = body.status ?? "DRAFT";

    if (!PRODUCT_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Invalid product status" },
        { status: 400 },
      );
    }

    const variants: ProductVariantInput[] = Array.isArray(body.variants)
      ? body.variants.map((variant: unknown) => {
          const item = variant as Record<string, unknown>;

          return {
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

    const kidsSizeMeasurements:
      ProductKidsSizeMeasurementInput[] =
      Array.isArray(
        body.kidsSizeMeasurements,
      )
        ? body.kidsSizeMeasurements.map(
            (
              measurement: unknown,
            ) => {
              const item =
                measurement as Record<
                  string,
                  unknown
                >;

              return {
                sizeId: String(
                  item.sizeId ?? "",
                ).trim(),
                chestIn:
                  item.chestIn == null
                    ? null
                    : String(
                        item.chestIn,
                      ).trim(),
                waistIn:
                  item.waistIn == null
                    ? null
                    : String(
                        item.waistIn,
                      ).trim(),
                garmentLengthIn:
                  item.garmentLengthIn ==
                  null
                    ? null
                    : String(
                        item.garmentLengthIn,
                      ).trim(),
              };
            },
          )
        : [];

    const measurementSizeIds =
      new Set<string>();

    for (
      const measurement of
      kidsSizeMeasurements
    ) {
      if (!measurement.sizeId) {
        return NextResponse.json(
          {
            error:
              "Every kids measurement row must have a sizeId",
          },
          { status: 400 },
        );
      }

      if (
        measurementSizeIds.has(
          measurement.sizeId,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Duplicate kids size measurement found",
          },
          { status: 400 },
        );
      }

      measurementSizeIds.add(
        measurement.sizeId,
      );
    }

    const combinationSet = new Set<string>();

    for (const variant of variants) {
      if (!variant.colorId || !variant.sizeId) {
        return NextResponse.json(
          {
            error: "Every variant must have both colorId and sizeId",
          },
          { status: 400 },
        );
      }

      const combination = `${variant.colorId}:${variant.sizeId}`;

      if (combinationSet.has(combination)) {
        return NextResponse.json(
          {
            error: "Duplicate color and size variant found",
          },
          { status: 400 },
        );
      }

      combinationSet.add(combination);

      const stock = requiredNumber(variant.stock ?? 0);

      if (stock === null || !Number.isInteger(stock)) {
        return NextResponse.json(
          {
            error: "Variant stock must be a valid whole number",
          },
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
      ...new Set([
        ...variants.map(
          (variant) =>
            variant.sizeId,
        ),
        ...kidsSizeMeasurements.map(
          (measurement) =>
            measurement.sizeId,
        ),
      ]),
    ];

    const [colors, sizes] = await Promise.all([
      colorIds.length
        ? prisma.color.findMany({
            where: {
              id: { in: colorIds },
              isActive: true,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : [],
      sizeIds.length
        ? prisma.size.findMany({
            where: {
              id: { in: sizeIds },
              isActive: true,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : [],
    ]);

    const colorMap = new Map(
      colors.map((color) => [color.id, color.name]),
    );
    const sizeMap = new Map(
      sizes.map((size) => [size.id, size.name]),
    );

    for (
      const measurement of
      kidsSizeMeasurements
    ) {
      if (
        !sizeMap.has(
          measurement.sizeId,
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Invalid or inactive kids measurement size: ${measurement.sizeId}`,
          },
          { status: 400 },
        );
      }
    }

    for (const variant of variants) {
      if (!colorMap.has(variant.colorId)) {
        return NextResponse.json(
          {
            error: `Invalid or inactive color: ${variant.colorId}`,
          },
          { status: 400 },
        );
      }

      if (!sizeMap.has(variant.sizeId)) {
        return NextResponse.json(
          {
            error: `Invalid or inactive size: ${variant.sizeId}`,
          },
          { status: 400 },
        );
      }
    }

    const slugBase =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "product";

    const slug = `${slugBase}-${Date.now()}`;

    const product = await prisma.$transaction(async (tx) => {
      const requestedSku =
        unifiedProductSku ||
        String(
          body.sku ?? "",
        )
          .trim()
          .toUpperCase();

      if (requestedSku) {
        const skuOwner = await tx.product.findUnique({
          where: { sku: requestedSku },
          select: { id: true },
        });

        if (skuOwner) {
          throw new Error("Product SKU already exists.");
        }
      }

      const createdProduct = await tx.product.create({
        data: {
          name,
          slug,
          gender,
          sku:
            requestedSku ||
            (await generateProductSku(tx, gender)),
          description: body.description
            ? String(body.description).trim()
            : null,
          fabric: body.fabric
            ? String(body.fabric).trim()
            : null,
          retailPrice,
          resellerPrice,
          mrp,
          resellerMOQ,
          smartStockBalance: Boolean(body.smartStockBalance),
          salesMode,
          status,
          isFeatured: Boolean(body.isFeatured),
          isTrending: Boolean(body.isTrending),
          isNewArrival: Boolean(body.isNewArrival),
          categoryId,
        },
      });

      if (variants.length > 0) {
        const reservedSkus = new Set<string>();
        const variantRows = [];

        for (const variant of variants) {
          const colorName = colorMap.get(variant.colorId);
          const sizeName = sizeMap.get(variant.sizeId);

          if (!colorName || !sizeName || !createdProduct.sku) {
            throw new Error(
              "Unable to resolve variant color, size or product SKU.",
            );
          }

          variantRows.push({
            productId: createdProduct.id,
            colorId: variant.colorId,
            sizeId: variant.sizeId,
            sku: await generateVariantSku(
              tx,
              createdProduct.sku,
              colorName,
              sizeName,
              reservedSkus,
            ),
            stock: Math.floor(Number(variant.stock ?? 0)),
            reservedStock: 0,
            costPrice: optionalNumber(variant.costPrice),
            retailPrice: optionalNumber(variant.retailPrice),
            resellerPrice: optionalNumber(variant.resellerPrice),
            isActive: variant.isActive !== false,
          });
        }

        await tx.productVariant.createMany({
          data: variantRows,
        });
      }

      if (
        kidsSizeMeasurements.length >
        0
      ) {
        for (
          const measurement of
          kidsSizeMeasurements
        ) {
          const hasAnyValue =
            Boolean(
              measurement.chestIn ||
                measurement.waistIn ||
                measurement.garmentLengthIn,
            );

          if (!hasAnyValue) {
            continue;
          }

          await tx.$executeRawUnsafe(
            `
              INSERT INTO "ProductKidsSizeMeasurement"
                (
                  "productId",
                  "sizeId",
                  "chestIn",
                  "waistIn",
                  "garmentLengthIn",
                  "updatedAt"
                )
              VALUES
                ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
              ON CONFLICT ("productId", "sizeId")
              DO UPDATE SET
                "chestIn" = EXCLUDED."chestIn",
                "waistIn" = EXCLUDED."waistIn",
                "garmentLengthIn" = EXCLUDED."garmentLengthIn",
                "updatedAt" = CURRENT_TIMESTAMP
            `,
            createdProduct.id,
            measurement.sizeId,
            measurement.chestIn ||
              null,
            measurement.waistIn ||
              null,
            measurement.garmentLengthIn ||
              null,
          );
        }
      }

      return tx.product.findUnique({
        where: {
          id: createdProduct.id,
        },
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
          _count: {
            select: {
              variants: true,
              media: true,
            },
          },
        },
      });
    });

    const savedKidsSizeMeasurements =
      product?.id
        ? await getProductKidsSizeMeasurements(
            product.id,
          )
        : [];

    return NextResponse.json(
      product
        ? {
            ...product,
            kidsSizeMeasurements:
              savedKidsSizeMeasurements,
          }
        : product,
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/products failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create product";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message ===
            "Product SKU already exists." ||
          message.startsWith(
            "Variant SKU already exists:",
          )
            ? 409
            : 500,
      },
    );
  }
}

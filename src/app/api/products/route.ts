import { requireAdmin } from "@/lib/admin-auth";
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

  return Number.isFinite(number) && number >= 0 ? number : null;
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
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

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products failed:", error);

    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 },
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

export async function POST(request: Request) {
  /* ADMIN_GUARD_POST */
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const categoryId = String(body.categoryId ?? "").trim();

    const gender =
      body.gender === "WOMEN" ||
      body.gender === "MEN" ||
      body.gender === "KIDS" ||
      body.gender === "UNISEX"
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
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

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

    if (
      body.resellerPrice !== undefined &&
      body.resellerPrice !== null &&
      body.resellerPrice !== "" &&
      resellerPrice === null
    ) {
      return NextResponse.json(
        { error: "Invalid reseller price" },
        { status: 400 },
      );
    }

    if (
      body.mrp !== undefined &&
      body.mrp !== null &&
      body.mrp !== "" &&
      mrp === null
    ) {
      return NextResponse.json(
        { error: "Invalid MRP" },
        { status: 400 },
      );
    }

    if (
      body.resellerMOQ !== undefined &&
      body.resellerMOQ !== null &&
      body.resellerMOQ !== "" &&
      resellerMOQ === null
    ) {
      return NextResponse.json(
        { error: "Invalid reseller MOQ" },
        { status: 400 },
      );
    }

    const salesMode = body.salesMode ?? "BOTH";

    const PRODUCT_SALES_MODES = [
      "RETAIL",
      "BULK",
      "BOTH",
    ] as const;

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

    /*
     * Variants format expected from Admin UI:
     *
     * variants: [
     *   {
     *     colorId: "...",
     *     sizeId: "...",
     *     sku: "...",
     *     stock: 10,
     *     costPrice: 250,
     *     retailPrice: 599,
     *     resellerPrice: 300,
     *     isActive: true
     *   }
     * ]
     */

    type ProductVariantInput = {
      colorId: string;
      sizeId: string;
      sku?: string | null;
      stock?: number | string | null;
      costPrice?: number | string | null;
      retailPrice?: number | string | null;
      resellerPrice?: number | string | null;
      isActive?: boolean;
    };

    const variants: ProductVariantInput[] = Array.isArray(body.variants)
      ? body.variants.map((variant: unknown) => {
          const item = variant as Record<string, unknown>;

          return {
            colorId: String(item.colorId ?? "").trim(),
            sizeId: String(item.sizeId ?? "").trim(),
            sku:
              item.sku === undefined ||
              item.sku === null ||
              item.sku === ""
                ? null
                : String(item.sku).trim(),
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

    /*
     * Validate duplicate Color + Size combinations
     */
    const combinationSet = new Set<string>();

    for (const variant of variants) {
      const colorId = String(variant?.colorId ?? "").trim();
      const sizeId = String(variant?.sizeId ?? "").trim();

      if (!colorId || !sizeId) {
        return NextResponse.json(
          {
            error:
              "Every variant must have both colorId and sizeId",
          },
          { status: 400 },
        );
      }

      const combination = `${colorId}:${sizeId}`;

      if (combinationSet.has(combination)) {
        return NextResponse.json(
          {
            error:
              "Duplicate color and size variant found",
          },
          { status: 400 },
        );
      }

      combinationSet.add(combination);
    }

    /*
     * Validate all colors and sizes before creating anything.
     */
    if (variants.length > 0) {
      const colorIds: string[] = [
        ...new Set(
          variants.map((variant) =>
            String(variant.colorId ?? "").trim(),
          ),
        ),
      ];

      const sizeIds: string[] = [
        ...new Set(
          variants.map((variant) =>
            String(variant.sizeId ?? "").trim(),
          ),
        ),
      ];

      const [colors, sizes] = await Promise.all([
        prisma.color.findMany({
          where: {
            id: {
              in: colorIds,
            },
            isActive: true,
          },
          select: {
            id: true,
          },
        }),
        prisma.size.findMany({
          where: {
            id: {
              in: sizeIds,
            },
            isActive: true,
          },
          select: {
            id: true,
          },
        }),
      ]);

      const validColorIds = new Set(colors.map((color) => color.id));
      const validSizeIds = new Set(sizes.map((size) => size.id));

      for (const variant of variants) {
        const colorId = String(variant.colorId).trim();
        const sizeId = String(variant.sizeId).trim();

        if (!validColorIds.has(colorId)) {
          return NextResponse.json(
            {
              error: `Invalid or inactive color: ${colorId}`,
            },
            { status: 400 },
          );
        }

        if (!validSizeIds.has(sizeId)) {
          return NextResponse.json(
            {
              error: `Invalid or inactive size: ${sizeId}`,
            },
            { status: 400 },
          );
        }

        const stock = requiredNumber(variant.stock ?? 0);

        if (stock === null || !Number.isInteger(stock)) {
          return NextResponse.json(
            {
              error:
                "Variant stock must be a valid whole number",
            },
            { status: 400 },
          );
        }

        const costPrice = optionalNumber(variant.costPrice);
        const variantRetailPrice = optionalNumber(
          variant.retailPrice,
        );
        const variantResellerPrice = optionalNumber(
          variant.resellerPrice,
        );

        if (
          variant.costPrice !== undefined &&
          variant.costPrice !== null &&
          variant.costPrice !== "" &&
          costPrice === null
        ) {
          return NextResponse.json(
            { error: "Invalid variant cost price" },
            { status: 400 },
          );
        }

        if (
          variant.retailPrice !== undefined &&
          variant.retailPrice !== null &&
          variant.retailPrice !== "" &&
          variantRetailPrice === null
        ) {
          return NextResponse.json(
            { error: "Invalid variant retail price" },
            { status: 400 },
          );
        }

        if (
          variant.resellerPrice !== undefined &&
          variant.resellerPrice !== null &&
          variant.resellerPrice !== "" &&
          variantResellerPrice === null
        ) {
          return NextResponse.json(
            { error: "Invalid variant reseller price" },
            { status: 400 },
          );
        }
      }
    }

    const slugBase =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "product";

    const slug = `${slugBase}-${Date.now()}`;

    /*
     * Create Product + ProductVariants atomically.
     *
     * If any variant fails, the complete product creation
     * is rolled back.
     */
    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name,
          slug,
          gender,

          sku:
            body.sku && String(body.sku).trim()
              ? String(body.sku).trim()
              : await generateProductSku(
                  tx,
                  gender,
                ),

          description: body.description
            ? String(body.description).trim()
            : null,

          fabric: body.fabric
            ? String(body.fabric).trim()
            : null,

          retailPrice,

          resellerPrice,

          mrp,

          resellerMOQ:
            resellerMOQ === null
              ? null
              : Math.floor(resellerMOQ),

          salesMode,

          status,

          isFeatured: Boolean(body.isFeatured),
          isTrending: Boolean(body.isTrending),
          isNewArrival: Boolean(body.isNewArrival),

          categoryId,
        },
      });

      if (variants.length > 0) {
        const variantRows = variants.map((variant) => {
          const colorId = String(
            variant.colorId,
          ).trim();

          const sizeId = String(
            variant.sizeId,
          ).trim();

          return {
            productId: createdProduct.id,

            colorId,

            sizeId,

            sku: null as string | null,

            stock: Math.floor(
              Number(variant.stock ?? 0),
            ),

            reservedStock: 0,

            costPrice: optionalNumber(
              variant.costPrice,
            ),

            retailPrice: optionalNumber(
              variant.retailPrice,
            ),

            resellerPrice: optionalNumber(
              variant.resellerPrice,
            ),

            isActive:
              variant.isActive !== false,
          };
        });

        const variantReferences = await Promise.all(
          variantRows.map(async (row) => {
            const [color, size] = await Promise.all([
              tx.color.findUnique({
                where: {
                  id: row.colorId,
                },
                select: {
                  name: true,
                },
              }),

              tx.size.findUnique({
                where: {
                  id: row.sizeId,
                },
                select: {
                  name: true,
                },
              }),
            ]);

            if (!color || !size) {
              throw new Error(
                "Unable to resolve variant color or size",
              );
            }

            return {
              row,
              colorCode: getColorSkuCode(
                color.name,
              ),
              sizeCode: getSizeSkuCode(
                size.name,
              ),
            };
          }),
        );

        const generatedSkus = new Set<string>();

        for (const item of variantReferences) {
          const baseSku =
            `${createdProduct.sku}-${item.colorCode}-${item.sizeCode}`;

          let sku = baseSku;
          let suffix = 2;

          while (
            generatedSkus.has(sku) ||
            (await tx.productVariant.findUnique({
              where: {
                sku,
              },
              select: {
                id: true,
              },
            }))
          ) {
            sku = `${baseSku}-${suffix}`;
            suffix += 1;
          }

          generatedSkus.add(sku);
          item.row.sku = sku;
        }

        await tx.productVariant.createMany({
          data: variantReferences.map(
            ({ row }) => row,
          ),
        });
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

    return NextResponse.json(
      product,
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/products failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to create product",
      },
      { status: 500 },
    );
  }
}

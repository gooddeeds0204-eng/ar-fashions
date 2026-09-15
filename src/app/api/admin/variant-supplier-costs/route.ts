import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
} from "@/lib/admin-auth";
import {
  requireSameOriginJson,
} from "@/lib/public-write-security";

function cleanString(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

function validCost(
  value: unknown,
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return Math.round(
    number * 100,
  ) / 100;
}

export async function GET(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const url =
      new URL(
        request.url,
      );

    const variantId =
      cleanString(
        url.searchParams.get(
          "variantId",
        ),
      );

    if (!variantId) {
      return NextResponse.json(
        {
          error:
            "Variant ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const variant =
      await prisma.productVariant.findUnique({
        where: {
          id:
            variantId,
        },

        select: {
          id: true,
          sku: true,
          costPrice: true,
          preferredSupplierId:
            true,

          product: {
            select: {
              name:
                true,
            },
          },

          color: {
            select: {
              name:
                true,
            },
          },

          size: {
            select: {
              name:
                true,
            },
          },

          preferredSupplier: {
            select: {
              id: true,
              name: true,
              isActive:
                true,
            },
          },

          supplierCosts: {
            orderBy: [
              {
                isActive:
                  "desc",
              },
              {
                updatedAt:
                  "desc",
              },
            ],

            select: {
              id: true,
              supplierId:
                true,
              supplierCost:
                true,
              lastPurchaseCost:
                true,
              lastPurchasedAt:
                true,
              isActive:
                true,
              createdAt:
                true,
              updatedAt:
                true,

              supplier: {
                select: {
                  id: true,
                  name: true,
                  isActive:
                    true,
                },
              },
            },
          },
        },
      });

    if (!variant) {
      return NextResponse.json(
        {
          error:
            "Variant not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,

      variant: {
        id:
          variant.id,

        sku:
          variant.sku,

        productName:
          variant.product.name,

        colorName:
          variant.color.name,

        sizeName:
          variant.size.name,

        fallbackCost:
          variant.costPrice ===
          null
            ? null
            : Number(
                variant.costPrice,
              ),

        preferredSupplierId:
          variant.preferredSupplierId,

        preferredSupplier:
          variant.preferredSupplier,

        supplierCosts:
          variant.supplierCosts.map(
            (item) => ({
              ...item,

              supplierCost:
                Number(
                  item.supplierCost,
                ),

              lastPurchaseCost:
                item.lastPurchaseCost ===
                null
                  ? null
                  : Number(
                      item.lastPurchaseCost,
                    ),
            }),
          ),
      },
    });
  } catch (error) {
    console.error(
      "GET /api/admin/variant-supplier-costs failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load supplier costing.",
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

  const requestGuard =
    requireSameOriginJson(
      request,
    );

  if (requestGuard) {
    return requestGuard;
  }

  try {
    const body =
      await request.json();

    const action =
      cleanString(
        body.action,
      ).toUpperCase();

    const variantId =
      cleanString(
        body.variantId,
      );

    const supplierId =
      cleanString(
        body.supplierId,
      );

    if (
      !variantId ||
      !supplierId
    ) {
      return NextResponse.json(
        {
          error:
            "Variant and supplier are required.",
        },
        {
          status: 400,
        },
      );
    }

    const [
      variant,
      supplier,
    ] =
      await Promise.all([
        prisma.productVariant.findUnique({
          where: {
            id:
              variantId,
          },

          select: {
            id: true,
          },
        }),

        prisma.supplier.findUnique({
          where: {
            id:
              supplierId,
          },

          select: {
            id: true,
            isActive:
              true,
          },
        }),
      ]);

    if (!variant) {
      return NextResponse.json(
        {
          error:
            "Variant not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (!supplier) {
      return NextResponse.json(
        {
          error:
            "Supplier not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      action ===
      "SET_PREFERRED"
    ) {
      if (
        !supplier.isActive
      ) {
        return NextResponse.json(
          {
            error:
              "Inactive supplier cannot be preferred.",
          },
          {
            status: 409,
          },
        );
      }

      const mapping =
        await prisma.supplierVariantCost.findUnique({
          where: {
            supplierId_variantId:
              {
                supplierId,
                variantId,
              },
          },

          select: {
            isActive:
              true,
          },
        });

      if (
        !mapping ||
        !mapping.isActive
      ) {
        return NextResponse.json(
          {
            error:
              "Add an active supplier cost before setting preferred supplier.",
          },
          {
            status: 409,
          },
        );
      }

      await prisma.productVariant.update({
        where: {
          id:
            variantId,
        },

        data: {
          preferredSupplierId:
            supplierId,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          "Preferred supplier updated.",
      });
    }

    if (
      action ===
      "TOGGLE_ACTIVE"
    ) {
      const mapping =
        await prisma.supplierVariantCost.findUnique({
          where: {
            supplierId_variantId:
              {
                supplierId,
                variantId,
              },
          },
        });

      if (!mapping) {
        return NextResponse.json(
          {
            error:
              "Supplier cost mapping not found.",
          },
          {
            status: 404,
          },
        );
      }

      const nextActive =
        typeof body.isActive ===
        "boolean"
          ? body.isActive
          : !mapping.isActive;

      await prisma.$transaction(
        async (tx) => {
          await tx.supplierVariantCost.update({
            where: {
              id:
                mapping.id,
            },

            data: {
              isActive:
                nextActive,
            },
          });

          if (
            !nextActive
          ) {
            await tx.productVariant.updateMany({
              where: {
                id:
                  variantId,
                preferredSupplierId:
                  supplierId,
              },

              data: {
                preferredSupplierId:
                  null,
              },
            });
          }
        },
      );

      return NextResponse.json({
        success: true,
        message:
          nextActive
            ? "Supplier cost activated."
            : "Supplier cost deactivated.",
      });
    }

    if (
      action !==
      "UPSERT_COST"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid supplier cost action.",
        },
        {
          status: 400,
        },
      );
    }

    const supplierCost =
      validCost(
        body.supplierCost,
      );

    if (
      supplierCost ===
      null
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid supplier cost.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !supplier.isActive
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot add costing for an inactive supplier.",
        },
        {
          status: 409,
        },
      );
    }

    const makePreferred =
      body.makePreferred ===
      true;

    await prisma.$transaction(
      async (tx) => {
        await tx.supplierVariantCost.upsert({
          where: {
            supplierId_variantId:
              {
                supplierId,
                variantId,
              },
          },

          create: {
            supplierId,
            variantId,
            supplierCost,
            isActive:
              true,
          },

          update: {
            supplierCost,
            isActive:
              true,
          },
        });

        if (
          makePreferred
        ) {
          await tx.productVariant.update({
            where: {
              id:
                variantId,
            },

            data: {
              preferredSupplierId:
                supplierId,
            },
          });
        }
      },
    );

    return NextResponse.json({
      success: true,
      message:
        makePreferred
          ? "Supplier cost saved and preferred supplier updated."
          : "Supplier cost saved.",
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/variant-supplier-costs failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update supplier costing.",
      },
      {
        status: 500,
      },
    );
  }
}

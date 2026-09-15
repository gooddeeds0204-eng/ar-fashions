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

function positiveInt(
  value: unknown,
) {
  const number =
    Number(value);

  if (
    !Number.isInteger(
      number,
    ) ||
    number <= 0
  ) {
    return null;
  }

  return number;
}

function createPoNumber() {
  const now =
    new Date();

  const y =
    now.getFullYear();

  const m =
    String(
      now.getMonth() + 1,
    ).padStart(2, "0");

  const d =
    String(
      now.getDate(),
    ).padStart(2, "0");

  const suffix =
    Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();

  return `ARPO-${y}${m}${d}-${suffix}`;
}

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const orders =
      await prisma.purchaseOrder.findMany({
        orderBy: {
          createdAt:
            "desc",
        },

        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              phone: true,
              whatsapp: true,
              city: true,
              state: true,
            },
          },

          items: {
            select: {
              id: true,
              variantId: true,
              productName: true,
              colorName: true,
              sizeName: true,
              sku: true,
              orderedQty: true,
              receivedQty: true,
              unitCost: true,
              totalCost: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,

      purchaseOrders:
        orders.map(
          (order) => ({
            id:
              order.id,

            poNumber:
              order.poNumber,

            status:
              order.status,

            subtotal:
              Number(
                order.subtotal,
              ),

            notes:
              order.notes,

            expectedAt:
              order.expectedAt,

            orderedAt:
              order.orderedAt,

            receivedAt:
              order.receivedAt,

            createdAt:
              order.createdAt,

            updatedAt:
              order.updatedAt,

            supplier:
              order.supplier,

            items:
              order.items.map(
                (item) => ({
                  ...item,

                  unitCost:
                    Number(
                      item.unitCost,
                    ),

                  totalCost:
                    Number(
                      item.totalCost,
                    ),
                }),
              ),
          }),
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/admin/purchase-orders failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load purchase orders.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
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

    const supplierId =
      cleanString(
        body.supplierId,
      );

    const notes =
      cleanString(
        body.notes,
      );

    const rawItems =
      Array.isArray(
        body.items,
      )
        ? body.items
        : [];

    if (!supplierId) {
      return NextResponse.json(
        {
          error:
            "Select a supplier.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      rawItems.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Select at least one restock item.",
        },
        {
          status: 400,
        },
      );
    }

    const supplier =
      await prisma.supplier.findFirst({
        where: {
          id:
            supplierId,

          isActive:
            true,
        },

        select: {
          id: true,
          name: true,
        },
      });

    if (!supplier) {
      return NextResponse.json(
        {
          error:
            "Active supplier not found.",
        },
        {
          status: 400,
        },
      );
    }

    const requested =
      new Map<
        string,
        number
      >();

    for (
      const raw of rawItems
    ) {
      const variantId =
        cleanString(
          raw.variantId,
        );

      const quantity =
        positiveInt(
          raw.quantity,
        );

      if (
        !variantId ||
        !quantity
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid purchase order item.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        requested.has(
          variantId,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Duplicate variant in purchase order.",
          },
          {
            status: 400,
          },
        );
      }

      requested.set(
        variantId,
        quantity,
      );
    }

    const variantIds =
      Array.from(
        requested.keys(),
      );

    const variants =
      await prisma.productVariant.findMany({
        where: {
          id: {
            in:
              variantIds,
          },

          isActive:
            true,
        },

        select: {
          id: true,
          sku: true,
          costPrice: true,

          product: {
            select: {
              name: true,
            },
          },

          color: {
            select: {
              name: true,
            },
          },

          size: {
            select: {
              name: true,
            },
          },
        },
      });

    if (
      variants.length !==
      variantIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more inventory variants are invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const items =
      variants.map(
        (variant) => {
          const orderedQty =
            requested.get(
              variant.id,
            )!;

          if (
            variant.costPrice ===
            null
          ) {
            throw new Error(
              `${variant.product.name} · ${variant.color.name} · ${variant.size.name} has no cost price.`,
            );
          }

          const unitCost =
            Number(
              variant.costPrice,
            );

          if (
            !Number.isFinite(
              unitCost,
            ) ||
            unitCost < 0
          ) {
            throw new Error(
              "Invalid variant cost price.",
            );
          }

          return {
            variantId:
              variant.id,

            productName:
              variant.product
                .name,

            colorName:
              variant.color.name,

            sizeName:
              variant.size.name,

            sku:
              variant.sku,

            orderedQty,

            unitCost,

            totalCost:
              unitCost *
              orderedQty,
          };
        },
      );

    const subtotal =
      items.reduce(
        (total, item) =>
          total +
          item.totalCost,
        0,
      );

    let created:
      Awaited<
        ReturnType<
          typeof prisma.purchaseOrder.create
        >
      > | null = null;

    for (
      let attempt = 0;
      attempt < 3;
      attempt += 1
    ) {
      try {
        created =
          await prisma.purchaseOrder.create({
            data: {
              poNumber:
                createPoNumber(),

              supplierId,

              status:
                "DRAFT",

              subtotal:
                subtotal.toFixed(
                  2,
                ),

              notes:
                notes ||
                null,

              items: {
                create:
                  items.map(
                    (item) => ({
                      variantId:
                        item.variantId,

                      productName:
                        item.productName,

                      colorName:
                        item.colorName,

                      sizeName:
                        item.sizeName,

                      sku:
                        item.sku,

                      orderedQty:
                        item.orderedQty,

                      unitCost:
                        item.unitCost.toFixed(
                          2,
                        ),

                      totalCost:
                        item.totalCost.toFixed(
                          2,
                        ),
                    }),
                  ),
              },
            },
          });

        break;
      } catch (error) {
        if (
          attempt === 2
        ) {
          throw error;
        }
      }
    }

    if (!created) {
      throw new Error(
        "Purchase order could not be created.",
      );
    }

    return NextResponse.json(
      {
        success: true,

        purchaseOrder: {
          id:
            created.id,

          poNumber:
            created.poNumber,

          status:
            created.status,

          subtotal:
            Number(
              created.subtotal,
            ),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/admin/purchase-orders failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create purchase order.",
      },
      {
        status: 500,
      },
    );
  }
}

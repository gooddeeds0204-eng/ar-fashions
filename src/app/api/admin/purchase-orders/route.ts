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

const LOW_STOCK_SETTING_KEY =
  "inventoryLowStockThreshold";

const DEFAULT_LOW_STOCK_THRESHOLD =
  5;

const SALES_MOVEMENT_STATUSES = [
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
] as const;

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

          leadTimeDays:
            true,

          minimumOrderQty:
            true,

          minimumOrderValue:
            true,
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
      ).sort();

    const created =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Lock every requested inventory row in a
           * deterministic order.
           *
           * Two admins cannot create overlapping
           * purchase orders from stale restock data.
           */
          for (
            const variantId of
            variantIds
          ) {
            const locked =
              await tx.$queryRaw<
                Array<{
                  id: string;
                }>
              >`
                SELECT id
                FROM "ProductVariant"
                WHERE
                  id = ${variantId}
                  AND "isActive" = true
                FOR UPDATE
              `;

            if (
              locked.length !==
              1
            ) {
              throw new Error(
                "VALIDATION:One or more inventory variants are invalid.",
              );
            }
          }

          const settings =
            await tx.siteSetting.findMany({
              where: {
                key: {
                  in: [
                    LOW_STOCK_SETTING_KEY,
                  ],
                },
              },

              select: {
                key: true,
                value: true,
              },
            });

          const rawLow =
            Number(
              settings.find(
                (item) =>
                  item.key ===
                  LOW_STOCK_SETTING_KEY,
              )?.value,
            );

          const lowStockThreshold =
            Number.isInteger(
              rawLow,
            ) &&
            rawLow >= 1 &&
            rawLow <= 100
              ? rawLow
              : DEFAULT_LOW_STOCK_THRESHOLD;

          const salesCutoff =
            new Date(
              Date.now() -
                30 *
                  24 *
                  60 *
                  60 *
                  1000,
            );

          const variants =
            await tx.productVariant.findMany({
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
                stock: true,
                reservedStock:
                  true,
                costPrice:
                  true,

                supplierCosts: {
                  where: {
                    supplierId,
                    isActive:
                      true,
                  },

                  take: 1,

                  select: {
                    supplierCost:
                      true,
                  },
                },

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

                orderItems: {
                  where: {
                    order: {
                      createdAt: {
                        gte:
                          salesCutoff,
                      },

                      status: {
                        in: [
                          "CONFIRMED",
                          "PACKED",
                          "SHIPPED",
                          "DELIVERED",
                        ],
                      },
                    },
                  },

                  select: {
                    quantity:
                      true,
                  },
                },

                purchaseOrderItems: {
                  where: {
                    purchaseOrder: {
                      status: {
                        in: [
                          "DRAFT",
                          "ORDERED",
                          "PARTIALLY_RECEIVED",
                        ],
                      },
                    },
                  },

                  select: {
                    orderedQty:
                      true,

                    receivedQty:
                      true,
                  },
                },
              },
            });

          if (
            variants.length !==
            variantIds.length
          ) {
            throw new Error(
              "VALIDATION:One or more inventory variants are invalid.",
            );
          }

          const items =
            variants.map(
              (variant) => {
                const orderedQty =
                  requested.get(
                    variant.id,
                  )!;

                const availableStock =
                  Math.max(
                    0,
                    variant.stock -
                      variant.reservedStock,
                  );

                const recentSalesQty =
                  variant.orderItems.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.quantity,
                    0,
                  );

                const targetStock =
                  Math.max(
                    lowStockThreshold *
                      2,
                    recentSalesQty,
                    lowStockThreshold +
                      1,
                  );

                const grossNeed =
                  availableStock >
                  lowStockThreshold
                    ? 0
                    : Math.max(
                        0,
                        targetStock -
                          availableStock,
                      );

                const protectedStock =
                  variant.purchaseOrderItems.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      Math.max(
                        0,
                        item.orderedQty -
                          item.receivedQty,
                      ),
                    0,
                  );

                const netNeed =
                  Math.max(
                    0,
                    grossNeed -
                      protectedStock,
                  );

                if (
                  netNeed <= 0
                ) {
                  throw new Error(
                    `RESTOCK_CONFLICT:${variant.product.name} · ${variant.color.name} · ${variant.size.name} is already covered by current stock or an open purchase order.`,
                  );
                }

                if (
                  orderedQty >
                  netNeed
                ) {
                  throw new Error(
                    `RESTOCK_CONFLICT:${variant.product.name} · ${variant.color.name} · ${variant.size.name}: only ${netNeed} pcs are currently needed after planned/incoming stock.`,
                  );
                }

                const supplierCost =
                  variant.supplierCosts[0]
                    ?.supplierCost ??
                  null;

                const costSource =
                  supplierCost ??
                  variant.costPrice;

                if (
                  costSource ===
                  null
                ) {
                  throw new Error(
                    `VALIDATION:${variant.product.name} · ${variant.color.name} · ${variant.size.name} has no supplier cost or fallback cost price.`,
                  );
                }

                const unitCost =
                  Number(
                    costSource,
                  );

                if (
                  !Number.isFinite(
                    unitCost,
                  ) ||
                  unitCost < 0
                ) {
                  throw new Error(
                    "VALIDATION:Invalid purchase cost.",
                  );
                }

                return {
                  variantId:
                    variant.id,

                  productName:
                    variant.product
                      .name,

                  colorName:
                    variant.color
                      .name,

                  sizeName:
                    variant.size
                      .name,

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
              (
                total,
                item,
              ) =>
                total +
                item.totalCost,
              0,
            );

          const totalOrderedQty =
            items.reduce(
              (
                total,
                item,
              ) =>
                total +
                item.orderedQty,
              0,
            );

          const minimumOrderValue =
            Number(
              supplier.minimumOrderValue,
            );

          if (
            totalOrderedQty <
            supplier.minimumOrderQty
          ) {
            throw new Error(
              `VALIDATION:${supplier.name} requires a minimum order of ${supplier.minimumOrderQty} pcs. Current purchase order has ${totalOrderedQty} pcs.`,
            );
          }

          if (
            subtotal <
            minimumOrderValue
          ) {
            throw new Error(
              `VALIDATION:${supplier.name} requires a minimum purchase order value of ₹${minimumOrderValue.toLocaleString("en-IN")}. Current value is ₹${subtotal.toLocaleString("en-IN")}.`,
            );
          }

          return tx.purchaseOrder.create({
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
        },
      );

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

    const rawMessage =
      error instanceof Error
        ? error.message
        : "Failed to create purchase order.";

    const isConflict =
      rawMessage.startsWith(
        "RESTOCK_CONFLICT:",
      );

    const isValidation =
      rawMessage.startsWith(
        "VALIDATION:",
      );

    const message =
      rawMessage
        .replace(
          /^RESTOCK_CONFLICT:/,
          "",
        )
        .replace(
          /^VALIDATION:/,
          "",
        );

    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status:
          isConflict
            ? 409
            : isValidation
              ? 400
              : 500,
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

    const purchaseOrderId =
      cleanString(
        body.purchaseOrderId,
      );

    if (!purchaseOrderId) {
      return NextResponse.json(
        {
          error:
            "Purchase order ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      action ===
      "UPDATE_DETAILS"
    ) {
      const notes =
        cleanString(
          body.notes,
        );

      const expectedAtRaw =
        cleanString(
          body.expectedAt,
        );

      let expectedAt:
        Date | null =
        null;

      if (expectedAtRaw) {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(
            expectedAtRaw,
          )
        ) {
          return NextResponse.json(
            {
              error:
                "Expected delivery date is invalid.",
            },
            {
              status: 400,
            },
          );
        }

        expectedAt =
          new Date(
            `${expectedAtRaw}T00:00:00.000Z`,
          );

        if (
          Number.isNaN(
            expectedAt.getTime(),
          )
        ) {
          return NextResponse.json(
            {
              error:
                "Expected delivery date is invalid.",
            },
            {
              status: 400,
            },
          );
        }
      }

      const changed =
        await prisma.purchaseOrder.updateMany({
          where: {
            id:
              purchaseOrderId,

            status: {
              in: [
                "DRAFT",
                "ORDERED",
                "PARTIALLY_RECEIVED",
              ],
            },
          },

          data: {
            notes:
              notes ||
              null,

            expectedAt,
          },
        });

      if (
        changed.count !==
        1
      ) {
        const current =
          await prisma.purchaseOrder.findUnique({
            where: {
              id:
                purchaseOrderId,
            },

            select: {
              status: true,
            },
          });

        if (!current) {
          return NextResponse.json(
            {
              error:
                "Purchase order not found.",
            },
            {
              status: 404,
            },
          );
        }

        return NextResponse.json(
          {
            error:
              `Details cannot be changed for a ${current.status} purchase order.`,
          },
          {
            status: 409,
          },
        );
      }

      const updated =
        await prisma.purchaseOrder.findUnique({
          where: {
            id:
              purchaseOrderId,
          },

          select: {
            id: true,
            poNumber: true,
            status: true,
            notes: true,
            expectedAt: true,
          },
        });

      return NextResponse.json({
        success: true,
        purchaseOrder:
          updated,
      });
    }

    if (
      action ===
      "CANCEL"
    ) {
      type LockedCancelPO = {
        id: string;
        poNumber: string;
        status: string;
      };

      const cancelled =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Lock PO before cancellation so a
             * receive request cannot race with cancel.
             */
            const locked =
              await tx.$queryRaw<
                LockedCancelPO[]
              >`
                SELECT
                  id,
                  "poNumber",
                  status::text AS status
                FROM "PurchaseOrder"
                WHERE id = ${purchaseOrderId}
                FOR UPDATE
              `;

            if (
              locked.length !==
              1
            ) {
              throw new Error(
                "PO_NOT_FOUND",
              );
            }

            const current =
              locked[0];

            if (
              current.status !==
                "DRAFT" &&
              current.status !==
                "ORDERED"
            ) {
              throw new Error(
                `CANCEL_CONFLICT:Only Draft or unreceived Ordered purchase orders can be cancelled. Current status: ${current.status}.`,
              );
            }

            const items =
              await tx.purchaseOrderItem.findMany({
                where: {
                  purchaseOrderId,
                },

                select: {
                  receivedQty:
                    true,
                },
              });

            const receivedQty =
              items.reduce(
                (
                  total,
                  item,
                ) =>
                  total +
                  item.receivedQty,
                0,
              );

            if (
              receivedQty > 0
            ) {
              throw new Error(
                "CANCEL_CONFLICT:This purchase order already has received stock and cannot be cancelled.",
              );
            }

            return tx.purchaseOrder.update({
              where: {
                id:
                  purchaseOrderId,
              },

              data: {
                status:
                  "CANCELLED",
              },

              select: {
                id: true,
                poNumber: true,
                status: true,
              },
            });
          },
        );

      return NextResponse.json({
        success: true,
        purchaseOrder:
          cancelled,
      });
    }

    if (
      action ===
      "MARK_ORDERED"
    ) {
      const now =
        new Date();

      const changed =
        await prisma.purchaseOrder.updateMany({
          where: {
            id:
              purchaseOrderId,

            status:
              "DRAFT",
          },

          data: {
            status:
              "ORDERED",

            orderedAt:
              now,
          },
        });

      if (
        changed.count !== 1
      ) {
        const current =
          await prisma.purchaseOrder.findUnique({
            where: {
              id:
                purchaseOrderId,
            },

            select: {
              status: true,
            },
          });

        if (!current) {
          return NextResponse.json(
            {
              error:
                "Purchase order not found.",
            },
            {
              status: 404,
            },
          );
        }

        return NextResponse.json(
          {
            error:
              `Only Draft purchase orders can be marked Ordered. Current status: ${current.status}.`,
          },
          {
            status: 409,
          },
        );
      }

      const updated =
        await prisma.purchaseOrder.findUnique({
          where: {
            id:
              purchaseOrderId,
          },

          select: {
            id: true,
            poNumber: true,
            status: true,
            orderedAt: true,
          },
        });

      return NextResponse.json({
        success: true,
        purchaseOrder:
          updated,
      });
    }

    if (
      action !==
      "RECEIVE"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid purchase order action.",
        },
        {
          status: 400,
        },
      );
    }

    const rawItems =
      Array.isArray(
        body.items,
      )
        ? body.items
        : [];

    if (
      rawItems.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Enter at least one received quantity.",
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
      const itemId =
        cleanString(
          raw.itemId,
        );

      const quantity =
        positiveInt(
          raw.quantity,
        );

      if (
        !itemId ||
        !quantity
      ) {
        return NextResponse.json(
          {
            error:
              "Received quantities must be positive whole numbers.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        requested.has(
          itemId,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Duplicate purchase order item.",
          },
          {
            status: 400,
          },
        );
      }

      requested.set(
        itemId,
        quantity,
      );
    }

    type LockedPurchaseOrder = {
      id: string;
      poNumber: string;
      status: string;
      supplierId: string;
    };

    type ChangedPurchaseItem = {
      id: string;
      variantId: string;
      orderedQty: number;
      receivedQty: number;
    };

    type ChangedStock = {
      id: string;
      stock: number;
      reservedStock: number;
    };

    const result =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Lock the PO row for the whole receipt.
           * This serializes simultaneous receive requests
           * and prevents duplicate inventory additions.
           */
          const locked =
            await tx.$queryRaw<
              LockedPurchaseOrder[]
            >`
              SELECT
                id,
                "poNumber",
                status::text AS status,
                "supplierId"
              FROM "PurchaseOrder"
              WHERE id = ${purchaseOrderId}
              FOR UPDATE
            `;

          if (
            locked.length !== 1
          ) {
            throw new Error(
              "Purchase order not found.",
            );
          }

          const purchaseOrder =
            locked[0];

          if (
            purchaseOrder.status !==
              "ORDERED" &&
            purchaseOrder.status !==
              "PARTIALLY_RECEIVED"
          ) {
            throw new Error(
              `Stock can only be received for Ordered purchase orders. Current status: ${purchaseOrder.status}.`,
            );
          }

          const itemIds =
            Array.from(
              requested.keys(),
            );

          const purchaseItems =
            await tx.purchaseOrderItem.findMany({
              where: {
                purchaseOrderId,

                id: {
                  in:
                    itemIds,
                },
              },

              select: {
                id: true,
                variantId: true,
                orderedQty: true,
                receivedQty: true,
                unitCost: true,
                productName: true,
                colorName: true,
                sizeName: true,
              },
            });

          if (
            purchaseItems.length !==
            itemIds.length
          ) {
            throw new Error(
              "One or more purchase order items are invalid.",
            );
          }

          let receivedThisTime =
            0;

          for (
            const item of purchaseItems
          ) {
            const quantity =
              requested.get(
                item.id,
              )!;

            /*
             * Atomic PO-item receive.
             *
             * The WHERE clause prevents receivedQty
             * from ever exceeding orderedQty.
             */
            const changedItem =
              await tx.$queryRaw<
                ChangedPurchaseItem[]
              >`
                UPDATE "PurchaseOrderItem"
                SET
                  "receivedQty" =
                    "receivedQty" +
                    ${quantity},
                  "updatedAt" =
                    NOW()
                WHERE
                  id = ${item.id}
                  AND
                  "purchaseOrderId" =
                    ${purchaseOrderId}
                  AND
                  "receivedQty" +
                    ${quantity}
                    <=
                    "orderedQty"
                RETURNING
                  id,
                  "variantId",
                  "orderedQty",
                  "receivedQty"
              `;

            if (
              changedItem.length !==
              1
            ) {
              throw new Error(
                `${item.productName} · ${item.colorName} · ${item.sizeName}: received quantity exceeds the remaining PO quantity.`,
              );
            }

            /*
             * Atomic stock addition.
             */
            const changedStock =
              await tx.$queryRaw<
                ChangedStock[]
              >`
                UPDATE "ProductVariant"
                SET
                  stock =
                    stock +
                    ${quantity},
                  "updatedAt" =
                    NOW()
                WHERE
                  id =
                    ${item.variantId}
                RETURNING
                  id,
                  stock,
                  "reservedStock"
              `;

            if (
              changedStock.length !==
              1
            ) {
              throw new Error(
                `${item.productName} · ${item.colorName} · ${item.sizeName}: inventory variant no longer exists.`,
              );
            }

            const stock =
              changedStock[0];

            const previousStock =
              stock.stock -
              quantity;

            await tx.inventoryAdjustment.create({
              data: {
                variantId:
                  item.variantId,

                adjustment:
                  quantity,

                previousStock,

                newStock:
                  stock.stock,

                reason:
                  `PURCHASE_ORDER_RECEIPT:${purchaseOrder.poNumber}`,
              },
            });

            const actualUnitCost =
              Number(
                item.unitCost,
              );

            if (
              !Number.isFinite(
                actualUnitCost,
              ) ||
              actualUnitCost < 0
            ) {
              throw new Error(
                "Invalid purchase order unit cost.",
              );
            }

            const receivedAt =
              new Date();

            await tx.supplierVariantCost.upsert({
              where: {
                supplierId_variantId:
                  {
                    supplierId:
                      purchaseOrder.supplierId,

                    variantId:
                      item.variantId,
                  },
              },

              create: {
                supplierId:
                  purchaseOrder.supplierId,

                variantId:
                  item.variantId,

                supplierCost:
                  actualUnitCost.toFixed(
                    2,
                  ),

                lastPurchaseCost:
                  actualUnitCost.toFixed(
                    2,
                  ),

                lastPurchasedAt:
                  receivedAt,

                isActive:
                  true,
              },

              update: {
                lastPurchaseCost:
                  actualUnitCost.toFixed(
                    2,
                  ),

                lastPurchasedAt:
                  receivedAt,
              },
            });

            receivedThisTime +=
              quantity;
          }

          const allItems =
            await tx.purchaseOrderItem.findMany({
              where: {
                purchaseOrderId,
              },

              select: {
                orderedQty:
                  true,

                receivedQty:
                  true,
              },
            });

          const allReceived =
            allItems.length >
              0 &&
            allItems.every(
              (item) =>
                item.receivedQty >=
                item.orderedQty,
            );

          const totalOrdered =
            allItems.reduce(
              (
                total,
                item,
              ) =>
                total +
                item.orderedQty,
              0,
            );

          const totalReceived =
            allItems.reduce(
              (
                total,
                item,
              ) =>
                total +
                item.receivedQty,
              0,
            );

          const updatedPO =
            await tx.purchaseOrder.update({
              where: {
                id:
                  purchaseOrderId,
              },

              data: {
                status:
                  allReceived
                    ? "RECEIVED"
                    : "PARTIALLY_RECEIVED",

                receivedAt:
                  allReceived
                    ? new Date()
                    : null,
              },

              select: {
                id: true,
                poNumber: true,
                status: true,
                orderedAt: true,
                receivedAt: true,
              },
            });

          return {
            purchaseOrder:
              updatedPO,

            receivedThisTime,

            totalOrdered,

            totalReceived,
          };
        },
      );

    return NextResponse.json({
      success: true,

      purchaseOrder:
        result.purchaseOrder,

      receivedThisTime:
        result.receivedThisTime,

      totalOrdered:
        result.totalOrdered,

      totalReceived:
        result.totalReceived,
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/purchase-orders failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update purchase order.";

    if (
      message ===
      "PO_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          error:
            "Purchase order not found.",
        },
        {
          status: 404,
        },
      );
    }

    const cancelConflict =
      message.startsWith(
        "CANCEL_CONFLICT:",
      );

    const cleanMessage =
      message.replace(
        /^CANCEL_CONFLICT:/,
        "",
      );

    const conflict =
      cancelConflict ||
      cleanMessage.includes(
        "exceeds the remaining",
      ) ||
      cleanMessage.includes(
        "can only be received",
      );

    return NextResponse.json(
      {
        error:
          cleanMessage,
      },
      {
        status:
          conflict
            ? 409
            : 500,
      },
    );
  }
}

import { requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedCustomerId,
} from "@/lib/customer-auth";
import {
  evaluateCoupon,
  type CouponOrderType,
} from "@/lib/coupon";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_OPTIONS,
  createCustomerSessionToken,
} from "@/lib/customer-session";
import {
  enforcePublicRateLimit,
  requireSameOriginJson,
} from "@/lib/public-write-security";

type OrderItemInput = {
  productId?: unknown;
  variantId?: unknown;
  quantity?: unknown;
  mode?: unknown;
};

function sizeLabel(
  name: string,
  inches?: string | null,
) {
  return inches
    ? `${name} · Height ${inches}`
    : name;
}

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function validQuantity(value: unknown) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0
    ? number
    : null;
}

function generateOrderNumber() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  const random = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `ARF-${year}${month}${day}-${random}`;
}


const DEFAULT_ORDER_SITE_SETTINGS = {
  codEnabled: true,
  minimumRetailOrder: 0,
  maintenanceMode: false,
  maintenanceMessage:
    "We are currently updating the store. Please check back shortly.",
};

function parseOrderSiteSettings(
  value?: string | null,
) {
  if (!value) {
    return DEFAULT_ORDER_SITE_SETTINGS;
  }

  try {
    const source =
      JSON.parse(value) as Record<
        string,
        unknown
      >;

    const minimumRetailOrder =
      Number(
        source.minimumRetailOrder,
      );

    return {
      codEnabled:
        source.codEnabled !== false,

      minimumRetailOrder:
        Number.isFinite(
          minimumRetailOrder,
        ) &&
        minimumRetailOrder >= 0
          ? minimumRetailOrder
          : 0,

      maintenanceMode:
        source.maintenanceMode === true,

      maintenanceMessage:
        cleanString(
          source.maintenanceMessage,
        ) ||
        DEFAULT_ORDER_SITE_SETTINGS.maintenanceMessage,
    };
  } catch {
    return DEFAULT_ORDER_SITE_SETTINGS;
  }
}

export async function GET(request: Request) {
  /* ADMIN_GUARD_GET */
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "RETURN_REQUESTED",
      "RETURNED",
      "REFUNDED",
    ];

    const orders = await prisma.order.findMany({
      where: {
        ...(status && validStatuses.includes(status)
          ? { status: status as any }
          : {}),
        ...(type === "RETAIL" || type === "RESELLER"
          ? { type: type as any }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: true,
        address: true,
        items: true,
        payment: true,
      },
    });

    const data = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      deliveryCharge: Number(order.deliveryCharge),
      deliveryChargePending:
        order.deliveryChargePending,
      totalAmount: Number(order.totalAmount),
      couponCode: order.couponCode,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,

      customer: {
        id: order.user.id,
        name: order.user.name,
        phone: order.user.phone,
      },

      address: order.address
        ? {
            name: order.address.name,
            phone: order.address.phone,
            addressLine1: order.address.addressLine1,
            addressLine2: order.address.addressLine2,
            city: order.address.city,
            state: order.address.state,
            pincode: order.address.pincode,
            landmark: order.address.landmark,
          }
        : null,

      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        colorName: item.colorName,
        sizeName: item.sizeName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        inventoryRestored: item.inventoryRestored,
      })),

      payment: order.payment
        ? {
            provider: order.payment.provider,
            transactionId: order.payment.transactionId,
            amount: Number(order.payment.amount),
            status: order.payment.status,
            paidAt: order.payment.paidAt,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      orders: data,
      count: data.length,
    });
  } catch (error) {
    console.error("GET /api/orders failed:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch orders.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  /* ADMIN_GUARD_PATCH */
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body = await request.json();

    const orderId = cleanString(body.orderId);
    const status = cleanString(body.status);
    const action =
      cleanString(body.action).toUpperCase();

    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "RETURN_REQUESTED",
      "RETURNED",
      "REFUNDED",
    ];

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 },
      );
    }

    /*
     * Finalize actual freight for reseller /
     * bulk orders after parcel packing.
     */
    if (action === "SET_FREIGHT") {
      const freight =
        Number(body.deliveryCharge);

      if (
        !Number.isFinite(freight) ||
        freight < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Enter a valid freight charge.",
          },
          { status: 400 },
        );
      }

      const roundedFreight =
        Math.round(freight * 100) /
        100;

      const freightResult =
        await prisma.$transaction(
          async (tx) => {
            const order =
              await tx.order.findUnique({
                where: {
                  id: orderId,
                },
                include: {
                  payment: true,
                },
              });

            if (!order) {
              throw new Error(
                "Order not found.",
              );
            }

            if (
              order.type !==
              "RESELLER"
            ) {
              throw new Error(
                "Freight can be set only for reseller orders.",
              );
            }

            if (
              ![
                "PENDING",
                "CONFIRMED",
                "PACKED",
              ].includes(
                order.status,
              )
            ) {
              throw new Error(
                "Freight cannot be changed after the order is shipped.",
              );
            }

            /*
             * Preserve all merchandise /
             * coupon / curated-set pricing.
             * Only replace old delivery amount.
             */
            const newTotal =
              Math.max(
                0,
                Math.round(
                  (
                    Number(
                      order.totalAmount,
                    ) -
                    Number(
                      order.deliveryCharge,
                    ) +
                    roundedFreight
                  ) *
                    100,
                ) / 100,
              );

            const updated =
              await tx.order.update({
                where: {
                  id: orderId,
                },
                data: {
                  deliveryCharge:
                    roundedFreight,
                  deliveryChargePending:
                    false,
                  totalAmount:
                    newTotal,
                },
              });

            /*
             * COD payment must always equal
             * the final order payable amount.
             */
            if (order.payment) {
              await tx.payment.update({
                where: {
                  orderId,
                },
                data: {
                  amount:
                    newTotal,
                },
              });
            }

            return {
              id: updated.id,
              deliveryCharge:
                Number(
                  updated.deliveryCharge,
                ),
              deliveryChargePending:
                updated.deliveryChargePending,
              totalAmount:
                Number(
                  updated.totalAmount,
                ),
            };
          },
        );

      return NextResponse.json({
        success: true,
        message:
          "Freight charge updated successfully.",
        order: freightResult,
      });
    }

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid order status." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          items: true,
          payment: true,
        },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      const oldStatus = order.status;

      /*
       * Bulk reseller orders must have the
       * actual freight finalized before shipping.
       */
      if (
        status === "SHIPPED" &&
        order.deliveryChargePending
      ) {
        throw new Error(
          "Set the bulk freight charge before shipping this order.",
        );
      }

      /*
       * Prevent meaningless status updates.
       */
      if (oldStatus === status) {
        return {
          order: {
            id: order.id,
            status: order.status,
            updatedAt: order.updatedAt,
          },
          stockRestored: false,
        };
      }

      /*
       * Allowed order lifecycle transitions.
       *
       * This prevents invalid jumps such as:
       * PENDING -> RETURNED
       * DELIVERED -> CANCELLED
       * RETURN_REQUESTED -> DELIVERED
       */
      const allowedTransitions: Record<string, string[]> = {
        PENDING: [
          "CONFIRMED",
          "CANCELLED",
        ],

        CONFIRMED: [
          "PACKED",
          "CANCELLED",
        ],

        PACKED: [
          "SHIPPED",
          "CANCELLED",
        ],

        SHIPPED: [
          "DELIVERED",
          "RETURN_REQUESTED",
        ],

        DELIVERED: [
          "RETURN_REQUESTED",
        ],

        RETURN_REQUESTED: [
          "RETURNED",
        ],

        RETURNED: [
          "REFUNDED",
        ],

        CANCELLED: [],
        REFUNDED: [],
      };

      const allowedNextStatuses =
        allowedTransitions[oldStatus] ?? [];

      if (!allowedNextStatuses.includes(status)) {
        throw new Error(
          `Invalid order status transition: ${oldStatus} -> ${status}.`,
        );
      }

      /*
       * Stock should be restored only when an order
       * becomes CANCELLED or RETURNED.
       *
       * RETURN_REQUESTED does NOT restore stock because
       * the return has not yet been approved/completed.
       *
       * REFUNDED does NOT restore stock because the stock
       * was already restored when the order became RETURNED.
       */
      const shouldRestoreStock =
        status === "CANCELLED" ||
        status === "RETURNED";

      let stockRestored = false;

      if (shouldRestoreStock) {
        for (const item of order.items) {
          /*
           * Items without a variant cannot safely restore
           * variant inventory.
           */
          if (!item.variantId) {
            continue;
          }

          /*
           * inventoryRestored makes this operation idempotent.
           * If the same order is patched again, stock will
           * not be incremented twice.
           */
          if (item.inventoryRestored) {
            continue;
          }

          /*
           * Atomically claim this order item for stock restore.
           * This prevents two simultaneous CANCEL/RETURN requests
           * from restoring the same inventory twice.
           */
          const claimed = await tx.orderItem.updateMany({
            where: {
              id: item.id,
              inventoryRestored: false,
            },
            data: {
              inventoryRestored: true,
            },
          });

          if (claimed.count === 0) {
            continue;
          }

          const restored = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
            },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });

          if (restored.count !== 1) {
            throw new Error(
              `Failed to restore stock for ${item.productName}.`,
            );
          }

          stockRestored = true;
        }
      }

      /*
       * Update order status.
       */
      const updated = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: status as any,
        },
      });

      /*
       * If an order is refunded, keep payment state
       * synchronized when a payment record exists.
       */
      if (
        status === "REFUNDED" &&
        order.payment
      ) {
        await tx.payment.update({
          where: {
            orderId,
          },
          data: {
            status: "REFUNDED",
          },
        });
      }

      return {
        order: {
          id: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt,
        },
        stockRestored,
      };
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      stockRestored: result.stockRestored,
    });
  } catch (error) {
    console.error("PATCH /api/orders failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update order.";

    const status =
      message === "Order not found."
        ? 404
        : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}

export async function POST(request: Request) {
  try {
    const requestGuard =
      requireSameOriginJson(
        request,
      );

    if (requestGuard) {
      return requestGuard;
    }

    const rateLimitResponse =
      await enforcePublicRateLimit(
        request,
        {
          scope:
            "public-order-create",
          limit: 5,
          windowSeconds:
            60 * 10,
        },
      );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();

    const type = cleanString(body.type);
    const paymentMethod = cleanString(
      body.paymentMethod,
    );

    const requestedCouponCode =
      cleanString(
        body.couponCode,
      ).toUpperCase();

    const requestedResellerSetId =
      cleanString(
        body.resellerSetId,
      );

    const requestedResellerSetCount =
      requestedResellerSetId
        ? validQuantity(
            body.resellerSetCount ?? 1,
          )
        : null;

    if (
      type !== "RETAIL" &&
      type !== "RESELLER"
    ) {
      return NextResponse.json(
        {
          error: "Invalid order type.",
        },
        { status: 400 },
      );
    }

    if (paymentMethod !== "COD") {
      return NextResponse.json(
        {
          error:
            "Only Cash on Delivery is available right now.",
        },
        { status: 400 },
      );
    }

    if (
      requestedResellerSetId &&
      type !== "RESELLER"
    ) {
      return NextResponse.json(
        {
          error:
            "Curated reseller sets can only be purchased in reseller mode.",
        },
        { status: 400 },
      );
    }

    if (
      requestedResellerSetId &&
      !requestedResellerSetCount
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid reseller set quantity.",
        },
        { status: 400 },
      );
    }

    const customer = body.customer ?? {};

    const selectedAddressId =
      cleanString(body.addressId);

    const name = cleanString(customer.name);
    const phone = cleanString(customer.phone);
    const addressLine1 = cleanString(
      customer.addressLine1,
    );
    const addressLine2 = cleanString(
      customer.addressLine2,
    );
    const city = cleanString(customer.city);
    const state = cleanString(customer.state);
    const pincode = cleanString(customer.pincode);
    const landmark = cleanString(customer.landmark);

    if (!name) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 },
      );
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "Valid mobile number is required." },
        { status: 400 },
      );
    }

    if (!addressLine1) {
      return NextResponse.json(
        { error: "Address is required." },
        { status: 400 },
      );
    }

    if (!city) {
      return NextResponse.json(
        { error: "City is required." },
        { status: 400 },
      );
    }

    if (!state) {
      return NextResponse.json(
        { error: "State is required." },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: "Valid 6-digit pincode is required." },
        { status: 400 },
      );
    }

    const rawItems = Array.isArray(body.items)
      ? body.items
      : [];

    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "Your cart is empty." },
        { status: 400 },
      );
    }

    const items: OrderItemInput[] = rawItems;

    /*
     * Saved addresses are only accepted
     * when the signed customer cookie
     * belongs to the same customer.
     */
    const sessionUserId =
      await getAuthenticatedCustomerId();

    const result = await prisma.$transaction(
      async (tx) => {
        /*
         * Store-wide settings are always
         * validated on the server.
         */
        const [
          siteSettingsRow,
          salesModeRow,
        ] =
          await Promise.all([
            tx.siteSetting.findUnique({
              where: {
                key:
                  "site_settings_v1",
              },
            }),

            tx.salesMode.findFirst({
              orderBy: {
                updatedAt:
                  "desc",
              },
            }),
          ]);

        const siteSettings =
          parseOrderSiteSettings(
            siteSettingsRow?.value,
          );

        if (
          siteSettings.maintenanceMode
        ) {
          throw new Error(
            siteSettings.maintenanceMessage,
          );
        }

        if (
          type === "RETAIL" &&
          salesModeRow?.retailStatus ===
            "CLOSED"
        ) {
          throw new Error(
            salesModeRow.retailMessage ||
              "Retail shopping is currently closed.",
          );
        }

        if (
          type === "RESELLER" &&
          salesModeRow?.resellerStatus ===
            "CLOSED"
        ) {
          throw new Error(
            salesModeRow.resellerMessage ||
              "Reseller orders are currently closed.",
          );
        }

        if (
          paymentMethod === "COD" &&
          !siteSettings.codEnabled
        ) {
          throw new Error(
            "Cash on Delivery is currently unavailable.",
          );
        }

        /*
         * 1. Resolve customer identity safely.
         *
         * A phone number is contact information,
         * not authentication.
         *
         * - A valid signed customer session may
         *   reuse its own ACTIVE customer account.
         * - A new phone may create a new customer.
         * - If the phone already belongs to another
         *   account and there is no matching signed
         *   session, create a detached guest customer
         *   instead of taking over that account.
         * - ADMIN accounts are never accepted as
         *   customer-session identities.
         */
        const sessionUser =
          sessionUserId
            ? await tx.user.findFirst({
                where: {
                  id: sessionUserId,
                  status: "ACTIVE",
                },
              })
            : null;

        const authenticatedUser =
          sessionUser &&
          sessionUser.role !== "ADMIN"
            ? sessionUser
            : null;

        const phoneOwner =
          authenticatedUser
            ? null
            : await tx.user.findUnique({
                where: {
                  phone,
                },
                select: {
                  id: true,
                },
              });

        const user =
          authenticatedUser
            ? await tx.user.update({
                where: {
                  id:
                    authenticatedUser.id,
                },
                data: {
                  name,
                },
              })
            : phoneOwner
              ? await tx.user.create({
                  data: {
                    name,
                    role: "CUSTOMER",
                    status: "ACTIVE",
                  },
                })
              : await tx.user.create({
                  data: {
                    name,
                    phone,
                    role: "CUSTOMER",
                    status: "ACTIVE",
                  },
                });

        /*
         * 2. Resolve delivery address.
         *
         * A selected saved address must
         * belong to the signed customer.
         * Otherwise we reuse an identical
         * saved address or create a new one.
         */
        let address;

        if (selectedAddressId) {
          if (
            !sessionUserId ||
            sessionUserId !== user.id
          ) {
            throw new Error(
              "Saved address session is invalid. Please choose the address again.",
            );
          }

          address =
            await tx.address.findFirst({
              where: {
                id: selectedAddressId,
                userId: user.id,
              },
            });

          if (!address) {
            throw new Error(
              "Saved address was not found.",
            );
          }
        } else {
          const existingAddress =
            await tx.address.findFirst({
              where: {
                userId: user.id,
                name,
                phone,
                addressLine1,
                addressLine2:
                  addressLine2 || null,
                city,
                state,
                pincode,
                landmark:
                  landmark || null,
              },
            });

          if (existingAddress) {
            address =
              existingAddress;
          } else {
            const addressCount =
              await tx.address.count({
                where: {
                  userId: user.id,
                },
              });

            address =
              await tx.address.create({
                data: {
                  userId: user.id,
                  name,
                  phone,
                  addressLine1,
                  addressLine2:
                    addressLine2 ||
                    null,
                  city,
                  state,
                  pincode,
                  landmark:
                    landmark ||
                    null,
                  isDefault:
                    addressCount === 0,
                },
              });
          }
        }

        /*
         * 3. Resolve curated reseller set.
         *
         * Set identity, price, MOQ and
         * product allocation always come
         * from the database.
         */
        const resellerSet =
          requestedResellerSetId
            ? await tx.resellerSet.findUnique({
                where: {
                  id: requestedResellerSetId,
                },
                include: {
                  items: true,
                },
              })
            : null;

        if (
          requestedResellerSetId &&
          !resellerSet
        ) {
          throw new Error(
            "Reseller set was not found.",
          );
        }

        if (
          resellerSet &&
          resellerSet.status !== "ACTIVE"
        ) {
          throw new Error(
            `${resellerSet.name} is not currently available.`,
          );
        }

        const resellerSetCount =
          resellerSet
            ? requestedResellerSetCount!
            : 0;

        if (
          resellerSet &&
          resellerSetCount <
            Math.max(1, resellerSet.moq)
        ) {
          throw new Error(
            `Minimum ${resellerSet.moq} set${resellerSet.moq === 1 ? "" : "s"} required for ${resellerSet.name}.`,
          );
        }

        const expectedSetProductTotals =
          new Map<string, number>();

        if (resellerSet) {
          for (
            const setItem of
            resellerSet.items
          ) {
            expectedSetProductTotals.set(
              setItem.productId,
              setItem.quantity *
                resellerSetCount,
            );
          }
        }

        const actualSetProductTotals =
          new Map<string, number>();

        /*
         * 4. Validate products and calculate
         *    normal reseller prices directly
         *    from database.
         */
        const orderItems: Array<{
          productId: string;
          variantId: string;
          productName: string;
          colorName: string;
          sizeName: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }> = [];

        let subtotal = 0;

        const resellerProductTotals =
          new Map<
            string,
            {
              productName: string;
              quantity: number;
              moq: number;
            }
          >();

        for (const item of items) {
          const productId = cleanString(
            item.productId,
          );

          const variantId = cleanString(
            item.variantId,
          );

          const quantity = validQuantity(
            item.quantity,
          );

          if (
            !productId ||
            !variantId ||
            !quantity
          ) {
            throw new Error(
              "Invalid cart item.",
            );
          }

          const itemMode =
            cleanString(item.mode) || "RETAIL";

          if (itemMode !== type) {
            throw new Error(
              "Retail and reseller items cannot be mixed in the same order.",
            );
          }

          const variant =
            await tx.productVariant.findUnique({
              where: {
                id: variantId,
              },
              include: {
                product: true,
                color: true,
                size: true,
              },
            });

          if (!variant) {
            throw new Error(
              "One of the selected variants no longer exists.",
            );
          }

          if (
            variant.productId !== productId
          ) {
            throw new Error(
              "Invalid product variant.",
            );
          }

          if (!variant.isActive) {
            throw new Error(
              `${variant.product.name} variant is unavailable.`,
            );
          }

          if (
            variant.product.status !== "ACTIVE"
          ) {
            throw new Error(
              `${variant.product.name} is currently unavailable.`,
            );
          }

          if (
            type === "RETAIL" &&
            variant.product.salesMode !== "RETAIL" &&
            variant.product.salesMode !== "BOTH"
          ) {
            throw new Error(
              `${variant.product.name} is not available for retail purchase.`,
            );
          }

          if (
            type === "RESELLER" &&
            variant.product.salesMode !== "BULK" &&
            variant.product.salesMode !== "BOTH"
          ) {
            throw new Error(
              `${variant.product.name} is not available for reseller purchase.`,
            );
          }

          /*
           * Price always comes from database.
           */
          const rawPrice =
            type === "RESELLER"
              ? variant.resellerPrice ??
                variant.product.resellerPrice
              : variant.retailPrice ??
                variant.product.retailPrice;

          if (
            rawPrice === null ||
            rawPrice === undefined
          ) {
            throw new Error(
              `Price is not configured for ${variant.product.name}.`,
            );
          }

          const price = Number(rawPrice);

          if (
            !Number.isFinite(price) ||
            price < 0
          ) {
            throw new Error(
              `Invalid price for ${variant.product.name}.`,
            );
          }

          /*
           * First stock check.
           */
          if (variant.stock < quantity) {
            throw new Error(
              `Only ${variant.stock} pieces available for ${variant.product.name} (${variant.color.name}, ${variant.size.name}).`,
            );
          }

          if (resellerSet) {
            actualSetProductTotals.set(
              productId,
              (actualSetProductTotals.get(
                productId,
              ) ?? 0) + quantity,
            );
          }

          /*
           * Normal reseller purchases use
           * product-level MOQ.
           *
           * Curated sets use their own exact
           * allocation + set-level MOQ instead.
           */
          if (
            type === "RESELLER" &&
            !resellerSet
          ) {
            const moq = Math.max(
              1,
              variant.product.resellerMOQ ?? 1,
            );

            const existing =
              resellerProductTotals.get(productId);

            if (existing) {
              existing.quantity += quantity;
              existing.moq = Math.max(
                existing.moq,
                moq,
              );
            } else {
              resellerProductTotals.set(
                productId,
                {
                  productName:
                    variant.product.name,
                  quantity,
                  moq,
                },
              );
            }
          }

          const totalPrice =
            price * quantity;

          subtotal += totalPrice;

          orderItems.push({
            productId,
            variantId,
            productName:
              variant.product.name,
            colorName:
              variant.color.name,
            sizeName:
              sizeLabel(
                variant.size.name,
                variant.size.inches,
              ),
            quantity,
            unitPrice: price,
            totalPrice,
          });
        }

        if (
          type === "RESELLER" &&
          !resellerSet
        ) {
          for (const group of resellerProductTotals.values()) {
            if (group.quantity < group.moq) {
              throw new Error(
                `Reseller MOQ not reached for ${group.productName}: ${group.quantity}/${group.moq} pieces.`,
              );
            }
          }
        }

        if (resellerSet) {
          if (
            actualSetProductTotals.size !==
            expectedSetProductTotals.size
          ) {
            throw new Error(
              "Selected products do not match this reseller set.",
            );
          }

          for (
            const [
              productId,
              expectedQuantity,
            ] of
            expectedSetProductTotals.entries()
          ) {
            const actualQuantity =
              actualSetProductTotals.get(
                productId,
              ) ?? 0;

            if (
              actualQuantity !==
              expectedQuantity
            ) {
              throw new Error(
                `Reseller set quantity mismatch. Expected ${expectedQuantity} pieces for one of the set products, received ${actualQuantity}.`,
              );
            }
          }
        }

        /*
         * Curated-set pricing is treated as
         * an order-level wholesale saving.
         *
         * Order item prices remain the real
         * DB reseller prices, while payable
         * merchandise value becomes the
         * database set price.
         */
        let curatedSetDiscount = 0;
        let couponBaseSubtotal =
          subtotal;

        if (resellerSet) {
          const curatedSetTotal =
            Math.round(
              Number(
                resellerSet.setPrice,
              ) *
                resellerSetCount *
                100,
            ) / 100;

          if (
            !Number.isFinite(
              curatedSetTotal,
            ) ||
            curatedSetTotal <= 0
          ) {
            throw new Error(
              "Reseller set price is invalid.",
            );
          }

          /*
           * Curated wholesale sets should
           * never cost more than their
           * current normal reseller value.
           */
          if (
            curatedSetTotal >
            subtotal + 0.009
          ) {
            throw new Error(
              "This reseller set price is above the current reseller value. Please contact support.",
            );
          }

          curatedSetDiscount =
            Math.round(
              (subtotal -
                curatedSetTotal) *
                100,
            ) / 100;

          couponBaseSubtotal =
            curatedSetTotal;
        }

        /*
         * 5. Validate coupon using
         *    server-side DB values only.
         */
        let appliedCouponCode:
          string | null = null;

        let couponDiscountAmount = 0;

        if (requestedCouponCode) {
          const coupon =
            await tx.coupon.findUnique({
              where: {
                code:
                  requestedCouponCode,
              },
            });

          if (!coupon) {
            throw new Error(
              "Coupon code not found.",
            );
          }

          const couponResult =
            evaluateCoupon(
              coupon,
              couponBaseSubtotal,
              type as CouponOrderType,
            );

          if (!couponResult.valid) {
            throw new Error(
              couponResult.error,
            );
          }

          appliedCouponCode =
            couponResult.code;

          couponDiscountAmount =
            couponResult.discountAmount;
        }

        const discountAmount =
          Math.round(
            (
              curatedSetDiscount +
              couponDiscountAmount
            ) * 100,
          ) / 100;

        /*
         * Minimum retail order uses
         * server-calculated merchandise
         * value before coupon discount.
         */
        if (
          type === "RETAIL" &&
          siteSettings.minimumRetailOrder >
            0 &&
          couponBaseSubtotal <
            siteSettings.minimumRetailOrder
        ) {
          throw new Error(
            `Minimum retail order is ₹${siteSettings.minimumRetailOrder.toLocaleString(
              "en-IN",
            )}.`,
          );
        }

        /*
         * 6. Delivery settings.
         *
         * Retail:
         * configurable charge + free threshold.
         *
         * Reseller / bulk:
         * either flat freight or actual freight
         * calculated after packing.
         */
        const deliverySettingRow =
          await tx.siteSetting.findUnique({
            where: {
              key: "delivery_settings_v1",
            },
          });

        const deliveryDefaults = {
          retailDeliveryCharge: 79,
          retailFreeDeliveryThreshold: 999,
          resellerDeliveryMode:
            "ACTUAL_FREIGHT",
          resellerFlatDeliveryCharge: 0,
          estimatedMinDays: 3,
          estimatedMaxDays: 7,
          restrictServiceability: false,
          allowedStates: [] as string[],
          allowedPincodes: [] as string[],
        };

        let deliverySettings =
          deliveryDefaults;

        if (deliverySettingRow) {
          try {
            const parsed =
              JSON.parse(
                deliverySettingRow.value,
              );

            deliverySettings = {
              ...deliveryDefaults,
              ...(parsed &&
              typeof parsed === "object"
                ? parsed
                : {}),
            };
          } catch {
            deliverySettings =
              deliveryDefaults;
          }
        }

        /*
         * Server-side serviceability check.
         * A matching state OR matching pincode
         * is enough when restriction is enabled.
         */
        if (
          deliverySettings.restrictServiceability
        ) {
          const normalizedState =
            String(
              address.state ?? "",
            )
              .trim()
              .toLowerCase();

          const normalizedPincode =
            String(
              address.pincode ?? "",
            ).trim();

          const allowedStates =
            Array.isArray(
              deliverySettings.allowedStates,
            )
              ? deliverySettings.allowedStates
                  .map((value: unknown) =>
                    String(value)
                      .trim()
                      .toLowerCase(),
                  )
                  .filter(Boolean)
              : [];

          const allowedPincodes =
            Array.isArray(
              deliverySettings.allowedPincodes,
            )
              ? deliverySettings.allowedPincodes
                  .map((value: unknown) =>
                    String(value).trim(),
                  )
                  .filter(Boolean)
              : [];

          const stateAllowed =
            allowedStates.includes(
              normalizedState,
            );

          const pincodeAllowed =
            allowedPincodes.includes(
              normalizedPincode,
            );

          if (
            !stateAllowed &&
            !pincodeAllowed
          ) {
            throw new Error(
              "Delivery is not available for this address.",
            );
          }
        }

        const safeDeliveryNumber = (
          value: unknown,
          fallback: number,
        ) => {
          const number =
            Number(value);

          return Number.isFinite(number) &&
            number >= 0
            ? number
            : fallback;
        };

        const isResellerDelivery =
          type === "RESELLER";

        const resellerActualFreight =
          isResellerDelivery &&
          deliverySettings.resellerDeliveryMode ===
            "ACTUAL_FREIGHT";

        const deliveryChargePending =
          resellerActualFreight;

        let deliveryCharge = 0;

        if (isResellerDelivery) {
          deliveryCharge =
            resellerActualFreight
              ? 0
              : safeDeliveryNumber(
                  deliverySettings.resellerFlatDeliveryCharge,
                  0,
                );
        } else {
          const retailCharge =
            safeDeliveryNumber(
              deliverySettings.retailDeliveryCharge,
              79,
            );

          const freeThreshold =
            safeDeliveryNumber(
              deliverySettings.retailFreeDeliveryThreshold,
              999,
            );

          deliveryCharge =
            couponBaseSubtotal >=
            freeThreshold
              ? 0
              : retailCharge;
        }

        const totalAmount =
          Math.max(
            0,
            Math.round(
              (
                couponBaseSubtotal -
                couponDiscountAmount +
                deliveryCharge
              ) * 100,
            ) / 100,
          );

        /*
         * 6. Generate order number.
         */
        let orderNumber =
          generateOrderNumber();

        /*
         * Extremely unlikely collision protection.
         */
        while (
          await tx.order.findUnique({
            where: {
              orderNumber,
            },
            select: {
              id: true,
            },
          })
        ) {
          orderNumber =
            generateOrderNumber();
        }

        /*
         * 6. Create order.
         */
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: user.id,
            addressId: address.id,
            type:
              type === "RESELLER"
                ? "RESELLER"
                : "RETAIL",
            status: "PENDING",
            paymentStatus: "PENDING",
            paymentMethod: "COD",
            subtotal,
            discountAmount,
            deliveryCharge,
            deliveryChargePending,
            totalAmount,
            couponCode:
              appliedCouponCode,
            items: {
              create: orderItems.map(
                (item) => ({
                  productId:
                    item.productId,
                  variantId:
                    item.variantId,
                  productName:
                    item.productName,
                  colorName:
                    item.colorName,
                  sizeName:
                    item.sizeName,
                  quantity:
                    item.quantity,
                  unitPrice:
                    item.unitPrice,
                  totalPrice:
                    item.totalPrice,
                }),
              ),
            },
          },
          include: {
            items: true,
          },
        });

        /*
         * 7. Safely reduce stock.
         *
         * WHERE stock >= quantity prevents
         * negative stock during simultaneous orders.
         */
        for (const item of orderItems) {
          const stockUpdate =
            await tx.productVariant.updateMany({
              where: {
                id: item.variantId,
                stock: {
                  gte: item.quantity,
                },
              },
              data: {
                stock: {
                  decrement:
                    item.quantity,
                },
              },
            });

          if (
            stockUpdate.count !== 1
          ) {
            throw new Error(
              `Stock changed for ${item.productName}. Please try again.`,
            );
          }
        }

        /*
         * Link curated-set orders through
         * the existing ResellerContent
         * relation.
         */
        if (resellerSet) {
          await tx.resellerContent.create({
            data: {
              userId: user.id,
              orderId: order.id,
              setId: resellerSet.id,
              title: resellerSet.name,
              description:
                `${resellerSetCount} × ${resellerSet.name}`,
            },
          });
        }

        /*
         * 9. Create pending COD payment record.
         */
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: "COD",
            amount: totalAmount,
            status: "PENDING",
          },
        });

        return {
          orderId: order.id,
          userId: user.id,
          orderNumber:
            order.orderNumber,
          subtotal,
          discountAmount,
          deliveryCharge,
          deliveryChargePending,
          totalAmount,
          couponCode:
            appliedCouponCode,
        };
      },
      {
        maxWait: 10000,
        timeout: 15000,
      },
    );

    const {
      userId: resultUserId,
      ...publicResult
    } = result;

    const response =
      NextResponse.json(
        {
          success: true,
          message:
            "Order placed successfully.",
          ...publicResult,
        },
        { status: 201 },
      );

    response.cookies.set(
      CUSTOMER_SESSION_COOKIE,
      createCustomerSessionToken(
        resultUserId,
      ),
      CUSTOMER_SESSION_OPTIONS,
    );

    return response;
  } catch (error) {
    console.error(
      "POST /api/orders failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to place order.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}

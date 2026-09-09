import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  verifyCustomerSessionToken,
} from "@/lib/customer-session";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Cart operation failed.";
}

async function getCustomerUserId() {
  const cookieStore =
    await cookies();

  const userId =
    verifyCustomerSessionToken(
      cookieStore.get(
        CUSTOMER_SESSION_COOKIE,
      )?.value,
    );

  if (!userId) {
    return null;
  }

  const user =
    await prisma.user.findFirst({
      where: {
        id: userId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

  return user?.id ?? null;
}

// GET /api/cart
export async function GET() {
  try {
    const userId =
      await getCustomerUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in to view your cart.",
        },
        { status: 401 },
      );
    }

    const cart = await prisma.cart.findUnique({
      where: {
        userId,
      },
      include: {
        items: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            product: {
              include: {
                media: {
                  where: {
                    isActive: true,
                  },
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
                category: true,
              },
            },
            variant: {
              include: {
                color: true,
                size: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({
        cart: null,
        items: [],
        count: 0,
      });
    }

    const items = cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,

      image:
        item.product.media.find(
          (media) => media.type === "IMAGE",
        )?.url ??
        item.product.media[0]?.url ??
        null,

      variantId: item.variantId,

      colorId: item.variant?.color?.id ?? "",
      colorName: item.variant?.color?.name ?? "",

      sizeId: item.variant?.size?.id ?? "",
      sizeName: item.variant?.size?.name ?? "",

      price: Number(item.unitPrice),
      quantity: item.quantity,
    }));

    const count = items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    return NextResponse.json({
      cart: {
        id: cart.id,
      },
      items,
      count,
    });
  } catch (error) {
    console.error("GET /api/cart failed:", error);

    return NextResponse.json(
      {
        error: "Failed to load cart.",
        details: errorMessage(error),
      },
      { status: 500 },
    );
  }
}

// POST /api/cart
export async function POST(request: NextRequest) {
  try {
    const userId =
      await getCustomerUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in to use your cart.",
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    const productId = String(body?.productId ?? "");
    const variantId =
      body?.variantId === null ||
      body?.variantId === undefined ||
      body?.variantId === ""
        ? null
        : String(body.variantId);

    const quantity = Number(body?.quantity ?? 1);

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "quantity must be a positive integer." },
        { status: 400 },
      );
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 },
      );
    }

    let unitPrice = Number(product.retailPrice);
    let stock: number | null = null;

    if (variantId) {
      const variant = product.variants.find(
        (item) => item.id === variantId,
      );

      if (!variant) {
        return NextResponse.json(
          { error: "Product variant not found." },
          { status: 404 },
        );
      }

      unitPrice = Number(variant.retailPrice);
      stock = variant.stock;

      if (stock <= 0) {
        return NextResponse.json(
          { error: "This variant is out of stock." },
          { status: 409 },
        );
      }
    }

    if (stock !== null && quantity > stock) {
      return NextResponse.json(
        {
          error: `Only ${stock} pieces available.`,
        },
        { status: 409 },
      );
    }

    const cart = await prisma.cart.upsert({
      where: {
        userId,
      },
      create: {
        userId,
      },
      update: {},
    });

    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId,
      },
    });

    if (existing) {
      const newQuantity = existing.quantity + quantity;

      if (
        stock !== null &&
        newQuantity > stock
      ) {
        return NextResponse.json(
          {
            error: `Only ${stock} pieces available. Current cart quantity is ${existing.quantity}.`,
          },
          { status: 409 },
        );
      }

      const updated = await prisma.cartItem.update({
        where: {
          id: existing.id,
        },
        data: {
          quantity: newQuantity,
          unitPrice,
        },
      });

      return NextResponse.json({
        success: true,
        alreadyExists: true,
        cartItem: {
          id: updated.id,
          productId: updated.productId,
          variantId: updated.variantId,
          quantity: updated.quantity,
          price: Number(updated.unitPrice),
        },
      });
    }

    const created = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        variantId,
        quantity,
        unitPrice,
      },
    });

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      cartItem: {
        id: created.id,
        productId: created.productId,
        variantId: created.variantId,
        quantity: created.quantity,
        price: Number(created.unitPrice),
      },
    });
  } catch (error) {
    console.error("POST /api/cart failed:", error);

    return NextResponse.json(
      {
        error: "Failed to add item to cart.",
        details: errorMessage(error),
      },
      { status: 500 },
    );
  }
}

// PATCH /api/cart
export async function PATCH(request: NextRequest) {
  try {
    const userId =
      await getCustomerUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in to update your cart.",
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    const itemId = String(body?.itemId ?? "");
    const quantity = Number(body?.quantity);

    if (!itemId) {
      return NextResponse.json(
        {
          error: "itemId is required.",
        },
        { status: 400 },
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        {
          error: "quantity must be at least 1.",
        },
        { status: 400 },
      );
    }

    const item = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
        },
      },
      include: {
        variant: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Cart item not found." },
        { status: 404 },
      );
    }

    if (
      item.variant &&
      quantity > item.variant.stock
    ) {
      return NextResponse.json(
        {
          error: `Only ${item.variant.stock} pieces available.`,
        },
        { status: 409 },
      );
    }

    const updated = await prisma.cartItem.update({
      where: {
        id: item.id,
      },
      data: {
        quantity,
      },
    });

    return NextResponse.json({
      success: true,
      cartItem: {
        id: updated.id,
        quantity: updated.quantity,
        price: Number(updated.unitPrice),
      },
    });
  } catch (error) {
    console.error("PATCH /api/cart failed:", error);

    return NextResponse.json(
      {
        error: "Failed to update cart item.",
        details: errorMessage(error),
      },
      { status: 500 },
    );
  }
}

// DELETE /api/cart
export async function DELETE(request: NextRequest) {
  try {
    const userId =
      await getCustomerUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in to update your cart.",
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    const itemId = body?.itemId
      ? String(body.itemId)
      : null;
    const clearAll = body?.clearAll === true;

    const cart = await prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      return NextResponse.json({
        success: true,
        removed: false,
      });
    }

    if (clearAll) {
      await prisma.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      return NextResponse.json({
        success: true,
        cleared: true,
      });
    }

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required." },
        { status: 400 },
      );
    }

    const result = await prisma.cartItem.deleteMany({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    return NextResponse.json({
      success: true,
      removed: result.count > 0,
      itemId,
    });
  } catch (error) {
    console.error("DELETE /api/cart failed:", error);

    return NextResponse.json(
      {
        error: "Failed to remove cart item.",
        details: errorMessage(error),
      },
      { status: 500 },
    );
  }
}

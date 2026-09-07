import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

/*
 * GET /api/wishlist?userId=USER_ID
 *
 * Returns all wishlist products for a user.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = cleanString(
      searchParams.get("userId"),
    );

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required." },
        { status: 400 },
      );
    }

    const items = await prisma.wishlistItem.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: {
          include: {
            category: true,
            media: {
              where: {
                isActive: true,
              },
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      wishlist: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        createdAt: item.createdAt,

        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          sku: item.product.sku,
          description: item.product.description,
          fabric: item.product.fabric,

          retailPrice: Number(
            item.product.retailPrice,
          ),

          resellerPrice:
            item.product.resellerPrice !== null
              ? Number(item.product.resellerPrice)
              : null,

          mrp:
            item.product.mrp !== null
              ? Number(item.product.mrp)
              : null,

          resellerMOQ:
            item.product.resellerMOQ,

          status: item.product.status,
          salesMode: item.product.salesMode,
          gender: item.product.gender,

          category: item.product.category
            ? {
                id: item.product.category.id,
                name: item.product.category.name,
                slug: item.product.category.slug,
              }
            : null,

          media: item.product.media.map(
            (media) => ({
              id: media.id,
              type: media.type,
              url: media.url,
              thumbnailUrl:
                media.thumbnailUrl,
              altText: media.altText,
            }),
          ),
        },
      })),
      count: items.length,
    });
  } catch (error) {
    console.error(
      "GET /api/wishlist failed:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to fetch wishlist.",
      },
      { status: 500 },
    );
  }
}

/*
 * POST /api/wishlist
 *
 * Body:
 * {
 *   "userId": "...",
 *   "productId": "..."
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userId = cleanString(body?.userId);
    const productId = cleanString(
      body?.productId,
    );

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required." },
        { status: 400 },
      );
    }

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 },
      );
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 },
      );
    }

    const existing =
      await prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        wishlistItem: {
          id: existing.id,
          userId: existing.userId,
          productId: existing.productId,
          createdAt: existing.createdAt,
        },
      });
    }

    const item =
      await prisma.wishlistItem.create({
        data: {
          userId,
          productId,
        },
      });

    return NextResponse.json(
      {
        success: true,
        alreadyExists: false,
        wishlistItem: {
          id: item.id,
          userId: item.userId,
          productId: item.productId,
          createdAt: item.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/wishlist failed:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to add product to wishlist.",
      },
      { status: 500 },
    );
  }
}

/*
 * DELETE /api/wishlist
 *
 * Body:
 * {
 *   "userId": "...",
 *   "productId": "..."
 * }
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const userId = cleanString(body?.userId);
    const productId = cleanString(
      body?.productId,
    );

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required." },
        { status: 400 },
      );
    }

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required." },
        { status: 400 },
      );
    }

    const existing =
      await prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: true,
          removed: false,
          message:
            "Product is not in wishlist.",
        },
      );
    }

    await prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      removed: true,
      productId,
    });
  } catch (error) {
    console.error(
      "DELETE /api/wishlist failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to remove product from wishlist.",
      },
      { status: 500 },
    );
  }
}

import {
  NextResponse,
} from "next/server";
import {
  prisma,
} from "@/lib/prisma";
import {
  getAuthenticatedCustomerId,
} from "@/lib/customer-auth";

function cleanString(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

/*
 * GET /api/wishlist
 *
 * Customer identity always comes
 * from the signed httpOnly cookie.
 */
export async function GET() {
  try {
    const userId =
      await getAuthenticatedCustomerId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in to view your wishlist.",
        },
        {
          status: 401,
        },
      );
    }

    const items =
      await prisma.wishlistItem.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        include: {
          product: {
            include: {
              category:
                true,

              media: {
                where: {
                  isActive:
                    true,
                },

                orderBy: {
                  sortOrder:
                    "asc",
                },
              },
            },
          },
        },
      });

    return NextResponse.json({
      success: true,

      wishlist:
        items.map(
          (item) => ({
            id:
              item.id,

            productId:
              item.productId,

            createdAt:
              item.createdAt,

            product: {
              id:
                item.product.id,

              name:
                item.product.name,

              slug:
                item.product.slug,

              sku:
                item.product.sku,

              description:
                item.product.description,

              fabric:
                item.product.fabric,

              retailPrice:
                Number(
                  item.product
                    .retailPrice,
                ),

              resellerPrice:
                item.product
                  .resellerPrice !==
                null
                  ? Number(
                      item.product
                        .resellerPrice,
                    )
                  : null,

              mrp:
                item.product.mrp !==
                null
                  ? Number(
                      item.product
                        .mrp,
                    )
                  : null,

              resellerMOQ:
                item.product
                  .resellerMOQ,

              status:
                item.product.status,

              salesMode:
                item.product
                  .salesMode,

              gender:
                item.product.gender,

              category:
                item.product
                  .category
                  ? {
                      id:
                        item.product
                          .category
                          .id,

                      name:
                        item.product
                          .category
                          .name,

                      slug:
                        item.product
                          .category
                          .slug,
                    }
                  : null,

              media:
                item.product.media.map(
                  (media) => ({
                    id:
                      media.id,

                    type:
                      media.type,

                    url:
                      media.url,

                    thumbnailUrl:
                      media.thumbnailUrl,

                    altText:
                      media.altText,
                  }),
                ),
            },
          }),
        ),

      count:
        items.length,
    });
  } catch (error) {
    console.error(
      "GET /api/wishlist failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch wishlist.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * POST /api/wishlist
 *
 * Body:
 * {
 *   "productId": "..."
 * }
 */
export async function POST(
  request: Request,
) {
  try {
    const userId =
      await getAuthenticatedCustomerId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in to use Wishlist.",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json();

    const productId =
      cleanString(
        body?.productId,
      );

    if (!productId) {
      return NextResponse.json(
        {
          error:
            "productId is required.",
        },
        {
          status: 400,
        },
      );
    }

    const user =
      await prisma.user.findFirst({
        where: {
          id: userId,
          status:
            "ACTIVE",
        },

        select: {
          id: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Customer session is no longer valid.",
        },
        {
          status: 401,
        },
      );
    }

    const product =
      await prisma.product.findFirst({
        where: {
          id: productId,
          status:
            "ACTIVE",
        },

        select: {
          id: true,
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          error:
            "Product not found.",
        },
        {
          status: 404,
        },
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
        alreadyExists:
          true,

        wishlistItem: {
          id:
            existing.id,

          productId:
            existing.productId,

          createdAt:
            existing.createdAt,
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
        alreadyExists:
          false,

        wishlistItem: {
          id:
            item.id,

          productId:
            item.productId,

          createdAt:
            item.createdAt,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/wishlist failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to add product to wishlist.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * DELETE /api/wishlist
 *
 * Body:
 * {
 *   "productId": "..."
 * }
 */
export async function DELETE(
  request: Request,
) {
  try {
    const userId =
      await getAuthenticatedCustomerId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in.",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json();

    const productId =
      cleanString(
        body?.productId,
      );

    if (!productId) {
      return NextResponse.json(
        {
          error:
            "productId is required.",
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await prisma.wishlistItem.deleteMany({
        where: {
          userId,
          productId,
        },
      });

    return NextResponse.json({
      success: true,

      removed:
        result.count === 1,

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
      {
        status: 500,
      },
    );
  }
}

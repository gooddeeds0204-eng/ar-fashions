import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      slug: string;
    }>;
  },
) {
  try {
    const { slug } = await params;

    const set =
      await prisma.resellerSet.findUnique({
        where: {
          slug,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sku: true,
                  status: true,
                  salesMode: true,
                  retailPrice: true,
                  resellerPrice: true,

                  media: {
                    where: {
                      isActive: true,
                    },
                    orderBy: {
                      sortOrder: "asc",
                    },
                    select: {
                      type: true,
                      url: true,
                    },
                  },

                  variants: {
                    where: {
                      isActive: true,
                    },
                    orderBy: {
                      createdAt: "asc",
                    },
                    include: {
                      color: true,
                      size: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (
      !set ||
      set.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          error:
            "Reseller set not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,

      set: {
        id: set.id,
        name: set.name,
        slug: set.slug,
        description:
          set.description,
        type: set.type,

        pieces: set.pieces,

        setPrice: Number(
          set.setPrice,
        ),

        perPiecePrice: Number(
          set.perPiecePrice,
        ),

        moq: set.moq,

        thumbnailUrl:
          set.thumbnailUrl,

        videoUrl:
          set.videoUrl,

        isFeatured:
          set.isFeatured,

        items: set.items.map(
          (item) => ({
            productId:
              item.productId,

            quantity:
              item.quantity,

            product: {
              id:
                item.product.id,

              name:
                item.product.name,

              slug:
                item.product.slug,

              sku:
                item.product.sku,

              status:
                item.product.status,

              salesMode:
                item.product
                  .salesMode,

              retailPrice:
                Number(
                  item.product
                    .retailPrice,
                ),

              resellerPrice:
                item.product
                  .resellerPrice ===
                null
                  ? null
                  : Number(
                      item.product
                        .resellerPrice,
                    ),

              image:
                item.product.media.find(
                  (media) =>
                    media.type ===
                    "IMAGE",
                )?.url ??
                item.product
                  .media[0]?.url ??
                null,

              variants:
                item.product.variants.map(
                  (variant) => ({
                    id: variant.id,
                    stock:
                      variant.stock,

                    retailPrice:
                      variant
                        .retailPrice ===
                      null
                        ? null
                        : Number(
                            variant
                              .retailPrice,
                          ),

                    resellerPrice:
                      variant
                        .resellerPrice ===
                      null
                        ? null
                        : Number(
                            variant
                              .resellerPrice,
                          ),

                    color: {
                      id:
                        variant.color.id,
                      name:
                        variant.color.name,
                    },

                    size: {
                      id:
                        variant.size.id,
                      name:
                        variant.size.name,
                    },
                  }),
                ),
            },
          }),
        ),
      },
    });
  } catch (error) {
    console.error(
      "GET /api/reseller-sets/[slug] failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load reseller set.",
      },
      {
        status: 500,
      },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sets =
      await prisma.resellerSet.findMany({
        where: {
          status: "ACTIVE",
        },
        orderBy: [
          {
            isFeatured: "desc",
          },
          {
            sortOrder: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
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
                    take: 1,
                    select: {
                      url: true,
                      type: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    return NextResponse.json({
      success: true,

      sets: sets.map((set) => ({
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

        sortOrder:
          set.sortOrder,

        items: set.items.map(
          (item) => ({
            productId:
              item.productId,

            quantity:
              item.quantity,

            unitPrice:
              Number(
                item.unitPrice,
              ),

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
                item.product
                  .media[0]?.url ??
                null,
            },
          }),
        ),
      })),
    });
  } catch (error) {
    console.error(
      "GET /api/reseller-sets failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load reseller sets.",
      },
      {
        status: 500,
      },
    );
  }
}

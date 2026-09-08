import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function cleanString(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function optionalString(value: unknown) {
  const valueString = cleanString(value);

  return valueString || null;
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value);

  return Number.isInteger(number) &&
    number >= 0
    ? number
    : null;
}

function serializeMedia(media: any) {
  return {
    id: media.id,
    productId: media.productId,
    type: media.type,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl,
    altText: media.altText,
    sortOrder: media.sortOrder,
    isActive: media.isActive,
    createdAt: media.createdAt,

    product: media.product
      ? {
          id: media.product.id,
          name: media.product.name,
          sku: media.product.sku,
          status: media.product.status,
          salesMode: media.product.salesMode,
          retailPrice: Number(
            media.product.retailPrice,
          ),
          resellerPrice:
            media.product.resellerPrice === null
              ? null
              : Number(
                  media.product.resellerPrice,
                ),
          image:
            media.product.media?.[0]?.url ??
            null,
        }
      : null,
  };
}

const videoInclude = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      status: true,
      salesMode: true,
      retailPrice: true,
      resellerPrice: true,

      media: {
        where: {
          type: "IMAGE" as const,
          isActive: true,
        },
        orderBy: {
          sortOrder: "asc" as const,
        },
        take: 1,
        select: {
          url: true,
        },
      },
    },
  },
};

export async function GET() {
  const auth = await requireAdmin();

  if (auth) {
    return auth;
  }

  try {
    const [videos, products] =
      await Promise.all([
        prisma.productMedia.findMany({
          where: {
            type: "VIDEO",
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
          include: videoInclude,
        }),

        prisma.product.findMany({
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
          select: {
            id: true,
            name: true,
            sku: true,
            status: true,
            salesMode: true,
            retailPrice: true,
            resellerPrice: true,

            media: {
              where: {
                type: "IMAGE",
                isActive: true,
              },
              orderBy: {
                sortOrder: "asc",
              },
              take: 1,
              select: {
                url: true,
              },
            },
          },
        }),
      ]);

    return NextResponse.json({
      success: true,

      videos:
        videos.map(
          serializeMedia,
        ),

      products:
        products.map(
          (product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            status: product.status,
            salesMode:
              product.salesMode,

            retailPrice:
              Number(
                product.retailPrice,
              ),

            resellerPrice:
              product.resellerPrice ===
              null
                ? null
                : Number(
                    product.resellerPrice,
                  ),

            image:
              product.media[0]?.url ??
              null,
          }),
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/admin/video-content failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load video content.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  const auth = await requireAdmin();

  if (auth) {
    return auth;
  }

  try {
    const body =
      await request.json();

    const productId =
      cleanString(
        body.productId,
      );

    const url =
      cleanString(
        body.url,
      );

    const thumbnailUrl =
      optionalString(
        body.thumbnailUrl,
      );

    const altText =
      optionalString(
        body.altText,
      );

    const sortOrder =
      nonNegativeInteger(
        body.sortOrder ?? 0,
      );

    if (!productId) {
      return NextResponse.json(
        {
          error:
            "Product is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!url) {
      return NextResponse.json(
        {
          error:
            "Video URL is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (sortOrder === null) {
      return NextResponse.json(
        {
          error:
            "Sort order must be 0 or greater.",
        },
        {
          status: 400,
        },
      );
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
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

    const media =
      await prisma.productMedia.create({
        data: {
          productId,
          type: "VIDEO",
          url,
          thumbnailUrl,
          altText,
          sortOrder,

          isActive:
            body.isActive !== false,
        },

        include:
          videoInclude,
      });

    return NextResponse.json(
      {
        success: true,
        video:
          serializeMedia(media),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/admin/video-content failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to create video content.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  const auth = await requireAdmin();

  if (auth) {
    return auth;
  }

  try {
    const body =
      await request.json();

    const id =
      cleanString(
        body.id,
      );

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Video id is required.",
        },
        {
          status: 400,
        },
      );
    }

    const existing =
      await prisma.productMedia.findFirst({
        where: {
          id,
          type: "VIDEO",
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Video content not found.",
        },
        {
          status: 404,
        },
      );
    }

    const data: {
      productId?: string;
      url?: string;
      thumbnailUrl?: string | null;
      altText?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    } = {};

    if (
      body.productId !==
      undefined
    ) {
      const productId =
        cleanString(
          body.productId,
        );

      if (!productId) {
        return NextResponse.json(
          {
            error:
              "Product is required.",
          },
          {
            status: 400,
          },
        );
      }

      const product =
        await prisma.product.findUnique({
          where: {
            id: productId,
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

      data.productId =
        productId;
    }

    if (
      body.url !==
      undefined
    ) {
      const url =
        cleanString(
          body.url,
        );

      if (!url) {
        return NextResponse.json(
          {
            error:
              "Video URL cannot be empty.",
          },
          {
            status: 400,
          },
        );
      }

      data.url = url;
    }

    if (
      body.thumbnailUrl !==
      undefined
    ) {
      data.thumbnailUrl =
        optionalString(
          body.thumbnailUrl,
        );
    }

    if (
      body.altText !==
      undefined
    ) {
      data.altText =
        optionalString(
          body.altText,
        );
    }

    if (
      body.sortOrder !==
      undefined
    ) {
      const sortOrder =
        nonNegativeInteger(
          body.sortOrder,
        );

      if (
        sortOrder ===
        null
      ) {
        return NextResponse.json(
          {
            error:
              "Sort order must be 0 or greater.",
          },
          {
            status: 400,
          },
        );
      }

      data.sortOrder =
        sortOrder;
    }

    if (
      body.isActive !==
      undefined
    ) {
      data.isActive =
        Boolean(
          body.isActive,
        );
    }

    const media =
      await prisma.productMedia.update({
        where: {
          id,
        },

        data,

        include:
          videoInclude,
      });

    return NextResponse.json({
      success: true,
      video:
        serializeMedia(media),
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/video-content failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update video content.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
) {
  const auth = await requireAdmin();

  if (auth) {
    return auth;
  }

  try {
    const body =
      await request.json();

    const id =
      cleanString(
        body.id,
      );

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Video id is required.",
        },
        {
          status: 400,
        },
      );
    }

    const existing =
      await prisma.productMedia.findFirst({
        where: {
          id,
          type: "VIDEO",
        },
        select: {
          id: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Video content not found.",
        },
        {
          status: 404,
        },
      );
    }

    await prisma.productMedia.update({
      where: {
        id,
      },

      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/video-content failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to remove video content.",
      },
      {
        status: 500,
      },
    );
  }
}

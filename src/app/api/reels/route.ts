import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function instagramEmbedUrl(value: string) {
  try {
    const url = new URL(value);

    const parts = url.pathname
      .split("/")
      .filter(Boolean);

    if (parts.length < 2) {
      return null;
    }

    const type = parts[0];
    const code = parts[1];

    if (
      type !== "reel" &&
      type !== "reels" &&
      type !== "p"
    ) {
      return null;
    }

    const embedType =
      type === "reels"
        ? "reel"
        : type;

    return `https://www.instagram.com/${embedType}/${code}/embed/`;
  } catch {
    return null;
  }
}

function isInstagramUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.hostname === "instagram.com" ||
      url.hostname.endsWith(".instagram.com")
    );
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const media =
      await prisma.productMedia.findMany({
        where: {
          type: "VIDEO",
          isActive: true,
          product: {
            status: "ACTIVE",
          },
        },

        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "desc",
          },
        ],

        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              slug: true,
              retailPrice: true,
              resellerPrice: true,
              salesMode: true,

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
          },
        },
      });

    const reels =
      media.map((item) => {
        const instagram =
          isInstagramUrl(item.url);

        return {
          id: item.id,
          url: item.url,
          thumbnailUrl:
            item.thumbnailUrl ??
            item.product.media[0]?.url ??
            null,
          caption:
            item.altText ??
            item.product.name,
          sortOrder:
            item.sortOrder,
          source:
            instagram
              ? "INSTAGRAM"
              : "UPLOAD",
          instagramEmbedUrl:
            instagram
              ? instagramEmbedUrl(
                  item.url,
                )
              : null,

          product: {
            id:
              item.product.id,
            name:
              item.product.name,
            sku:
              item.product.sku,
            slug:
              item.product.slug,
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
            salesMode:
              item.product
                .salesMode,
            image:
              item.product
                .media[0]?.url ??
              null,
          },
        };
      });

    return NextResponse.json({
      reels,
    });
  } catch (error) {
    console.error(
      "GET /api/reels failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load reels.",
      },
      {
        status: 500,
      },
    );
  }
}

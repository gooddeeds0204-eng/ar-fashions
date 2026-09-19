import {
  NextResponse,
} from "next/server";
import {
  prisma,
} from "@/lib/prisma";

function instagramEmbedUrl(
  value: string,
) {
  try {
    const url =
      new URL(value);

    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);

    if (
      parts.length < 2
    ) {
      return null;
    }

    const type =
      parts[0];

    const code =
      parts[1];

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

function isInstagramUrl(
  value: string,
) {
  try {
    const url =
      new URL(value);

    return (
      url.hostname ===
        "instagram.com" ||
      url.hostname.endsWith(
        ".instagram.com",
      )
    );
  } catch {
    return false;
  }
}

function decodeHtml(
  value: string,
) {
  return value
    .replaceAll(
      "&amp;",
      "&",
    )
    .replaceAll(
      "&quot;",
      '"',
    )
    .replaceAll(
      "&#39;",
      "'",
    )
    .replaceAll(
      "\\u0026",
      "&",
    )
    .replaceAll(
      "\\/",
      "/",
    );
}

function safeHttpsUrl(
  value: string | null,
) {
  if (!value) {
    return null;
  }

  try {
    const url =
      new URL(
        decodeHtml(
          value,
        ),
      );

    return url.protocol ===
      "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

async function resolveInstagramVideoUrl(
  value: string,
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      4000,
    );

  try {
    const response =
      await fetch(
        value,
        {
          cache:
            "no-store",
          redirect:
            "follow",
          signal:
            controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml",
          },
        },
      );

    if (!response.ok) {
      return null;
    }

    const html =
      await response.text();

    const metaPatterns = [
      /<meta[^>]+property=["']og:video:secure_url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video:secure_url["']/i,
      /<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video["']/i,
      /"video_url":"([^"]+)"/i,
      /"videoUrl":"([^"]+)"/i,
    ];

    for (
      const pattern of
      metaPatterns
    ) {
      const match =
        html.match(
          pattern,
        );

      const url =
        safeHttpsUrl(
          match?.[1] ??
            null,
        );

      if (url) {
        return url;
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

export async function GET() {
  try {
    const media =
      await prisma.productMedia.findMany({
        where: {
          type:
            "VIDEO",
          isActive:
            true,
          product: {
            status:
              "ACTIVE",
          },
        },

        orderBy: [
          {
            sortOrder:
              "asc",
          },
          {
            createdAt:
              "desc",
          },
        ],

        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              slug: true,
              retailPrice:
                true,
              resellerPrice:
                true,
              salesMode:
                true,

              media: {
                where: {
                  type:
                    "IMAGE",
                  isActive:
                    true,
                },
                orderBy: {
                  sortOrder:
                    "asc",
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
      await Promise.all(
        media.map(
          async (
            item,
          ) => {
            const instagram =
              isInstagramUrl(
                item.url,
              );

            const resolvedVideoUrl =
              instagram
                ? await resolveInstagramVideoUrl(
                    item.url,
                  )
                : null;

            return {
              id:
                item.id,
              url:
                item.url,
              thumbnailUrl:
                item.thumbnailUrl ??
                item.product
                  .media[0]
                  ?.url ??
                null,
              caption:
                item.altText ??
                item.product
                  .name,
              sortOrder:
                item.sortOrder,
              source:
                instagram
                  ? "INSTAGRAM"
                  : "UPLOAD",
              resolvedVideoUrl,
              instagramEmbedUrl:
                instagram
                  ? instagramEmbedUrl(
                      item.url,
                    )
                  : null,

              product: {
                id:
                  item.product
                    .id,
                name:
                  item.product
                    .name,
                sku:
                  item.product
                    .sku,
                slug:
                  item.product
                    .slug,
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
                    .media[0]
                    ?.url ??
                  null,
              },
            };
          },
        ),
      );

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

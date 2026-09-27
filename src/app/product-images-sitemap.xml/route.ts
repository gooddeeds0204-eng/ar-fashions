import { prisma } from "@/lib/prisma";

const BASE_URL =
  "https://www.asfashionsonline.com";

function escapeXml(
  value: string,
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const products =
    await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        media: {
          some: {
            isActive: true,
            type: "IMAGE",
          },
        },
      },
      select: {
        id: true,
        name: true,
        media: {
          where: {
            isActive: true,
            type: "IMAGE",
          },
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            url: true,
            altText: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

  const urls =
    products
      .map((product) => {
        const images =
          product.media
            .slice(0, 20)
            .map((image) => {
              const title =
                image.altText?.trim() ||
                `${product.name} - AS Fashions`;

              return `
      <image:image>
        <image:loc>${escapeXml(
          image.url,
        )}</image:loc>
        <image:title>${escapeXml(
          title,
        )}</image:title>
      </image:image>`;
            })
            .join("");

        return `
  <url>
    <loc>${BASE_URL}/products/${product.id}</loc>${images}
  </url>`;
      })
      .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type":
        "application/xml; charset=utf-8",
      "Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://ar-fashions.vercel.app");

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/reels",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/returns-refunds",
    "/shipping-policy",
    "/reseller-apply",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency:
      path === ""
        ? "daily"
        : "monthly",
    priority:
      path === ""
        ? 1
        : 0.6,
  }));

  try {
    const products =
      await prisma.product.findMany({
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

    return [
      ...staticRoutes,
      ...products.map((product) => ({
        url: `${baseUrl}/products/${product.id}`,
        lastModified:
          product.updatedAt,
        changeFrequency:
          "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}

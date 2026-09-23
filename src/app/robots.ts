import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://ar-fashions.vercel.app");

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/products/",
        "/reels",
        "/about",
        "/contact",
        "/privacy",
        "/terms",
        "/returns-refunds",
        "/shipping-policy",
        "/reseller-apply",
      ],
      disallow: [
        "/admin/",
        "/api/",
        "/account",
        "/addresses",
        "/cart",
        "/checkout",
        "/login",
        "/signup",
        "/my-orders",
        "/notifications",
        "/wishlist",
        "/reseller-dashboard",
        "/reseller-status",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://www.asfashionsonline.com";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

const getSeoProduct = cache(async (id: string) => {
  return prisma.product.findFirst({
    where: {
      id,
      status: "ACTIVE",
      deletedAt: null,
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
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
      variants: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          sku: true,
          stock: true,
          reservedStock: true,
          retailPrice: true,
          resellerPrice: true,
          color: {
            select: {
              name: true,
            },
          },
          size: {
            select: {
              name: true,
            },
          },
        },
      },
      reviews: {
        where: {
          status: "APPROVED",
        },
        select: {
          rating: true,
        },
      },
    },
  });
});

function cleanDescription(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildSeoDescription(product: {
  name: string;
  description: string | null;
  fabric: string | null;
  gender: string;
  category: { name: string };
}) {
  const base = product.description
    ? cleanDescription(product.description)
    : `Shop ${product.name} from AS Fashions Online. Explore ${product.category.name} for retail shopping and reseller orders.`;

  const extras = [
    product.fabric ? `${product.fabric} fabric` : null,
    product.gender !== "UNISEX"
      ? `${product.gender.toLowerCase()} fashion`
      : null,
  ].filter(Boolean);

  const combined =
    extras.length > 0 && base.length < 125
      ? `${base} ${extras.join(" · ")}.`
      : base;

  return combined.length > 160
    ? `${combined.slice(0, 157).trimEnd()}...`
    : combined;
}

function averageRating(ratings: number[]) {
  if (ratings.length === 0) {
    return null;
  }

  const total = ratings.reduce(
    (sum, value) => sum + value,
    0,
  );

  return Number(
    (total / ratings.length).toFixed(1),
  );
}

export async function generateMetadata(
  { params }: Omit<Props, "children">,
): Promise<Metadata> {
  const { id } = await params;

  try {
    const product = await getSeoProduct(id);

    if (!product) {
      return {
        title: "Product | AS Fashions Online",
        robots: {
          index: false,
          follow: true,
        },
      };
    }

    const title = `${product.name} | AS Fashions Online`;
    const description = buildSeoDescription(product);
    const canonical =
      `${BASE_URL}/products/${product.id}`;

    const images = product.media
      .slice(0, 4)
      .map((item) => ({
        url: item.url,
        alt:
          item.altText?.trim() ||
          `${product.name} - AS Fashions Online`,
      }));

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: "AS Fashions",
        type: "website",
        locale: "en_IN",
        images:
          images.length > 0
            ? images
            : undefined,
      },
      twitter: {
        card:
          images.length > 0
            ? "summary_large_image"
            : "summary",
        title,
        description,
        images:
          images.length > 0
            ? images.map((item) => item.url)
            : undefined,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      },
      other: {
        "product:price:amount": String(
          Number(product.retailPrice),
        ),
        "product:price:currency": "INR",
      },
    };
  } catch {
    return {
      title: "AS Fashions Online",
      description:
        "Shop fashion online from AS Fashions for retail and reseller customers.",
    };
  }
}

export default async function ProductLayout({
  children,
  params,
}: Props) {
  const { id } = await params;

  let product:
    | Awaited<ReturnType<typeof getSeoProduct>>
    | null = null;

  try {
    product = await getSeoProduct(id);
  } catch {
    product = null;
  }

  if (!product) {
    return children;
  }

  const canonical =
    `${BASE_URL}/products/${product.id}`;

  const description =
    buildSeoDescription(product);

  const images =
    product.media.map(
      (item) => item.url,
    );

  const rating = averageRating(
    product.reviews.map(
      (review) => review.rating,
    ),
  );

  const ratingData =
    rating !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount:
              product.reviews.length,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {};

  const activeVariants =
    product.variants;

  const productSchema =
    activeVariants.length > 0
      ? {
          "@type": "ProductGroup",
          "@id": `${canonical}#product-group`,
          name: product.name,
          description,
          url: canonical,
          productGroupID:
            product.sku ||
            product.id,
          category:
            product.category.name,
          image:
            images.length > 0
              ? images
              : undefined,
          brand: {
            "@type": "Brand",
            name: "AS Fashions",
          },
          variesBy: [
            "https://schema.org/color",
            "https://schema.org/size",
          ],
          ...ratingData,
          hasVariant:
            activeVariants.map(
              (variant) => {
                const availableStock =
                  Math.max(
                    0,
                    variant.stock -
                      variant.reservedStock,
                  );

                const price = Number(
                  variant.retailPrice ??
                    product.retailPrice,
                );

                const variantName =
                  `${product.name} - ${variant.color.name} - ${variant.size.name}`;

                return {
                  "@type": "Product",
                  "@id":
                    `${canonical}#variant-${variant.id}`,
                  name: variantName,
                  sku:
                    variant.sku ||
                    product.sku ||
                    undefined,
                  color:
                    variant.color.name,
                  size:
                    variant.size.name,
                  image:
                    images.length > 0
                      ? images
                      : undefined,
                  brand: {
                    "@type": "Brand",
                    name: "AS Fashions",
                  },
                  isVariantOf: {
                    "@id":
                      `${canonical}#product-group`,
                  },
                  offers: {
                    "@type": "Offer",
                    url: canonical,
                    priceCurrency:
                      "INR",
                    price,
                    availability:
                      availableStock > 0
                        ? "https://schema.org/InStock"
                        : "https://schema.org/OutOfStock",
                    itemCondition:
                      "https://schema.org/NewCondition",
                    seller: {
                      "@id":
                        `${BASE_URL}/#organization`,
                    },
                  },
                };
              },
            ),
        }
      : {
          "@type": "Product",
          "@id": `${canonical}#product`,
          name: product.name,
          description,
          url: canonical,
          sku:
            product.sku ||
            undefined,
          category:
            product.category.name,
          image:
            images.length > 0
              ? images
              : undefined,
          brand: {
            "@type": "Brand",
            name: "AS Fashions",
          },
          ...ratingData,
          offers: {
            "@type": "Offer",
            url: canonical,
            priceCurrency: "INR",
            price: Number(
              product.retailPrice,
            ),
            availability:
              "https://schema.org/InStock",
            itemCondition:
              "https://schema.org/NewCondition",
            seller: {
              "@id":
                `${BASE_URL}/#organization`,
            },
          },
        };

  const jsonLd = {
    "@context":
      "https://schema.org",
    "@graph": [
      productSchema,
      {
        "@type": "WebPage",
        "@id":
          `${canonical}#webpage`,
        url: canonical,
        name:
          `${product.name} | AS Fashions Online`,
        description,
        isPartOf: {
          "@id":
            `${BASE_URL}/#website`,
        },
        about: {
          "@id":
            activeVariants.length > 0
              ? `${canonical}#product-group`
              : `${canonical}#product`,
        },
        breadcrumb: {
          "@id":
            `${canonical}#breadcrumb`,
        },
        primaryImageOfPage:
          images[0]
            ? {
                "@type":
                  "ImageObject",
                url: images[0],
                contentUrl:
                  images[0],
                caption:
                  product.media[0]
                    ?.altText?.trim() ||
                  product.name,
              }
            : undefined,
      },
      {
        "@type":
          "BreadcrumbList",
        "@id":
          `${canonical}#breadcrumb`,
        itemListElement: [
          {
            "@type":
              "ListItem",
            position: 1,
            name: "AS Fashions",
            item: BASE_URL,
          },
          {
            "@type":
              "ListItem",
            position: 2,
            name:
              product.category.name,
          },
          {
            "@type":
              "ListItem",
            position: 3,
            name: product.name,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              jsonLd,
            ),
        }}
      />
      {children}
    </>
  );
}

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://www.asfashionsonline.com";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Omit<Props, "children">,
): Promise<Metadata> {
  const { id } = await params;

  try {
    const product = await prisma.product.findFirst({
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
          take: 1,
        },
      },
    });

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
    const description =
      product.description?.trim() ||
      `Shop ${product.name} from AS Fashions Online. Explore ${product.category.name} for retail and reseller customers.`;

    const canonical =
      `${BASE_URL}/products/${product.id}`;

    const image =
      product.media[0]?.url;

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
        images: image
          ? [
              {
                url: image,
                alt: product.name,
              },
            ]
          : undefined,
      },
      twitter: {
        card: image
          ? "summary_large_image"
          : "summary",
        title,
        description,
        images: image
          ? [image]
          : undefined,
      },
      robots: {
        index: true,
        follow: true,
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

  let product: Awaited<
    ReturnType<typeof prisma.product.findFirst>
  > & {
    category?: { name: string } | null;
    media?: Array<{ url: string }>;
  } | null = null;

  try {
    product = await prisma.product.findFirst({
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
          take: 1,
        },
      },
    });
  } catch {
    product = null;
  }

  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description:
          product.description ||
          `${product.name} from AS Fashions Online`,
        category:
          product.category?.name,
        sku: product.sku || undefined,
        image:
          product.media?.[0]?.url
            ? [product.media[0].url]
            : undefined,
        brand: {
          "@type": "Brand",
          name: "AS Fashions",
        },
        offers: {
          "@type": "Offer",
          url: `${BASE_URL}/products/${product.id}`,
          priceCurrency: "INR",
          price: Number(product.retailPrice),
          availability:
            product.status === "ACTIVE"
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          seller: {
            "@type": "Organization",
            name: "AS Fashions",
          },
        },
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      ) : null}
      {children}
    </>
  );
}

import "server-only";

import { prisma } from "@/lib/prisma";

const CLEANUP_MARKER =
  "catalog_test_cleanup_2026_10_22_v2";

const TEST_ONLY_PRODUCT_NAMES = [
  "STEP 11 Final Variant SKU Test",
  "Icy Aurora Tulle Dress",
  "Baggy Jeans",
  "Premium Rayon Kurti",
] as const;

let cleanupPromise: Promise<void> | null =
  null;

export async function ensureTestCatalogCleanup() {
  if (cleanupPromise) {
    return cleanupPromise;
  }

  cleanupPromise = (async () => {
    const marker =
      await prisma.siteSetting.findUnique({
        where: {
          key: CLEANUP_MARKER,
        },
      });

    if (marker?.value === "done") {
      return;
    }

    const products =
      await prisma.product.findMany({
        where: {
          name: {
            in: [
              ...TEST_ONLY_PRODUCT_NAMES,
            ],
          },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
      });

    await prisma.$transaction(
      async (tx) => {
        for (const product of products) {
          await tx.productVariant.updateMany({
            where: {
              productId:
                product.id,
            },
            data: {
              isActive:
                false,
            },
          });

          await tx.productMedia.updateMany({
            where: {
              productId:
                product.id,
            },
            data: {
              isActive:
                false,
            },
          });

          await tx.product.update({
            where: {
              id: product.id,
            },
            data: {
              deletedAt:
                new Date(),
              status:
                "INACTIVE",
              isFeatured:
                false,
              isTrending:
                false,
              isNewArrival:
                false,
            },
          });
        }

        await tx.siteSetting.upsert({
          where: {
            key:
              CLEANUP_MARKER,
          },
          update: {
            value:
              "done",
          },
          create: {
            key:
              CLEANUP_MARKER,
            value:
              "done",
          },
        });
      },
    );
  })().catch((error) => {
    cleanupPromise = null;
    throw error;
  });

  return cleanupPromise;
}

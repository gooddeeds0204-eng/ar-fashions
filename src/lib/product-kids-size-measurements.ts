import "server-only";

import { prisma } from "@/lib/prisma";

export type ProductKidsSizeMeasurement = {
  productId: string;
  sizeId: string;
  chestIn: string | null;
  waistIn: string | null;
  garmentLengthIn: string | null;
};

let setupPromise: Promise<void> | null = null;

export async function ensureProductKidsSizeMeasurementStorage() {
  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProductKidsSizeMeasurement" (
        "productId" TEXT NOT NULL,
        "sizeId" TEXT NOT NULL,
        "chestIn" TEXT,
        "waistIn" TEXT,
        "garmentLengthIn" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProductKidsSizeMeasurement_pkey"
          PRIMARY KEY ("productId", "sizeId"),
        CONSTRAINT "ProductKidsSizeMeasurement_productId_fkey"
          FOREIGN KEY ("productId") REFERENCES "Product"("id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ProductKidsSizeMeasurement_sizeId_fkey"
          FOREIGN KEY ("sizeId") REFERENCES "Size"("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "ProductKidsSizeMeasurement_productId_idx" ON "ProductKidsSizeMeasurement"("productId")',
    );

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "ProductKidsSizeMeasurement_sizeId_idx" ON "ProductKidsSizeMeasurement"("sizeId")',
    );
  })().catch((error) => {
    setupPromise = null;
    throw error;
  });

  return setupPromise;
}

export async function getProductKidsSizeMeasurements(
  productId: string,
) {
  await ensureProductKidsSizeMeasurementStorage();

  return prisma.$queryRawUnsafe<ProductKidsSizeMeasurement[]>(
    `
      SELECT
        "productId",
        "sizeId",
        "chestIn",
        "waistIn",
        "garmentLengthIn"
      FROM "ProductKidsSizeMeasurement"
      WHERE "productId" = $1
      ORDER BY "createdAt" ASC
    `,
    productId,
  );
}

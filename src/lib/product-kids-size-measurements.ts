import "server-only";

import { prisma } from "@/lib/prisma";

export type ProductKidsSizeMeasurement = {
  productId: string;
  sizeId: string;
  chestIn: string | null;
  waistIn: string | null;
  hipIn: string | null;
  shoulderIn: string | null;
  armholeIn: string | null;
  sleeveLengthIn: string | null;
  topLengthIn: string | null;
  garmentLengthIn: string | null;
  bottomWaistMinIn: string | null;
  bottomWaistMaxIn: string | null;
  bottomLengthIn: string | null;
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
        "hipIn" TEXT,
        "shoulderIn" TEXT,
        "armholeIn" TEXT,
        "sleeveLengthIn" TEXT,
        "topLengthIn" TEXT,
        "garmentLengthIn" TEXT,
        "bottomWaistMinIn" TEXT,
        "bottomWaistMaxIn" TEXT,
        "bottomLengthIn" TEXT,
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

    for (const sql of [
      'ALTER TABLE "ProductKidsSizeMeasurement" ADD COLUMN IF NOT EXISTS "hipIn" TEXT',
      'ALTER TABLE "ProductKidsSizeMeasurement" ADD COLUMN IF NOT EXISTS "shoulderIn" TEXT',
      'ALTER TABLE "ProductKidsSizeMeasurement" ADD COLUMN IF NOT EXISTS "armholeIn" TEXT',
      'ALTER TABLE "ProductKidsSizeMeasurement" ADD COLUMN IF NOT EXISTS "sleeveLengthIn" TEXT',
      'ALTER TABLE "ProductKidsSizeMeasurement" ADD COLUMN IF NOT EXISTS "topLengthIn" TEXT',
      'ALTER TABLE "ProductKidsSizeMeasurement" ADD COLUMN IF NOT EXISTS "bottomWaistMinIn" TEXT',
      'ALTER TABLE "ProductKidsSizeMeasurement" ADD COLUMN IF NOT EXISTS "bottomWaistMaxIn" TEXT',
      'ALTER TABLE "ProductKidsSizeMeasurement" ADD COLUMN IF NOT EXISTS "bottomLengthIn" TEXT',
    ]) {
      await prisma.$executeRawUnsafe(sql);
    }

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
        "hipIn",
        "shoulderIn",
        "armholeIn",
        "sleeveLengthIn",
        "topLengthIn",
        "garmentLengthIn",
        "bottomWaistMinIn",
        "bottomWaistMaxIn",
        "bottomLengthIn"
      FROM "ProductKidsSizeMeasurement"
      WHERE "productId" = $1
      ORDER BY "createdAt" ASC
    `,
    productId,
  );
}

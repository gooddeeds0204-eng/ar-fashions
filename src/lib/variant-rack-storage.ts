import "server-only";

import { prisma } from "@/lib/prisma";

let setupPromise: Promise<void> | null =
  null;

export async function ensureVariantRackStorage() {
  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ProductVariant"
      ADD COLUMN IF NOT EXISTS "storageWarehouse" TEXT,
      ADD COLUMN IF NOT EXISTS "storageRack" TEXT,
      ADD COLUMN IF NOT EXISTS "storageShelf" TEXT,
      ADD COLUMN IF NOT EXISTS "storageBin" TEXT,
      ADD COLUMN IF NOT EXISTS "storageNote" TEXT
    `);

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "ProductVariant_storageWarehouse_storageRack_idx" ON "ProductVariant"("storageWarehouse", "storageRack")',
    );
  })().catch((error) => {
    setupPromise = null;
    throw error;
  });

  return setupPromise;
}

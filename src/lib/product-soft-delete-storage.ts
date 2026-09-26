import "server-only";

import { prisma } from "@/lib/prisma";

let setupPromise: Promise<void> | null = null;

export async function ensureProductSoftDeleteStorage() {
  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)',
    );

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "Product_deletedAt_idx" ON "Product"("deletedAt")',
    );
  })().catch((error) => {
    setupPromise = null;
    throw error;
  });

  return setupPromise;
}

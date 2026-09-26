import "server-only";

import { prisma } from "@/lib/prisma";

let setupPromise: Promise<void> | null = null;

export async function ensureOrderLocationStorage() {
  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLatitude" DOUBLE PRECISION',
    );

    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLongitude" DOUBLE PRECISION',
    );

    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLocationAccuracy" DOUBLE PRECISION',
    );

    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLocationCapturedAt" TIMESTAMP(3)',
    );
  })().catch((error) => {
    setupPromise = null;
    throw error;
  });

  return setupPromise;
}

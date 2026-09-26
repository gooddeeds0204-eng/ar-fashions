import "server-only";

import { prisma } from "@/lib/prisma";

let setupPromise: Promise<void> | null = null;

export async function ensureKidsSizeGuideStorage() {
  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    await prisma.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "KidsSizeGuide" (' +
        '"sizeId" TEXT NOT NULL,' +
        '"ageGuide" TEXT,' +
        '"heightCm" TEXT,' +
        '"chestIn" TEXT,' +
        '"waistIn" TEXT,' +
        '"hipIn" TEXT,' +
        '"garmentLengthIn" TEXT,' +
        '"fitNote" TEXT,' +
        '"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
        '"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
        'CONSTRAINT "KidsSizeGuide_pkey" PRIMARY KEY ("sizeId"),' +
        'CONSTRAINT "KidsSizeGuide_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE CASCADE ON UPDATE CASCADE' +
      ')',
    );
  })().catch((error) => {
    setupPromise = null;
    throw error;
  });

  return setupPromise;
}

export function hasKidsSizeGuideValues(body: Record<string, unknown>) {
  return [
    body.ageGuide,
    body.heightCm,
    body.chestIn,
    body.waistIn,
    body.hipIn,
    body.garmentLengthIn,
    body.fitNote,
  ].some(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "",
  );
}

export function kidsSizeGuideData(body: Record<string, unknown>) {
  const optionalText = (value: unknown) => {
    if (value === undefined || value === null) {
      return null;
    }

    const text = String(value).trim();
    return text || null;
  };

  return {
    ageGuide: optionalText(body.ageGuide),
    heightCm: optionalText(body.heightCm),
    chestIn: optionalText(body.chestIn),
    waistIn: optionalText(body.waistIn),
    hipIn: optionalText(body.hipIn),
    garmentLengthIn: optionalText(body.garmentLengthIn),
    fitNote: optionalText(body.fitNote),
  };
}

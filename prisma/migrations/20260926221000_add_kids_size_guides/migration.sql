CREATE TABLE IF NOT EXISTS "KidsSizeGuide" (
  "sizeId" TEXT NOT NULL,
  "ageGuide" TEXT,
  "heightCm" TEXT,
  "chestIn" TEXT,
  "waistIn" TEXT,
  "hipIn" TEXT,
  "garmentLengthIn" TEXT,
  "fitNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KidsSizeGuide_pkey" PRIMARY KEY ("sizeId"),
  CONSTRAINT "KidsSizeGuide_sizeId_fkey"
    FOREIGN KEY ("sizeId") REFERENCES "Size"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

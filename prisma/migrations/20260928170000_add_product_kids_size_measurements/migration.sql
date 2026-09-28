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
);

CREATE INDEX IF NOT EXISTS "ProductKidsSizeMeasurement_productId_idx"
  ON "ProductKidsSizeMeasurement"("productId");

CREATE INDEX IF NOT EXISTS "ProductKidsSizeMeasurement_sizeId_idx"
  ON "ProductKidsSizeMeasurement"("sizeId");

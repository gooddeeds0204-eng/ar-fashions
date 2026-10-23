-- A product can map a numeric garment size to its own age range.
-- Existing size labels, SKUs, orders and stock remain unchanged.
ALTER TABLE "ProductKidsSizeMeasurement"
  ADD COLUMN IF NOT EXISTS "ageGuide" TEXT;

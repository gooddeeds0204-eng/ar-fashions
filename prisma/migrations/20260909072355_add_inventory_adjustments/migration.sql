-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "adjustment" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryAdjustment_variantId_idx" ON "InventoryAdjustment"("variantId");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_createdAt_idx" ON "InventoryAdjustment"("createdAt");

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

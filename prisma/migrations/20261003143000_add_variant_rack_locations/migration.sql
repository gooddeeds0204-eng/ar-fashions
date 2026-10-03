ALTER TABLE "ProductVariant"
ADD COLUMN "storageWarehouse" TEXT,
ADD COLUMN "storageRack" TEXT,
ADD COLUMN "storageShelf" TEXT,
ADD COLUMN "storageBin" TEXT,
ADD COLUMN "storageNote" TEXT;

CREATE INDEX "ProductVariant_storageWarehouse_storageRack_idx"
ON "ProductVariant"("storageWarehouse", "storageRack");

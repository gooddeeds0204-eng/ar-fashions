-- CreateEnum
CREATE TYPE "ProductSalesMode" AS ENUM ('RETAIL', 'BULK', 'BOTH');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "salesMode" "ProductSalesMode" NOT NULL DEFAULT 'BOTH';

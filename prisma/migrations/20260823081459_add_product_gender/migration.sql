-- CreateEnum
CREATE TYPE "ProductGender" AS ENUM ('WOMEN', 'MEN', 'KIDS', 'UNISEX');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "gender" "ProductGender" NOT NULL DEFAULT 'UNISEX';

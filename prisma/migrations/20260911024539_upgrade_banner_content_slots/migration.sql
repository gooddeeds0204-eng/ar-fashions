-- CreateEnum
CREATE TYPE "BannerPlacement" AS ENUM ('HOME_HERO', 'HOME_MIDDLE', 'HOME_BOTTOM', 'SHOP_TOP', 'RESELLER_TOP');

-- CreateEnum
CREATE TYPE "BannerContentType" AS ENUM ('IMAGE', 'VIDEO', 'GRAPHIC');

-- CreateEnum
CREATE TYPE "BannerAudience" AS ENUM ('ALL', 'RETAIL', 'RESELLER');

-- CreateEnum
CREATE TYPE "BannerTextAlign" AS ENUM ('LEFT', 'CENTER', 'RIGHT');

-- AlterTable
ALTER TABLE "Banner" ADD COLUMN     "audience" "BannerAudience" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "backgroundColor" TEXT,
ADD COLUMN     "backgroundGradient" TEXT,
ADD COLUMN     "contentType" "BannerContentType" NOT NULL DEFAULT 'IMAGE',
ADD COLUMN     "mobileImageUrl" TEXT,
ADD COLUMN     "mobileVideoUrl" TEXT,
ADD COLUMN     "overlayOpacity" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN     "placement" "BannerPlacement" NOT NULL DEFAULT 'HOME_HERO',
ADD COLUMN     "textAlign" "BannerTextAlign" NOT NULL DEFAULT 'LEFT',
ADD COLUMN     "textColor" TEXT;

-- CreateIndex
CREATE INDEX "Banner_placement_audience_isActive_sortOrder_idx" ON "Banner"("placement", "audience", "isActive", "sortOrder");

-- Additive campaign-offer foundation.
-- Existing products, users, orders, inventory and historical rows are not modified.

CREATE TYPE "CampaignReferralStatus" AS ENUM ('CLICKED', 'QUALIFIED', 'REJECTED');
CREATE TYPE "CampaignClaimStatus" AS ENUM ('PENDING', 'CLAIMED', 'CANCELLED');

CREATE TABLE "OfferCampaign" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "announcementText" TEXT,
  "badgeText" TEXT NOT NULL DEFAULT 'FREE DROP',
  "buttonText" TEXT NOT NULL DEFAULT 'Unlock Now',
  "productId" TEXT NOT NULL,
  "variantIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requiredReferrals" INTEGER NOT NULL DEFAULT 5,
  "whatsappShareRequired" BOOLEAN NOT NULL DEFAULT true,
  "whatsappGroupJoinRequired" BOOLEAN NOT NULL DEFAULT false,
  "whatsappGroupUrl" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "showCountdown" BOOLEAN NOT NULL DEFAULT true,
  "maxClaims" INTEGER,
  "oneClaimPerCustomer" BOOLEAN NOT NULL DEFAULT true,
  "deliveryChargeEnabled" BOOLEAN NOT NULL DEFAULT false,
  "useStoreDeliveryRules" BOOLEAN NOT NULL DEFAULT false,
  "fixedDeliveryCharge" DECIMAL(10,2),
  "codAllowed" BOOLEAN NOT NULL DEFAULT true,
  "onlinePaymentAllowed" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfferCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignReferral" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "referredUserId" TEXT,
  "referralCode" TEXT NOT NULL,
  "visitorKeyHash" TEXT,
  "status" "CampaignReferralStatus" NOT NULL DEFAULT 'CLICKED',
  "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "qualifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignReferral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignClaim" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "variantId" TEXT,
  "orderId" TEXT,
  "status" "CampaignClaimStatus" NOT NULL DEFAULT 'PENDING',
  "groupJoinAcknowledged" BOOLEAN NOT NULL DEFAULT false,
  "claimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfferCampaign_productId_idx" ON "OfferCampaign"("productId");
CREATE INDEX "OfferCampaign_isActive_isArchived_idx" ON "OfferCampaign"("isActive", "isArchived");
CREATE INDEX "OfferCampaign_startsAt_endsAt_idx" ON "OfferCampaign"("startsAt", "endsAt");
CREATE UNIQUE INDEX "CampaignReferral_referralCode_key" ON "CampaignReferral"("referralCode");
CREATE UNIQUE INDEX "CampaignReferral_campaignId_referrerId_key" ON "CampaignReferral"("campaignId", "referrerId");
CREATE UNIQUE INDEX "CampaignReferral_campaignId_referredUserId_key" ON "CampaignReferral"("campaignId", "referredUserId");
CREATE UNIQUE INDEX "CampaignReferral_campaignId_visitorKeyHash_key" ON "CampaignReferral"("campaignId", "visitorKeyHash");
CREATE INDEX "CampaignReferral_campaignId_status_idx" ON "CampaignReferral"("campaignId", "status");
CREATE INDEX "CampaignReferral_referrerId_idx" ON "CampaignReferral"("referrerId");
CREATE UNIQUE INDEX "CampaignClaim_orderId_key" ON "CampaignClaim"("orderId");
CREATE UNIQUE INDEX "CampaignClaim_campaignId_userId_key" ON "CampaignClaim"("campaignId", "userId");
CREATE INDEX "CampaignClaim_campaignId_status_idx" ON "CampaignClaim"("campaignId", "status");
CREATE INDEX "CampaignClaim_userId_idx" ON "CampaignClaim"("userId");

ALTER TABLE "OfferCampaign"
  ADD CONSTRAINT "OfferCampaign_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CampaignReferral"
  ADD CONSTRAINT "CampaignReferral_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "OfferCampaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignReferral"
  ADD CONSTRAINT "CampaignReferral_referrerId_fkey"
  FOREIGN KEY ("referrerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignReferral"
  ADD CONSTRAINT "CampaignReferral_referredUserId_fkey"
  FOREIGN KEY ("referredUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CampaignClaim"
  ADD CONSTRAINT "CampaignClaim_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "OfferCampaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignClaim"
  ADD CONSTRAINT "CampaignClaim_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

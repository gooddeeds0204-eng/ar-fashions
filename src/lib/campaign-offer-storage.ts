import "server-only";

import { prisma } from "@/lib/prisma";

let setupPromise: Promise<void> | null = null;

export async function ensureCampaignReferralVisitStorage() {
  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    await prisma.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "CampaignReferralVisit" (' +
        '"id" TEXT NOT NULL,' +
        '"campaignId" TEXT NOT NULL,' +
        '"referralId" TEXT NOT NULL,' +
        '"visitorKeyHash" TEXT NOT NULL,' +
        '"referredUserId" TEXT,' +
        '"status" "CampaignReferralStatus" NOT NULL DEFAULT \'QUALIFIED\',' +
        '"clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
        '"qualifiedAt" TIMESTAMP(3),' +
        '"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
        '"updatedAt" TIMESTAMP(3) NOT NULL,' +
        'CONSTRAINT "CampaignReferralVisit_pkey" PRIMARY KEY ("id"),' +
        'CONSTRAINT "CampaignReferralVisit_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OfferCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,' +
        'CONSTRAINT "CampaignReferralVisit_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "CampaignReferral"("id") ON DELETE CASCADE ON UPDATE CASCADE,' +
        'CONSTRAINT "CampaignReferralVisit_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE' +
      ')',
    );

    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "CampaignReferralVisit_campaignId_visitorKeyHash_key" ON "CampaignReferralVisit"("campaignId", "visitorKeyHash")',
    );

    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "CampaignReferralVisit_campaignId_referredUserId_key" ON "CampaignReferralVisit"("campaignId", "referredUserId")',
    );

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "CampaignReferralVisit_referralId_status_idx" ON "CampaignReferralVisit"("referralId", "status")',
    );

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "CampaignReferralVisit_campaignId_status_idx" ON "CampaignReferralVisit"("campaignId", "status")',
    );
  })().catch((error) => {
    setupPromise = null;
    throw error;
  });

  return setupPromise;
}

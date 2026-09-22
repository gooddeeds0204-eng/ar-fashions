import { createHmac, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_OPTIONS,
  createCustomerSessionToken,
} from "@/lib/customer-session";
import {
  enforcePublicRateLimit,
  requireSameOriginJson,
} from "@/lib/public-write-security";
import { ensureCampaignReferralVisitStorage } from "@/lib/campaign-offer-storage";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function campaignStatus(
  startsAt: Date,
  endsAt: Date,
  claimedCount: number,
  maxClaims: number | null,
) {
  const now = Date.now();

  if (maxClaims !== null && claimedCount >= maxClaims) {
    return "SOLD_OUT" as const;
  }

  if (now < startsAt.getTime()) {
    return "SCHEDULED" as const;
  }

  if (now > endsAt.getTime()) {
    return "ENDED" as const;
  }

  return "LIVE" as const;
}

function campaignFingerprint(request: Request) {
  const secret = process.env.AR_FASHIONS_SESSION_SECRET;

  if (!secret) {
    throw new Error("Campaign security secret is not configured.");
  }

  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const address = forwarded.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";

  return createHmac("sha256", secret)
    .update("campaign-visitor:" + address + ":" + agent)
    .digest("base64url");
}

async function loadPublicCampaign() {
  const now = new Date();

  const candidates = await prisma.offerCampaign.findMany({
    where: {
      isActive: true,
      isArchived: false,
      endsAt: {
        gt: now,
      },
    },
    orderBy: {
      startsAt: "asc",
    },
    take: 10,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          retailPrice: true,
          mrp: true,
          media: {
            where: {
              isActive: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
            select: {
              id: true,
              type: true,
              url: true,
              thumbnailUrl: true,
              altText: true,
            },
          },
          variants: {
            where: {
              isActive: true,
              stock: {
                gt: 0,
              },
            },
            include: {
              color: {
                select: {
                  id: true,
                  name: true,
                },
              },
              size: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  const activeCandidates = candidates.filter(
    (item) => item.product.status === "ACTIVE",
  );

  const campaign =
    activeCandidates.find(
      (item) => item.startsAt.getTime() <= now.getTime(),
    ) ??
    activeCandidates[0] ??
    null;

  if (!campaign) {
    return null;
  }

  const claimedCount = await prisma.campaignClaim.count({
    where: {
      campaignId: campaign.id,
      status: "CLAIMED",
    },
  });

  const eligibleVariants =
    campaign.variantIds.length > 0
      ? campaign.product.variants.filter((variant) =>
          campaign.variantIds.includes(variant.id),
        )
      : campaign.product.variants;

  return {
    campaign,
    claimedCount,
    eligibleVariants,
  };
}

export async function GET() {
  try {
    await ensureCampaignReferralVisitStorage();

    const loaded = await loadPublicCampaign();

    if (!loaded) {
      return NextResponse.json({
        success: true,
        campaign: null,
      });
    }

    const {
      campaign,
      claimedCount,
      eligibleVariants,
    } = loaded;

    const user = await getAuthenticatedCustomer();

    let referralCode: string | null = null;
    let qualifiedReferrals = 0;
    let groupJoinAcknowledged = false;
    let alreadyClaimed = false;
    let claimInProgress = false;

    if (user) {
      const referral = await prisma.campaignReferral.findUnique({
        where: {
          campaignId_referrerId: {
            campaignId: campaign.id,
            referrerId: user.id,
          },
        },
        select: {
          id: true,
          referralCode: true,
        },
      });

      if (referral) {
        referralCode = referral.referralCode;

        qualifiedReferrals =
          await prisma.campaignReferralVisit.count({
            where: {
              referralId: referral.id,
              status: "QUALIFIED",
            },
          });
      }

      const claim = await prisma.campaignClaim.findUnique({
        where: {
          campaignId_userId: {
            campaignId: campaign.id,
            userId: user.id,
          },
        },
        select: {
          groupJoinAcknowledged: true,
          status: true,
          orderId: true,
        },
      });

      groupJoinAcknowledged =
        claim?.groupJoinAcknowledged === true;

      alreadyClaimed =
        claim?.status ===
        "CLAIMED";

      claimInProgress =
        claim?.status ===
          "PENDING" &&
        Boolean(
          claim.orderId,
        );
    }

    const status = campaignStatus(
      campaign.startsAt,
      campaign.endsAt,
      claimedCount,
      campaign.maxClaims,
    );

    const referralsComplete =
      qualifiedReferrals >= campaign.requiredReferrals;

    const groupComplete =
      !campaign.whatsappGroupJoinRequired ||
      groupJoinAcknowledged;

    const availableStock = eligibleVariants.reduce(
      (total, variant) =>
        total + Math.max(0, variant.stock),
      0,
    );

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        subtitle: campaign.subtitle,
        announcementText: campaign.announcementText,
        badgeText: campaign.badgeText,
        buttonText: campaign.buttonText,
        requiredReferrals: campaign.requiredReferrals,
        whatsappShareRequired: campaign.whatsappShareRequired,
        whatsappGroupJoinRequired:
          campaign.whatsappGroupJoinRequired,
        whatsappGroupUrl: campaign.whatsappGroupUrl,
        startsAt: campaign.startsAt.toISOString(),
        endsAt: campaign.endsAt.toISOString(),
        showCountdown: campaign.showCountdown,
        maxClaims: campaign.maxClaims,
        claimedCount,
        deliveryChargeEnabled:
          campaign.deliveryChargeEnabled,
        useStoreDeliveryRules:
          campaign.useStoreDeliveryRules,
        fixedDeliveryCharge:
          campaign.fixedDeliveryCharge === null
            ? null
            : Number(campaign.fixedDeliveryCharge),
        codAllowed: campaign.codAllowed,
        onlinePaymentAllowed:
          campaign.onlinePaymentAllowed,
        status,
        availableStock,
        product: {
          id: campaign.product.id,
          name: campaign.product.name,
          slug: campaign.product.slug,
          retailPrice: Number(campaign.product.retailPrice),
          mrp:
            campaign.product.mrp === null
              ? null
              : Number(campaign.product.mrp),
          media: campaign.product.media,
          variants: eligibleVariants.map((variant) => ({
            id: variant.id,
            stock: variant.stock,
            color: variant.color,
            size: variant.size,
          })),
        },
        progress: {
          loggedIn: Boolean(user),
          referralCode,
          qualifiedReferrals,
          requiredReferrals: campaign.requiredReferrals,
          groupJoinAcknowledged,
          referralsComplete,
          groupComplete,
          alreadyClaimed,
          claimInProgress,
          unlocked:
            Boolean(user) &&
            status === "LIVE" &&
            referralsComplete &&
            groupComplete &&
            !alreadyClaimed &&
            !claimInProgress &&
            availableStock > 0,
        },
      },
    });
  } catch (error) {
    console.error("GET public campaign offer failed:", error);

    return NextResponse.json(
      {
        error: "Failed to load the current offer.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  const securityError = requireSameOriginJson(request);

  if (securityError) {
    return securityError;
  }

  const rateLimitError = await enforcePublicRateLimit(
    request,
    {
      scope: "campaign-offer",
      limit: 40,
      windowSeconds: 60,
    },
  );

  if (rateLimitError) {
    return rateLimitError;
  }

  try {
    await ensureCampaignReferralVisitStorage();

    const body =
      (await request.json()) as Record<string, unknown>;

    const action = cleanString(body.action);

    if (action === "visit") {
      const referralCode = cleanString(body.referralCode);

      if (!referralCode) {
        return NextResponse.json(
          {
            error: "Referral code is required.",
          },
          {
            status: 400,
          },
        );
      }

      const referral = await prisma.campaignReferral.findUnique({
        where: {
          referralCode,
        },
        include: {
          campaign: true,
        },
      });

      if (
        !referral ||
        !referral.campaign.isActive ||
        referral.campaign.isArchived
      ) {
        return NextResponse.json({
          success: true,
          counted: false,
        });
      }

      const now = new Date();

      if (
        now < referral.campaign.startsAt ||
        now > referral.campaign.endsAt
      ) {
        return NextResponse.json({
          success: true,
          counted: false,
        });
      }

      const user = await getAuthenticatedCustomer();

      if (user?.id === referral.referrerId) {
        return NextResponse.json({
          success: true,
          counted: false,
          reason: "SELF_REFERRAL",
        });
      }

      if (user) {
        const userVisit =
          await prisma.campaignReferralVisit.findFirst({
            where: {
              campaignId: referral.campaignId,
              referredUserId: user.id,
            },
            select: {
              id: true,
            },
          });

        if (userVisit) {
          return NextResponse.json({
            success: true,
            counted: false,
            reason: "ALREADY_COUNTED",
          });
        }
      }

      const visitorKeyHash = campaignFingerprint(request);

      const existingVisit =
        await prisma.campaignReferralVisit.findUnique({
          where: {
            campaignId_visitorKeyHash: {
              campaignId: referral.campaignId,
              visitorKeyHash,
            },
          },
          select: {
            id: true,
          },
        });

      if (existingVisit) {
        return NextResponse.json({
          success: true,
          counted: false,
          reason: "ALREADY_COUNTED",
        });
      }

      try {
        await prisma.campaignReferralVisit.create({
          data: {
            campaignId: referral.campaignId,
            referralId: referral.id,
            visitorKeyHash,
            referredUserId: user?.id ?? null,
            status: "QUALIFIED",
            qualifiedAt: now,
          },
        });
      } catch {
        return NextResponse.json({
          success: true,
          counted: false,
          reason: "ALREADY_COUNTED",
        });
      }

      return NextResponse.json({
        success: true,
        counted: true,
      });
    }

    const campaignId = cleanString(body.campaignId);

    if (!campaignId) {
      return NextResponse.json(
        {
          error: "Campaign ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const campaign = await prisma.offerCampaign.findUnique({
      where: {
        id: campaignId,
      },
    });

    if (
      !campaign ||
      !campaign.isActive ||
      campaign.isArchived
    ) {
      return NextResponse.json(
        {
          error: "This campaign is not available.",
        },
        {
          status: 404,
        },
      );
    }

    const now = new Date();

    if (now < campaign.startsAt || now > campaign.endsAt) {
      return NextResponse.json(
        {
          error: "This campaign is not open right now.",
        },
        {
          status: 409,
        },
      );
    }

    let user = await getAuthenticatedCustomer();
    let guestSessionUserId: string | null = null;

    if (
      !user &&
      (action === "share" || action === "group-ack")
    ) {
      user = await prisma.user.create({
        data: {
          role: "CUSTOMER",
          status: "ACTIVE",
          isReseller: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isReseller: true,
        },
      });

      guestSessionUserId = user.id;
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Customer session is required for this campaign action.",
        },
        {
          status: 401,
        },
      );
    }

    if (action === "share") {
      let referral = await prisma.campaignReferral.findUnique({
        where: {
          campaignId_referrerId: {
            campaignId,
            referrerId: user.id,
          },
        },
        select: {
          id: true,
          referralCode: true,
        },
      });

      if (!referral) {
        for (
          let attempt = 0;
          attempt < 4 && !referral;
          attempt += 1
        ) {
          const referralCode =
            randomBytes(18).toString("base64url");

          try {
            referral = await prisma.campaignReferral.create({
              data: {
                campaignId,
                referrerId: user.id,
                referralCode,
                status: "CLICKED",
              },
              select: {
                id: true,
                referralCode: true,
              },
            });
          } catch {
            referral = null;
          }
        }
      }

      if (!referral) {
        throw new Error("Unable to create referral link.");
      }

      const response = NextResponse.json({
        success: true,
        referralCode: referral.referralCode,
      });

      if (guestSessionUserId) {
        response.cookies.set(
          CUSTOMER_SESSION_COOKIE,
          createCustomerSessionToken(guestSessionUserId),
          CUSTOMER_SESSION_OPTIONS,
        );
      }

      return response;
    }

    if (action === "group-ack") {
      if (!campaign.whatsappGroupJoinRequired) {
        return NextResponse.json({
          success: true,
          acknowledged: true,
        });
      }

      await prisma.campaignClaim.upsert({
        where: {
          campaignId_userId: {
            campaignId,
            userId: user.id,
          },
        },
        create: {
          campaignId,
          userId: user.id,
          status: "PENDING",
          groupJoinAcknowledged: true,
        },
        update: {
          groupJoinAcknowledged: true,
        },
      });

      const response = NextResponse.json({
        success: true,
        acknowledged: true,
      });

      if (guestSessionUserId) {
        response.cookies.set(
          CUSTOMER_SESSION_COOKIE,
          createCustomerSessionToken(guestSessionUserId),
          CUSTOMER_SESSION_OPTIONS,
        );
      }

      return response;
    }

    return NextResponse.json(
      {
        error: "Unsupported campaign action.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error("POST public campaign offer failed:", error);

    return NextResponse.json(
      {
        error: "Campaign action failed. Please try again.",
      },
      {
        status: 500,
      },
    );
  }
}

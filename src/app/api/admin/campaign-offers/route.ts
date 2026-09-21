import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function optionalString(value: unknown) {
  const valueString = cleanString(value);
  return valueString || null;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.map((item) => cleanString(item)).filter(Boolean),
    ),
  );
}

function positiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalPositiveInt(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
}

function optionalMoney(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

function parseDate(value: unknown) {
  const raw = cleanString(value);
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function readPayload(body: Record<string, unknown>) {
  const title = cleanString(body.title);
  const productId = cleanString(body.productId);
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  const maxClaims = optionalPositiveInt(body.maxClaims);
  const deliveryChargeEnabled = body.deliveryChargeEnabled === true;
  const useStoreDeliveryRules =
    deliveryChargeEnabled && body.useStoreDeliveryRules === true;
  const fixedDeliveryCharge = deliveryChargeEnabled
    ? optionalMoney(body.fixedDeliveryCharge)
    : null;
  const whatsappGroupJoinRequired =
    body.whatsappGroupJoinRequired === true;
  const whatsappGroupUrl = optionalString(body.whatsappGroupUrl);

  if (!title) return { error: "Campaign title is required." };
  if (!productId) return { error: "Select a campaign product." };
  if (!startsAt || !endsAt) {
    return { error: "Valid start and end date/time are required." };
  }
  if (endsAt <= startsAt) {
    return { error: "End date/time must be after start date/time." };
  }
  if (Number.isNaN(maxClaims)) {
    return { error: "Maximum claims must be a positive whole number." };
  }
  if (whatsappGroupJoinRequired && !whatsappGroupUrl) {
    return { error: "WhatsApp group link is required." };
  }
  if (
    deliveryChargeEnabled &&
    !useStoreDeliveryRules &&
    (fixedDeliveryCharge === null || Number.isNaN(fixedDeliveryCharge))
  ) {
    return { error: "Enter a valid fixed delivery charge." };
  }

  return {
    data: {
      title,
      subtitle: optionalString(body.subtitle),
      announcementText: optionalString(body.announcementText),
      badgeText: cleanString(body.badgeText) || "FREE DROP",
      buttonText: cleanString(body.buttonText) || "Unlock Now",
      productId,
      variantIds: stringArray(body.variantIds),
      requiredReferrals: positiveInt(body.requiredReferrals, 5),
      whatsappShareRequired: body.whatsappShareRequired !== false,
      whatsappGroupJoinRequired,
      whatsappGroupUrl,
      startsAt,
      endsAt,
      showCountdown: body.showCountdown !== false,
      maxClaims,
      oneClaimPerCustomer: body.oneClaimPerCustomer !== false,
      deliveryChargeEnabled,
      useStoreDeliveryRules,
      fixedDeliveryCharge:
        deliveryChargeEnabled && !useStoreDeliveryRules
          ? fixedDeliveryCharge
          : null,
      codAllowed: body.codAllowed !== false,
      onlinePaymentAllowed: body.onlinePaymentAllowed !== false,
      isActive: body.isActive !== false,
    },
  };
}

async function validateProductVariants(
  productId: string,
  variantIds: string[],
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!product) {
    return { ok: false as const, error: "Selected product was not found." };
  }

  if (variantIds.length === 0) return { ok: true as const };

  const count = await prisma.productVariant.count({
    where: {
      id: { in: variantIds },
      productId,
      isActive: true,
    },
  });

  if (count !== variantIds.length) {
    return {
      ok: false as const,
      error: "One or more selected variants are invalid.",
    };
  }

  return { ok: true as const };
}

export async function GET() {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    const [campaigns, products] = await Promise.all([
      prisma.offerCampaign.findMany({
        orderBy: [{ isArchived: "asc" }, { createdAt: "desc" }],
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              retailPrice: true,
              media: {
                where: { isActive: true },
                orderBy: { sortOrder: "asc" },
                take: 1,
                select: { url: true, type: true },
              },
            },
          },
          _count: {
            select: {
              referrals: { where: { status: "QUALIFIED" } },
              claims: { where: { status: "CLAIMED" } },
            },
          },
        },
      }),
      prisma.product.findMany({
        where: { status: { not: "INACTIVE" } },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          status: true,
          retailPrice: true,
          media: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true, type: true },
          },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              stock: true,
              color: { select: { name: true } },
              size: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      campaigns: campaigns.map((campaign) => ({
        ...campaign,
        fixedDeliveryCharge:
          campaign.fixedDeliveryCharge === null
            ? null
            : Number(campaign.fixedDeliveryCharge),
        product: {
          ...campaign.product,
          retailPrice: Number(campaign.product.retailPrice),
        },
        qualifiedReferralCount: campaign._count.referrals,
        claimedCount: campaign._count.claims,
      })),
      products: products.map((product) => ({
        ...product,
        retailPrice: Number(product.retailPrice),
      })),
    });
  } catch (error) {
    console.error("GET admin campaign offers failed:", error);
    return NextResponse.json(
      { error: "Failed to load campaign offers." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = readPayload(body);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const validation = await validateProductVariants(
      parsed.data.productId,
      parsed.data.variantIds,
    );

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const campaign = await prisma.offerCampaign.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("POST admin campaign offer failed:", error);
    return NextResponse.json(
      { error: "Failed to create campaign offer." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = cleanString(body.id);

    if (!id) {
      return NextResponse.json(
        { error: "Campaign ID is required." },
        { status: 400 },
      );
    }

    const existing = await prisma.offerCampaign.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    if (body.archive === true) {
      const campaign = await prisma.offerCampaign.update({
        where: { id },
        data: { isArchived: true, isActive: false },
      });

      return NextResponse.json({
        success: true,
        campaign,
        message: "Campaign archived successfully.",
      });
    }

    const parsed = readPayload(body);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const validation = await validateProductVariants(
      parsed.data.productId,
      parsed.data.variantIds,
    );

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const campaign = await prisma.offerCampaign.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("PATCH admin campaign offer failed:", error);
    return NextResponse.json(
      { error: "Failed to update campaign offer." },
      { status: 500 },
    );
  }
}

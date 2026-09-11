import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type BannerPlacement =
  | "HOME_HERO"
  | "HOME_MIDDLE"
  | "HOME_BOTTOM"
  | "SHOP_TOP"
  | "RESELLER_TOP";

type BannerAudience =
  | "ALL"
  | "RETAIL"
  | "RESELLER";

const validPlacements: BannerPlacement[] = [
  "HOME_HERO",
  "HOME_MIDDLE",
  "HOME_BOTTOM",
  "SHOP_TOP",
  "RESELLER_TOP",
];

const validAudiences: BannerAudience[] = [
  "ALL",
  "RETAIL",
  "RESELLER",
];

export async function GET(
  request: Request,
) {
  try {
    const url = new URL(request.url);

    const requestedPlacement =
      (
        url.searchParams.get(
          "placement",
        ) ?? "HOME_HERO"
      ).toUpperCase();

    const requestedAudience =
      (
        url.searchParams.get(
          "audience",
        ) ?? "ALL"
      ).toUpperCase();

    if (
      !validPlacements.includes(
        requestedPlacement as BannerPlacement,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid banner placement.",
        },
        { status: 400 },
      );
    }

    if (
      !validAudiences.includes(
        requestedAudience as BannerAudience,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid banner audience.",
        },
        { status: 400 },
      );
    }

    const placement =
      requestedPlacement as BannerPlacement;

    const audience =
      requestedAudience as BannerAudience;

    /*
     * Targeted requests receive both:
     * - banners meant for everybody
     * - banners meant specifically for that audience
     *
     * ALL receives only truly global banners.
     */
    const audienceFilter: BannerAudience[] =
      audience === "ALL"
        ? ["ALL"]
        : ["ALL", audience];

    const now = new Date();

    const banners =
      await prisma.banner.findMany({
        where: {
          placement,
          audience: {
            in: audienceFilter,
          },
          isActive: true,
          AND: [
            {
              OR: [
                { startsAt: null },
                {
                  startsAt: {
                    lte: now,
                  },
                },
              ],
            },
            {
              OR: [
                { expiresAt: null },
                {
                  expiresAt: {
                    gte: now,
                  },
                },
              ],
            },
          ],
        },
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          title: true,
          subtitle: true,

          imageUrl: true,
          videoUrl: true,
          mobileImageUrl: true,
          mobileVideoUrl: true,

          buttonText: true,
          buttonUrl: true,

          placement: true,
          contentType: true,
          audience: true,

          backgroundColor: true,
          backgroundGradient: true,
          textColor: true,
          textAlign: true,
          overlayOpacity: true,

          sortOrder: true,
        },
      });

    return NextResponse.json({
      success: true,
      placement,
      audience,
      banners,
    });
  } catch (error) {
    console.error(
      "GET public banners failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load banners.",
      },
      { status: 500 },
    );
  }
}

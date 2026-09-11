import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type BannerPlacement =
  | "HOME_HERO"
  | "HOME_MIDDLE"
  | "HOME_BOTTOM"
  | "SHOP_TOP"
  | "RESELLER_TOP";

type BannerContentType =
  | "IMAGE"
  | "VIDEO"
  | "GRAPHIC";

type BannerAudience =
  | "ALL"
  | "RETAIL"
  | "RESELLER";

type BannerTextAlign =
  | "LEFT"
  | "CENTER"
  | "RIGHT";

const placements: BannerPlacement[] = [
  "HOME_HERO",
  "HOME_MIDDLE",
  "HOME_BOTTOM",
  "SHOP_TOP",
  "RESELLER_TOP",
];

const contentTypes: BannerContentType[] = [
  "IMAGE",
  "VIDEO",
  "GRAPHIC",
];

const audiences: BannerAudience[] = [
  "ALL",
  "RETAIL",
  "RESELLER",
];

const textAlignments: BannerTextAlign[] = [
  "LEFT",
  "CENTER",
  "RIGHT",
];

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function optionalString(value: unknown) {
  return cleanString(value) || null;
}

function optionalDate(value: unknown) {
  const raw = cleanString(value);

  if (!raw) {
    return null;
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

function creativeError(input: {
  contentType: BannerContentType;
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  mobileImageUrl: string | null;
  mobileVideoUrl: string | null;
}) {
  if (
    input.contentType === "IMAGE" &&
    !input.imageUrl &&
    !input.mobileImageUrl
  ) {
    return "Image banner requires a desktop or mobile image.";
  }

  if (
    input.contentType === "VIDEO" &&
    !input.videoUrl &&
    !input.mobileVideoUrl
  ) {
    return "Video banner requires a desktop or mobile video.";
  }

  if (
    input.contentType === "GRAPHIC" &&
    !input.title &&
    !input.subtitle
  ) {
    return "Graphic banner requires a title or subtitle.";
  }

  return null;
}

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const banners =
      await prisma.banner.findMany({
        orderBy: [
          {
            placement: "asc",
          },
          {
            sortOrder: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    return NextResponse.json({
      success: true,
      banners,
    });
  } catch (error) {
    console.error(
      "GET admin banners failed:",
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

export async function POST(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const title =
      optionalString(body.title);

    const subtitle =
      optionalString(body.subtitle);

    const imageUrl =
      optionalString(body.imageUrl);

    const videoUrl =
      optionalString(body.videoUrl);

    const mobileImageUrl =
      optionalString(
        body.mobileImageUrl,
      );

    const mobileVideoUrl =
      optionalString(
        body.mobileVideoUrl,
      );

    const buttonText =
      optionalString(
        body.buttonText,
      );

    const buttonUrl =
      optionalString(
        body.buttonUrl,
      );

    const placementRaw =
      (
        cleanString(
          body.placement,
        ) || "HOME_HERO"
      ).toUpperCase();

    if (
      !placements.includes(
        placementRaw as BannerPlacement,
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

    /*
     * Backward compatibility:
     * old admin form did not send
     * contentType.
     */
    const requestedContentType =
      cleanString(
        body.contentType,
      ).toUpperCase();

    let contentType:
      BannerContentType;

    if (!requestedContentType) {
      contentType =
        videoUrl && !imageUrl
          ? "VIDEO"
          : "IMAGE";
    } else if (
      contentTypes.includes(
        requestedContentType as BannerContentType,
      )
    ) {
      contentType =
        requestedContentType as BannerContentType;
    } else {
      return NextResponse.json(
        {
          error:
            "Invalid banner content type.",
        },
        { status: 400 },
      );
    }

    const audienceRaw =
      (
        cleanString(
          body.audience,
        ) || "ALL"
      ).toUpperCase();

    if (
      !audiences.includes(
        audienceRaw as BannerAudience,
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

    const textAlignRaw =
      (
        cleanString(
          body.textAlign,
        ) || "LEFT"
      ).toUpperCase();

    if (
      !textAlignments.includes(
        textAlignRaw as BannerTextAlign,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid text alignment.",
        },
        { status: 400 },
      );
    }

    const sortOrder =
      Number(
        body.sortOrder ?? 0,
      );

    if (
      !Number.isInteger(
        sortOrder,
      ) ||
      sortOrder < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Sort order must be 0 or greater.",
        },
        { status: 400 },
      );
    }

    const overlayOpacity =
      body.overlayOpacity ===
      undefined
        ? 40
        : Number(
            body.overlayOpacity,
          );

    if (
      !Number.isInteger(
        overlayOpacity,
      ) ||
      overlayOpacity < 0 ||
      overlayOpacity > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Overlay opacity must be between 0 and 100.",
        },
        { status: 400 },
      );
    }

    const startsAt =
      optionalDate(
        body.startsAt,
      );

    const expiresAt =
      optionalDate(
        body.expiresAt,
      );

    if (
      startsAt === undefined ||
      expiresAt === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid banner date.",
        },
        { status: 400 },
      );
    }

    if (
      startsAt &&
      expiresAt &&
      expiresAt <= startsAt
    ) {
      return NextResponse.json(
        {
          error:
            "Expiry must be after start date.",
        },
        { status: 400 },
      );
    }

    const validationError =
      creativeError({
        contentType,
        title,
        subtitle,
        imageUrl,
        videoUrl,
        mobileImageUrl,
        mobileVideoUrl,
      });

    if (validationError) {
      return NextResponse.json(
        {
          error:
            validationError,
        },
        { status: 400 },
      );
    }

    const banner =
      await prisma.banner.create({
        data: {
          title,
          subtitle,

          imageUrl,
          videoUrl,
          mobileImageUrl,
          mobileVideoUrl,

          buttonText,
          buttonUrl,

          placement:
            placementRaw as BannerPlacement,

          contentType,

          audience:
            audienceRaw as BannerAudience,

          backgroundColor:
            optionalString(
              body.backgroundColor,
            ),

          backgroundGradient:
            optionalString(
              body.backgroundGradient,
            ),

          textColor:
            optionalString(
              body.textColor,
            ),

          textAlign:
            textAlignRaw as BannerTextAlign,

          overlayOpacity,

          isActive:
            body.isActive !==
            false,

          sortOrder,
          startsAt,
          expiresAt,
        },
      });

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error(
      "POST admin banner failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to create banner.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const id =
      cleanString(body.id);

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Banner ID is required.",
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.banner.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Banner not found.",
        },
        { status: 404 },
      );
    }

    const data: {
      title?: string | null;
      subtitle?: string | null;

      imageUrl?: string | null;
      videoUrl?: string | null;
      mobileImageUrl?: string | null;
      mobileVideoUrl?: string | null;

      buttonText?: string | null;
      buttonUrl?: string | null;

      placement?: BannerPlacement;
      contentType?: BannerContentType;
      audience?: BannerAudience;

      backgroundColor?: string | null;
      backgroundGradient?: string | null;
      textColor?: string | null;
      textAlign?: BannerTextAlign;
      overlayOpacity?: number;

      isActive?: boolean;
      sortOrder?: number;

      startsAt?: Date | null;
      expiresAt?: Date | null;
    } = {};

    if (
      body.title !== undefined
    ) {
      data.title =
        optionalString(
          body.title,
        );
    }

    if (
      body.subtitle !==
      undefined
    ) {
      data.subtitle =
        optionalString(
          body.subtitle,
        );
    }

    if (
      body.imageUrl !==
      undefined
    ) {
      data.imageUrl =
        optionalString(
          body.imageUrl,
        );
    }

    if (
      body.videoUrl !==
      undefined
    ) {
      data.videoUrl =
        optionalString(
          body.videoUrl,
        );
    }

    if (
      body.mobileImageUrl !==
      undefined
    ) {
      data.mobileImageUrl =
        optionalString(
          body.mobileImageUrl,
        );
    }

    if (
      body.mobileVideoUrl !==
      undefined
    ) {
      data.mobileVideoUrl =
        optionalString(
          body.mobileVideoUrl,
        );
    }

    if (
      body.buttonText !==
      undefined
    ) {
      data.buttonText =
        optionalString(
          body.buttonText,
        );
    }

    if (
      body.buttonUrl !==
      undefined
    ) {
      data.buttonUrl =
        optionalString(
          body.buttonUrl,
        );
    }

    if (
      body.backgroundColor !==
      undefined
    ) {
      data.backgroundColor =
        optionalString(
          body.backgroundColor,
        );
    }

    if (
      body.backgroundGradient !==
      undefined
    ) {
      data.backgroundGradient =
        optionalString(
          body.backgroundGradient,
        );
    }

    if (
      body.textColor !==
      undefined
    ) {
      data.textColor =
        optionalString(
          body.textColor,
        );
    }

    if (
      body.placement !==
      undefined
    ) {
      const value =
        cleanString(
          body.placement,
        ).toUpperCase();

      if (
        !placements.includes(
          value as BannerPlacement,
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

      data.placement =
        value as BannerPlacement;
    }

    if (
      body.contentType !==
      undefined
    ) {
      const value =
        cleanString(
          body.contentType,
        ).toUpperCase();

      if (
        !contentTypes.includes(
          value as BannerContentType,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid banner content type.",
          },
          { status: 400 },
        );
      }

      data.contentType =
        value as BannerContentType;
    }

    if (
      body.audience !==
      undefined
    ) {
      const value =
        cleanString(
          body.audience,
        ).toUpperCase();

      if (
        !audiences.includes(
          value as BannerAudience,
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

      data.audience =
        value as BannerAudience;
    }

    if (
      body.textAlign !==
      undefined
    ) {
      const value =
        cleanString(
          body.textAlign,
        ).toUpperCase();

      if (
        !textAlignments.includes(
          value as BannerTextAlign,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid text alignment.",
          },
          { status: 400 },
        );
      }

      data.textAlign =
        value as BannerTextAlign;
    }

    if (
      body.overlayOpacity !==
      undefined
    ) {
      const value =
        Number(
          body.overlayOpacity,
        );

      if (
        !Number.isInteger(
          value,
        ) ||
        value < 0 ||
        value > 100
      ) {
        return NextResponse.json(
          {
            error:
              "Overlay opacity must be between 0 and 100.",
          },
          { status: 400 },
        );
      }

      data.overlayOpacity =
        value;
    }

    if (
      body.sortOrder !==
      undefined
    ) {
      const value =
        Number(
          body.sortOrder,
        );

      if (
        !Number.isInteger(
          value,
        ) ||
        value < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid sort order.",
          },
          { status: 400 },
        );
      }

      data.sortOrder =
        value;
    }

    if (
      typeof body.isActive ===
      "boolean"
    ) {
      data.isActive =
        body.isActive;
    }

    if (
      body.startsAt !==
      undefined
    ) {
      const value =
        optionalDate(
          body.startsAt,
        );

      if (
        value === undefined
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid start date.",
          },
          { status: 400 },
        );
      }

      data.startsAt =
        value;
    }

    if (
      body.expiresAt !==
      undefined
    ) {
      const value =
        optionalDate(
          body.expiresAt,
        );

      if (
        value === undefined
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid expiry date.",
          },
          { status: 400 },
        );
      }

      data.expiresAt =
        value;
    }

    const effectiveStart =
      data.startsAt !==
      undefined
        ? data.startsAt
        : existing.startsAt;

    const effectiveExpiry =
      data.expiresAt !==
      undefined
        ? data.expiresAt
        : existing.expiresAt;

    if (
      effectiveStart &&
      effectiveExpiry &&
      effectiveExpiry <=
        effectiveStart
    ) {
      return NextResponse.json(
        {
          error:
            "Expiry must be after start date.",
        },
        { status: 400 },
      );
    }

    const effectiveContentType =
      data.contentType ??
      existing.contentType;

    const validationError =
      creativeError({
        contentType:
          effectiveContentType,

        title:
          data.title !==
          undefined
            ? data.title
            : existing.title,

        subtitle:
          data.subtitle !==
          undefined
            ? data.subtitle
            : existing.subtitle,

        imageUrl:
          data.imageUrl !==
          undefined
            ? data.imageUrl
            : existing.imageUrl,

        videoUrl:
          data.videoUrl !==
          undefined
            ? data.videoUrl
            : existing.videoUrl,

        mobileImageUrl:
          data.mobileImageUrl !==
          undefined
            ? data.mobileImageUrl
            : existing.mobileImageUrl,

        mobileVideoUrl:
          data.mobileVideoUrl !==
          undefined
            ? data.mobileVideoUrl
            : existing.mobileVideoUrl,
      });

    if (validationError) {
      return NextResponse.json(
        {
          error:
            validationError,
        },
        { status: 400 },
      );
    }

    const banner =
      await prisma.banner.update({
        where: {
          id,
        },
        data,
      });

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error(
      "PATCH admin banner failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update banner.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const id =
      cleanString(body.id);

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Banner ID is required.",
        },
        { status: 400 },
      );
    }

    const deleted =
      await prisma.banner.deleteMany({
        where: {
          id,
        },
      });

    if (
      deleted.count === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Banner not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE admin banner failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete banner.",
      },
      { status: 500 },
    );
  }
}

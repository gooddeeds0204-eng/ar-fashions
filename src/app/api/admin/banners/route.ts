import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function optionalDate(value: unknown) {
  const raw = cleanString(value);

  if (!raw) return null;

  const date = new Date(raw);

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

export async function GET() {
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const banners =
      await prisma.banner.findMany({
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "desc" },
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
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body = await request.json();

    const title =
      cleanString(body.title) || null;

    const subtitle =
      cleanString(body.subtitle) || null;

    const imageUrl =
      cleanString(body.imageUrl) || null;

    const videoUrl =
      cleanString(body.videoUrl) || null;

    const buttonText =
      cleanString(body.buttonText) ||
      null;

    const buttonUrl =
      cleanString(body.buttonUrl) || null;

    const sortOrder =
      Number(body.sortOrder ?? 0);

    const startsAt =
      optionalDate(body.startsAt);

    const expiresAt =
      optionalDate(body.expiresAt);

    if (!imageUrl && !videoUrl) {
      return NextResponse.json(
        {
          error:
            "Banner image or video is required.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(sortOrder) ||
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

    const banner =
      await prisma.banner.create({
        data: {
          title,
          subtitle,
          imageUrl,
          videoUrl,
          buttonText,
          buttonUrl,
          sortOrder,
          startsAt,
          expiresAt,
          isActive:
            body.isActive !== false,
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
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body = await request.json();

    const id = cleanString(body.id);

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
        where: { id },
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
      buttonText?: string | null;
      buttonUrl?: string | null;
      isActive?: boolean;
      sortOrder?: number;
      startsAt?: Date | null;
      expiresAt?: Date | null;
    } = {};

    if (body.title !== undefined) {
      data.title =
        cleanString(body.title) || null;
    }

    if (body.subtitle !== undefined) {
      data.subtitle =
        cleanString(body.subtitle) ||
        null;
    }

    if (body.imageUrl !== undefined) {
      data.imageUrl =
        cleanString(body.imageUrl) ||
        null;
    }

    if (body.videoUrl !== undefined) {
      data.videoUrl =
        cleanString(body.videoUrl) ||
        null;
    }

    if (
      body.buttonText !== undefined
    ) {
      data.buttonText =
        cleanString(body.buttonText) ||
        null;
    }

    if (
      body.buttonUrl !== undefined
    ) {
      data.buttonUrl =
        cleanString(body.buttonUrl) ||
        null;
    }

    if (
      typeof body.isActive ===
      "boolean"
    ) {
      data.isActive = body.isActive;
    }

    if (body.sortOrder !== undefined) {
      const sortOrder =
        Number(body.sortOrder);

      if (
        !Number.isInteger(sortOrder) ||
        sortOrder < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid sort order.",
          },
          { status: 400 },
        );
      }

      data.sortOrder = sortOrder;
    }

    if (body.startsAt !== undefined) {
      const value =
        optionalDate(body.startsAt);

      if (value === undefined) {
        return NextResponse.json(
          {
            error:
              "Invalid start date.",
          },
          { status: 400 },
        );
      }

      data.startsAt = value;
    }

    if (body.expiresAt !== undefined) {
      const value =
        optionalDate(body.expiresAt);

      if (value === undefined) {
        return NextResponse.json(
          {
            error:
              "Invalid expiry date.",
          },
          { status: 400 },
        );
      }

      data.expiresAt = value;
    }

    const effectiveImage =
      data.imageUrl !== undefined
        ? data.imageUrl
        : existing.imageUrl;

    const effectiveVideo =
      data.videoUrl !== undefined
        ? data.videoUrl
        : existing.videoUrl;

    if (
      !effectiveImage &&
      !effectiveVideo
    ) {
      return NextResponse.json(
        {
          error:
            "Banner image or video is required.",
        },
        { status: 400 },
      );
    }

    const effectiveStart =
      data.startsAt !== undefined
        ? data.startsAt
        : existing.startsAt;

    const effectiveExpiry =
      data.expiresAt !== undefined
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

    const banner =
      await prisma.banner.update({
        where: { id },
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
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body = await request.json();

    const id = cleanString(body.id);

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Banner ID is required.",
        },
        { status: 400 },
      );
    }

    await prisma.banner.delete({
      where: { id },
    });

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

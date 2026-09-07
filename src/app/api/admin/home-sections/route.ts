import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const SECTION_TYPES = [
  "NEW_ARRIVALS",
  "TRENDING",
  "REELS",
  "FEATURED",
] as const;

type SectionType =
  (typeof SECTION_TYPES)[number];

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function validSectionType(
  value: string,
): value is SectionType {
  return SECTION_TYPES.includes(
    value as SectionType,
  );
}

function readSubtitle(
  config: unknown,
) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    return "";
  }

  const value = (
    config as Record<
      string,
      unknown
    >
  ).subtitle;

  return cleanString(value);
}

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const sections =
      await prisma.homeSection.findMany({
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      });

    return NextResponse.json({
      success: true,
      sections:
        sections.map(
          (section) => ({
            id: section.id,
            title: section.title,
            sectionType:
              section.sectionType,
            subtitle:
              readSubtitle(
                section.config,
              ),
            isActive:
              section.isActive,
            sortOrder:
              section.sortOrder,
            createdAt:
              section.createdAt,
            updatedAt:
              section.updatedAt,
          }),
        ),
    });
  } catch (error) {
    console.error(
      "GET admin home sections failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load home sections.",
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
      cleanString(body.title);

    const sectionType =
      cleanString(
        body.sectionType,
      ).toUpperCase();

    const subtitle =
      cleanString(
        body.subtitle,
      );

    const sortOrder =
      Number(
        body.sortOrder ?? 0,
      );

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Section title is required.",
        },
        { status: 400 },
      );
    }

    if (
      !validSectionType(
        sectionType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid section type.",
        },
        { status: 400 },
      );
    }

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

    const section =
      await prisma.homeSection.create({
        data: {
          title,
          sectionType,
          config: {
            subtitle,
          },
          isActive:
            body.isActive !== false,
          sortOrder,
        },
      });

    return NextResponse.json({
      success: true,
      section,
    });
  } catch (error) {
    console.error(
      "POST admin home section failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to create home section.",
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
            "Section ID is required.",
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.homeSection.findUnique({
        where: { id },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Home section not found.",
        },
        { status: 404 },
      );
    }

    const data: {
      title?: string;
      sectionType?: string;
      config?: {
        subtitle: string;
      };
      isActive?: boolean;
      sortOrder?: number;
    } = {};

    if (
      body.title !== undefined
    ) {
      const title =
        cleanString(
          body.title,
        );

      if (!title) {
        return NextResponse.json(
          {
            error:
              "Section title is required.",
          },
          { status: 400 },
        );
      }

      data.title = title;
    }

    if (
      body.sectionType !==
      undefined
    ) {
      const sectionType =
        cleanString(
          body.sectionType,
        ).toUpperCase();

      if (
        !validSectionType(
          sectionType,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid section type.",
          },
          { status: 400 },
        );
      }

      data.sectionType =
        sectionType;
    }

    if (
      body.subtitle !==
      undefined
    ) {
      data.config = {
        subtitle:
          cleanString(
            body.subtitle,
          ),
      };
    }

    if (
      typeof body.isActive ===
      "boolean"
    ) {
      data.isActive =
        body.isActive;
    }

    if (
      body.sortOrder !==
      undefined
    ) {
      const sortOrder =
        Number(
          body.sortOrder,
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
              "Invalid sort order.",
          },
          { status: 400 },
        );
      }

      data.sortOrder =
        sortOrder;
    }

    const section =
      await prisma.homeSection.update({
        where: { id },
        data,
      });

    return NextResponse.json({
      success: true,
      section,
    });
  } catch (error) {
    console.error(
      "PATCH admin home section failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update home section.",
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
            "Section ID is required.",
        },
        { status: 400 },
      );
    }

    await prisma.homeSection.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE admin home section failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete home section.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function subtitleFromConfig(
  config: unknown,
) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    return "";
  }

  return String(
    (
      config as Record<
        string,
        unknown
      >
    ).subtitle ?? "",
  ).trim();
}

export async function GET() {
  try {
    const sections =
      await prisma.homeSection.findMany({
        where: {
          isActive: true,
        },
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
            subtitle:
              subtitleFromConfig(
                section.config,
              ),
            sectionType:
              section.sectionType,
            sortOrder:
              section.sortOrder,
          }),
        ),
    });
  } catch (error) {
    console.error(
      "GET public home sections failed:",
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

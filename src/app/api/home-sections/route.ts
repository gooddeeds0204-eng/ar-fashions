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
    const allSections =
      await prisma.homeSection.findMany({
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      });

    const sections =
      allSections.filter(
        (section) =>
          section.isActive,
      );

    return NextResponse.json({
      success: true,
      configured:
        allSections.length > 0,
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

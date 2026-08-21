import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const colors = await prisma.color.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { name: "asc" },
      ],
      include: {
        _count: {
          select: {
            variants: true,
          },
        },
      },
    });

    return NextResponse.json(colors);
  } catch (error) {
    console.error("GET /api/colors failed:", error);

    return NextResponse.json(
      { error: "Failed to load colors" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const hexCode = body.hexCode
      ? String(body.hexCode).trim()
      : null;
    const imageUrl = body.imageUrl
      ? String(body.imageUrl).trim()
      : null;

    if (!name) {
      return NextResponse.json(
        { error: "Color name is required" },
        { status: 400 },
      );
    }

    const existing = await prisma.color.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Color already exists" },
        { status: 409 },
      );
    }

    const color = await prisma.color.create({
      data: {
        name,
        hexCode,
        imageUrl,
        isActive: body.isActive !== false,
        sortOrder: Number(body.sortOrder ?? 0),
      },
    });

    return NextResponse.json(color, { status: 201 });
  } catch (error) {
    console.error("POST /api/colors failed:", error);

    return NextResponse.json(
      { error: "Failed to create color" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Color id is required" },
        { status: 400 },
      );
    }

    const color = await prisma.color.update({
      where: { id },
      data: {
        ...(body.name !== undefined && {
          name: String(body.name).trim(),
        }),
        ...(body.hexCode !== undefined && {
          hexCode: body.hexCode
            ? String(body.hexCode).trim()
            : null,
        }),
        ...(body.imageUrl !== undefined && {
          imageUrl: body.imageUrl
            ? String(body.imageUrl).trim()
            : null,
        }),
        ...(body.isActive !== undefined && {
          isActive: Boolean(body.isActive),
        }),
        ...(body.sortOrder !== undefined && {
          sortOrder: Number(body.sortOrder),
        }),
      },
    });

    return NextResponse.json(color);
  } catch (error) {
    console.error("PATCH /api/colors failed:", error);

    return NextResponse.json(
      { error: "Failed to update color" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Color id is required" },
        { status: 400 },
      );
    }

    const variantCount = await prisma.productVariant.count({
      where: { colorId: id },
    });

    if (variantCount > 0) {
      const color = await prisma.color.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: "Color has variants, so it was deactivated",
        color,
      });
    }

    await prisma.color.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Color deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/colors failed:", error);

    return NextResponse.json(
      { error: "Failed to delete color" },
      { status: 500 },
    );
  }
}

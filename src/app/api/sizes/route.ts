import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sizes = await prisma.size.findMany({
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

    return NextResponse.json(sizes);
  } catch (error) {
    console.error("GET /api/sizes failed:", error);

    return NextResponse.json(
      { error: "Failed to load sizes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const category = body.category
      ? String(body.category).trim()
      : null;
    const sizeType = body.sizeType
      ? String(body.sizeType).trim()
      : null;

    if (!name) {
      return NextResponse.json(
        { error: "Size name is required" },
        { status: 400 },
      );
    }

    const existing = await prisma.size.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Size already exists" },
        { status: 409 },
      );
    }

    const size = await prisma.size.create({
      data: {
        name,
        category,
        sizeType,
        isActive: body.isActive !== false,
        sortOrder: Number(body.sortOrder ?? 0),
      },
    });

    return NextResponse.json(size, { status: 201 });
  } catch (error) {
    console.error("POST /api/sizes failed:", error);

    return NextResponse.json(
      { error: "Failed to create size" },
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
        { error: "Size id is required" },
        { status: 400 },
      );
    }

    const size = await prisma.size.update({
      where: { id },
      data: {
        ...(body.name !== undefined && {
          name: String(body.name).trim(),
        }),
        ...(body.category !== undefined && {
          category: body.category
            ? String(body.category).trim()
            : null,
        }),
        ...(body.sizeType !== undefined && {
          sizeType: body.sizeType
            ? String(body.sizeType).trim()
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

    return NextResponse.json(size);
  } catch (error) {
    console.error("PATCH /api/sizes failed:", error);

    return NextResponse.json(
      { error: "Failed to update size" },
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
        { error: "Size id is required" },
        { status: 400 },
      );
    }

    const variantCount = await prisma.productVariant.count({
      where: { sizeId: id },
    });

    if (variantCount > 0) {
      const size = await prisma.size.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: "Size has variants, so it was deactivated",
        size,
      });
    }

    await prisma.size.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Size deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/sizes failed:", error);

    return NextResponse.json(
      { error: "Failed to delete size" },
      { status: 500 },
    );
  }
}

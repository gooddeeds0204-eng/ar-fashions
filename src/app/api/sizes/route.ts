import { requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ensureKidsSizeGuideStorage,
  hasKidsSizeGuideValues,
  kidsSizeGuideData,
} from "@/lib/kids-size-guide-storage";

const GUIDE_KEYS = [
  "ageGuide",
  "heightCm",
  "chestIn",
  "waistIn",
  "hipIn",
  "garmentLengthIn",
  "fitNote",
] as const;

function hasGuideFields(body: Record<string, unknown>) {
  return GUIDE_KEYS.some(
    (key) => body[key] !== undefined,
  );
}

function withGuide(size: Record<string, any>) {
  const guide = size.kidsGuide ?? null;
  const { kidsGuide, ...base } = size;

  return {
    ...base,
    ageGuide: guide?.ageGuide ?? null,
    heightCm: guide?.heightCm ?? null,
    chestIn: guide?.chestIn ?? null,
    waistIn: guide?.waistIn ?? null,
    hipIn: guide?.hipIn ?? null,
    garmentLengthIn:
      guide?.garmentLengthIn ?? null,
    fitNote: guide?.fitNote ?? null,
  };
}

export async function GET() {
  try {
    await ensureKidsSizeGuideStorage();

    const sizes = await prisma.size.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { name: "asc" },
      ],
      include: {
        kidsGuide: true,
        _count: {
          select: {
            variants: true,
          },
        },
      },
    });

    return NextResponse.json(
      sizes.map((size) =>
        withGuide(
          size as unknown as Record<string, any>,
        ),
      ),
    );
  } catch (error) {
    console.error("GET /api/sizes failed:", error);

    return NextResponse.json(
      { error: "Failed to load sizes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    await ensureKidsSizeGuideStorage();

    const body =
      (await request.json()) as Record<string, unknown>;

    const name = String(body.name ?? "").trim();
    const category = body.category
      ? String(body.category).trim()
      : null;
    const sizeType = body.sizeType
      ? String(body.sizeType).trim()
      : null;
    const inches = body.inches
      ? String(body.inches).trim()
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
        inches,
        isActive: body.isActive !== false,
        sortOrder: Number(body.sortOrder ?? 0),
      },
    });

    if (hasKidsSizeGuideValues(body)) {
      await prisma.kidsSizeGuide.create({
        data: {
          sizeId: size.id,
          ...kidsSizeGuideData(body),
        },
      });
    }

    const created =
      await prisma.size.findUnique({
        where: { id: size.id },
        include: {
          kidsGuide: true,
          _count: {
            select: {
              variants: true,
            },
          },
        },
      });

    return NextResponse.json(
      created
        ? withGuide(
            created as unknown as Record<string, any>,
          )
        : size,
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/sizes failed:", error);

    return NextResponse.json(
      { error: "Failed to create size" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    await ensureKidsSizeGuideStorage();

    const body =
      (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Size id is required" },
        { status: 400 },
      );
    }

    await prisma.size.update({
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
        ...(body.inches !== undefined && {
          inches: body.inches
            ? String(body.inches).trim()
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

    if (hasGuideFields(body)) {
      if (hasKidsSizeGuideValues(body)) {
        const guideData = kidsSizeGuideData(body);

        await prisma.kidsSizeGuide.upsert({
          where: { sizeId: id },
          create: {
            sizeId: id,
            ...guideData,
          },
          update: guideData,
        });
      } else {
        await prisma.kidsSizeGuide.deleteMany({
          where: { sizeId: id },
        });
      }
    }

    const updated =
      await prisma.size.findUnique({
        where: { id },
        include: {
          kidsGuide: true,
          _count: {
            select: {
              variants: true,
            },
          },
        },
      });

    return NextResponse.json(
      updated
        ? withGuide(
            updated as unknown as Record<string, any>,
          )
        : { id },
    );
  } catch (error) {
    console.error("PATCH /api/sizes failed:", error);

    return NextResponse.json(
      { error: "Failed to update size" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    await ensureKidsSizeGuideStorage();

    const body =
      (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Size id is required" },
        { status: 400 },
      );
    }

    const variantCount =
      await prisma.productVariant.count({
        where: { sizeId: id },
      });

    if (variantCount > 0) {
      const size = await prisma.size.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message:
          "Size has variants, so it was deactivated",
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

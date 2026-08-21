import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    }

    const media = await prisma.productMedia.findMany({
      where: {
        productId,
        isActive: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json(media);
  } catch (error) {
    console.error("GET /api/media failed:", error);

    return NextResponse.json(
      { error: "Failed to load product media" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId = String(body.productId ?? "").trim();
    const url = String(body.url ?? "").trim();
    const type = String(body.type ?? "").trim().toUpperCase();

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    }

    if (!url) {
      return NextResponse.json(
        { error: "Media URL is required" },
        { status: 400 },
      );
    }

    if (type !== "IMAGE" && type !== "VIDEO") {
      return NextResponse.json(
        { error: "Media type must be IMAGE or VIDEO" },
        { status: 400 },
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    const lastMedia = await prisma.productMedia.findFirst({
      where: { productId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const media = await prisma.productMedia.create({
      data: {
        productId,
        type: type as "IMAGE" | "VIDEO",
        url,
        thumbnailUrl: body.thumbnailUrl
          ? String(body.thumbnailUrl).trim()
          : null,
        altText: body.altText
          ? String(body.altText).trim()
          : null,
        sortOrder: (lastMedia?.sortOrder ?? -1) + 1,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    console.error("POST /api/media failed:", error);

    return NextResponse.json(
      { error: "Failed to create product media" },
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
        { error: "Media id is required" },
        { status: 400 },
      );
    }

    const media = await prisma.productMedia.update({
      where: { id },
      data: {
        ...(body.url !== undefined && {
          url: String(body.url).trim(),
        }),
        ...(body.thumbnailUrl !== undefined && {
          thumbnailUrl: body.thumbnailUrl
            ? String(body.thumbnailUrl).trim()
            : null,
        }),
        ...(body.altText !== undefined && {
          altText: body.altText
            ? String(body.altText).trim()
            : null,
        }),
        ...(body.sortOrder !== undefined && {
          sortOrder: Number(body.sortOrder),
        }),
        ...(body.isActive !== undefined && {
          isActive: Boolean(body.isActive),
        }),
      },
    });

    return NextResponse.json(media);
  } catch (error) {
    console.error("PATCH /api/media failed:", error);

    return NextResponse.json(
      { error: "Failed to update product media" },
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
        { error: "Media id is required" },
        { status: 400 },
      );
    }

    const media = await prisma.productMedia.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      message: "Media removed successfully",
      media,
    });
  } catch (error) {
    console.error("DELETE /api/media failed:", error);

    return NextResponse.json(
      { error: "Failed to remove product media" },
      { status: 500 },
    );
  }
}

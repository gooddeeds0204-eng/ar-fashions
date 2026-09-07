import { requireAdmin } from "@/lib/admin-auth";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  /* ADMIN_GUARD_POST */
  const adminError = await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 },
      );
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      return NextResponse.json(
        {
          error: "Only image and video files are allowed",
        },
        { status: 400 },
      );
    }

    const maxSize = isVideo
      ? 50 * 1024 * 1024
      : 10 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: isVideo
            ? "Video must be 50MB or smaller"
            : "Image must be 10MB or smaller",
        },
        { status: 400 },
      );
    }

    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase();

    const folder = isImage
      ? "products/images"
      : "products/videos";

    const pathname = `${folder}/${Date.now()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      type: isImage ? "IMAGE" : "VIDEO",
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    console.error("POST /api/upload failed:", error);

    return NextResponse.json(
      {
        error: "Failed to upload file",
      },
      { status: 500 },
    );
  }
}

"use client";

import {
  upload,
} from "@vercel/blob/client";

export type AdminMediaUploadResult = {
  success: true;
  type: "IMAGE" | "VIDEO";
  fileName: string;
  size: number;
  mimeType: string;
  url: string;
  pathname: string;
};

export async function uploadAdminProductMedia(
  file: File,
  onProgress?: (
    percentage: number,
  ) => void,
): Promise<AdminMediaUploadResult> {
  const isImage =
    file.type.startsWith(
      "image/",
    );

  const isVideo =
    file.type.startsWith(
      "video/",
    );

  if (
    !isImage &&
    !isVideo
  ) {
    throw new Error(
      "Only image and video files are allowed",
    );
  }

  const maxSize =
    isVideo
      ? 50 *
        1024 *
        1024
      : 10 *
        1024 *
        1024;

  if (
    file.size >
    maxSize
  ) {
    throw new Error(
      isVideo
        ? "Video must be 50MB or smaller"
        : "Image must be 10MB or smaller",
    );
  }

  const safeName =
    file.name
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "-",
      )
      .toLowerCase();

  const folder =
    isImage
      ? "products/images"
      : "products/videos";

  const pathname =
    `${folder}/${Date.now()}-${safeName}`;

  const blob =
    await upload(
      pathname,
      file,
      {
        access:
          "public",
        handleUploadUrl:
          "/api/upload/client",
        multipart:
          file.size >
          4 *
            1024 *
            1024,
        onUploadProgress:
          (event) => {
            onProgress?.(
              Math.round(
                event.percentage,
              ),
            );
          },
      },
    );

  return {
    success: true,
    type:
      isImage
        ? "IMAGE"
        : "VIDEO",
    fileName:
      file.name,
    size:
      file.size,
    mimeType:
      file.type,
    url:
      blob.url,
    pathname:
      blob.pathname,
  };
}

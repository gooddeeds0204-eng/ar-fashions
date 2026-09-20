import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAdmin,
} from "@/lib/admin-auth";

export async function POST(
  request: Request,
): Promise<NextResponse> {
  let body:
    | HandleUploadBody
    | undefined;

  try {
    body =
      (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid upload request.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const jsonResponse =
      await handleUpload({
        body,
        request,

        onBeforeGenerateToken:
          async (
            pathname,
          ) => {
            const admin =
              await getAuthenticatedAdmin();

            if (!admin) {
              throw new Error(
                "Admin authentication required.",
              );
            }

            const isImage =
              pathname.startsWith(
                "products/images/",
              );

            const isVideo =
              pathname.startsWith(
                "products/videos/",
              );

            if (
              !isImage &&
              !isVideo
            ) {
              throw new Error(
                "Invalid product media path.",
              );
            }

            return {
              allowedContentTypes:
                isImage
                  ? [
                      "image/*",
                    ]
                  : [
                      "video/*",
                    ],
              maximumSizeInBytes:
                isImage
                  ? 10 *
                    1024 *
                    1024
                  : 50 *
                    1024 *
                    1024,
              addRandomSuffix:
                true,
              tokenPayload:
                JSON.stringify({
                  adminId:
                    admin.id,
                  kind:
                    isImage
                      ? "IMAGE"
                      : "VIDEO",
                }),
            };
          },

        onUploadCompleted:
          async () => {
            // Product media DB linkage
            // happens after the browser
            // receives the Blob URL.
          },
      });

    return NextResponse.json(
      jsonResponse,
    );
  } catch (error) {
    console.error(
      "POST /api/upload/client failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Upload authorization failed.",
      },
      {
        status: 400,
      },
    );
  }
}

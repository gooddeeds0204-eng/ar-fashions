import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

import {
  getAuthenticatedCustomer,
} from "@/lib/customer-auth";

import {
  enforcePublicRateLimit,
} from "@/lib/public-write-security";

function sameOrigin(
  request: Request,
) {
  const fetchSite =
    request.headers.get(
      "sec-fetch-site",
    );

  if (fetchSite === "cross-site") {
    return false;
  }

  const origin =
    request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    const supplied =
      new URL(origin);

    const host =
      request.headers
        .get("x-forwarded-host")
        ?.split(",")[0]
        ?.trim() ||
      request.headers
        .get("host")
        ?.trim() ||
      new URL(request.url).host;

    return supplied.host === host;
  } catch {
    return false;
  }
}

export async function POST(
  request: Request,
) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      {
        error:
          "Invalid upload request.",
      },
      {
        status: 403,
      },
    );
  }

  const user =
    await getAuthenticatedCustomer();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Login required.",
      },
      {
        status: 401,
      },
    );
  }

  const rateLimit =
    await enforcePublicRateLimit(
      request,
      {
        scope:
          "reseller-verification-upload",
        limit: 12,
        windowSeconds: 30 * 60,
      },
    );

  if (rateLimit) {
    return rateLimit;
  }

  try {
    const formData =
      await request.formData();

    const file =
      formData.get("file");

    const kind =
      String(
        formData.get("kind") ?? "",
      ).toUpperCase();

    if (
      kind !== "VISITING_CARD" &&
      kind !== "SHOP_PHOTO"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid image type.",
        },
        {
          status: 400,
        },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Image is required.",
        },
        {
          status: 400,
        },
      );
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowed.includes(
        file.type,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Upload JPG, PNG or WebP images only.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          error:
            "Each image must be 5MB or smaller.",
        },
        {
          status: 400,
        },
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
      kind === "VISITING_CARD"
        ? "reseller-verification/cards"
        : "reseller-verification/shops";

    const blob =
      await put(
        `${folder}/${Date.now()}-${safeName}`,
        file,
        {
          access: "public",
          addRandomSuffix: true,
          contentType: file.type,
        },
      );

    return NextResponse.json({
      success: true,
      url: blob.url,
    });
  } catch (error) {
    console.error(
      "POST /api/reseller-upload failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Image upload failed.",
      },
      {
        status: 500,
      },
    );
  }
}

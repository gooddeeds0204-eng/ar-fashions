import {
  NextResponse,
} from "next/server";
import {
  put,
} from "@vercel/blob";

import {
  requireAdmin,
} from "@/lib/admin-auth";
import {
  prisma,
} from "@/lib/prisma";

function clean(
  value: unknown,
  max = 100,
) {
  return String(
    value ?? "",
  )
    .trim()
    .slice(0, max);
}

export async function POST(
  request: Request,
) {
  const auth =
    await requireAdmin();

  if (auth) {
    return auth;
  }

  try {
    const formData =
      await request.formData();

    const orderId =
      clean(
        formData.get(
          "orderId",
        ),
        80,
      );

    const file =
      formData.get(
        "file",
      );

    if (!orderId) {
      return NextResponse.json(
        {
          error:
            "Order ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },
        select: {
          id: true,
          type: true,
          orderNumber: true,
        },
      });

    if (
      !order ||
      order.type !==
        "RESELLER"
    ) {
      return NextResponse.json(
        {
          error:
            "Valid reseller order required.",
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
            "Select an LR / dispatch image.",
        },
        {
          status: 400,
        },
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Upload JPG, PNG or WebP image only.",
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
            "LR image must be 5MB or smaller.",
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

    const blob =
      await put(
        `bulk-dispatch/${order.orderNumber}/${Date.now()}-${safeName}`,
        file,
        {
          access:
            "public",
          addRandomSuffix:
            true,
          contentType:
            file.type,
        },
      );

    return NextResponse.json({
      success: true,
      url: blob.url,
    });
  } catch (error) {
    console.error(
      "POST bulk dispatch image failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "LR image upload failed.",
      },
      {
        status: 500,
      },
    );
  }
}

import {
  NextResponse,
} from "next/server";
import {
  getAuthenticatedCustomerId,
} from "@/lib/customer-auth";
import {
  prisma,
} from "@/lib/prisma";
import {
  isShiprocketConfigured,
  trackShiprocketAwb,
} from "@/lib/shiprocket";

function clean(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

export async function GET(
  request: Request,
) {
  try {
    const userId =
      await getAuthenticatedCustomerId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Please sign in to track your order.",
        },
        { status: 401 },
      );
    }

    const url =
      new URL(request.url);

    const orderNumber =
      clean(
        url.searchParams.get(
          "orderNumber",
        ),
      );

    if (!orderNumber) {
      return NextResponse.json(
        {
          error:
            "Order number is required.",
        },
        { status: 400 },
      );
    }

    const order =
      await prisma.order.findFirst({
        where: {
          orderNumber,
          userId,
        },
        select: {
          id: true,
          orderNumber: true,
        },
      });

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Order was not found.",
        },
        { status: 404 },
      );
    }

    const row =
      await prisma.siteSetting.findUnique({
        where: {
          key:
            `shipment_v1_${order.id}`,
        },
      });

    if (!row) {
      return NextResponse.json({
        success: true,
        shipment: null,
        tracking: null,
      });
    }

    let shipment:
      Record<
        string,
        unknown
      > | null = null;

    try {
      shipment =
        JSON.parse(
          row.value,
        ) as Record<
          string,
          unknown
        >;
    } catch {
      shipment = null;
    }

    let tracking:
      Record<
        string,
        unknown
      > | null = null;

    const awbCode =
      clean(
        shipment?.awbCode,
      );

    if (
      awbCode &&
      isShiprocketConfigured()
    ) {
      try {
        tracking =
          await trackShiprocketAwb(
            awbCode,
          );
      } catch (error) {
        console.error(
          "Customer shipment tracking failed:",
          error,
        );
      }
    }

    return NextResponse.json({
      success: true,
      shipment,
      tracking,
    });
  } catch (error) {
    console.error(
      "GET customer shipping failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load shipment tracking.",
      },
      { status: 500 },
    );
  }
}

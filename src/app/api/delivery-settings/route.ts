import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const KEY =
  "delivery_settings_v1";

const defaults = {
  retailDeliveryCharge: 79,
  retailFreeDeliveryThreshold: 999,
  resellerDeliveryMode: "ACTUAL_FREIGHT",
  resellerFlatDeliveryCharge: 0,
  estimatedMinDays: 3,
  estimatedMaxDays: 7,
  bulkFreightMessage:
    "Bulk shipping charge will be calculated after packing based on parcel weight and destination.",
  restrictServiceability: false,
  allowedStates: [] as string[],
  allowedPincodes: [] as string[],
};

export async function GET() {
  try {
    const row =
      await prisma.siteSetting.findUnique({
        where: {
          key: KEY,
        },
      });

    let settings = defaults;

    if (row) {
      try {
        settings = {
          ...defaults,
          ...JSON.parse(row.value),
        };
      } catch {}
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch {
    return NextResponse.json({
      success: true,
      settings: defaults,
    });
  }
}

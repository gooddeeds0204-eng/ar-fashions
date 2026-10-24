import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { requireSameOriginJson } from "@/lib/public-write-security";

const SETTINGS_KEY = "delivery_settings_v1";

const DEFAULT_SETTINGS = {
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

type DeliverySettings = typeof DEFAULT_SETTINGS;

function numberValue(
  value: unknown,
  fallback: number,
) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function normalize(
  value: unknown,
): DeliverySettings {
  const source =
    value &&
    typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const mode =
    String(
      source.resellerDeliveryMode ??
        DEFAULT_SETTINGS.resellerDeliveryMode,
    ).toUpperCase();

  return {
    retailDeliveryCharge:
      numberValue(
        source.retailDeliveryCharge,
        79,
      ),

    retailFreeDeliveryThreshold:
      numberValue(
        source.retailFreeDeliveryThreshold,
        999,
      ),

    resellerDeliveryMode:
      mode === "FLAT"
        ? "FLAT"
        : "ACTUAL_FREIGHT",

    resellerFlatDeliveryCharge:
      numberValue(
        source.resellerFlatDeliveryCharge,
        0,
      ),

    estimatedMinDays:
      Math.floor(
        numberValue(
          source.estimatedMinDays,
          3,
        ),
      ),

    estimatedMaxDays:
      Math.floor(
        numberValue(
          source.estimatedMaxDays,
          7,
        ),
      ),

    bulkFreightMessage:
      String(
        source.bulkFreightMessage ??
          DEFAULT_SETTINGS.bulkFreightMessage,
      ).trim(),

    restrictServiceability:
      source.restrictServiceability === true,

    allowedStates:
      Array.isArray(source.allowedStates)
        ? source.allowedStates
            .map((x) => String(x).trim())
            .filter(Boolean)
        : [],

    allowedPincodes:
      Array.isArray(source.allowedPincodes)
        ? source.allowedPincodes
            .map((x) => String(x).trim())
            .filter(Boolean)
        : [],
  };
}

async function readSettings() {
  const row =
    await prisma.siteSetting.findUnique({
      where: {
        key: SETTINGS_KEY,
      },
    });

  if (!row) {
    return DEFAULT_SETTINGS;
  }

  try {
    return normalize(
      JSON.parse(row.value),
    );
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function GET() {
  const auth =
    await requireAdmin();

  if (auth) return auth;

  try {
    return NextResponse.json({
      success: true,
      settings:
        await readSettings(),
    });
  } catch (error) {
    console.error(
      "GET delivery settings failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load delivery settings.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
) {
  const auth =
    await requireAdmin();

  if (auth) return auth;

  try {
    const body =
      await request.json();

    const settings =
      normalize(body);

    if (
      settings.retailDeliveryCharge < 0 ||
      settings.retailFreeDeliveryThreshold < 0 ||
      settings.resellerFlatDeliveryCharge < 0 ||
      settings.estimatedMinDays < 0 ||
      settings.estimatedMaxDays < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Delivery values cannot be negative.",
        },
        { status: 400 },
      );
    }

    if (
      settings.estimatedMinDays >
      settings.estimatedMaxDays
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum delivery days cannot exceed maximum delivery days.",
        },
        { status: 400 },
      );
    }

    const badPincode =
      settings.allowedPincodes.find(
        (x) =>
          !/^\d{6}$/.test(x),
      );

    if (badPincode) {
      return NextResponse.json(
        {
          error:
            `Invalid pincode: ${badPincode}`,
        },
        { status: 400 },
      );
    }

    settings.allowedStates =
      Array.from(
        new Set(
          settings.allowedStates,
        ),
      );

    settings.allowedPincodes =
      Array.from(
        new Set(
          settings.allowedPincodes,
        ),
      );

    await prisma.siteSetting.upsert({
      where: {
        key: SETTINGS_KEY,
      },
      update: {
        value:
          JSON.stringify(settings),
      },
      create: {
        key: SETTINGS_KEY,
        value:
          JSON.stringify(settings),
      },
    });

    return NextResponse.json({
      success: true,
      settings,
      message:
        "Delivery settings saved successfully.",
    });
  } catch (error) {
    console.error(
      "PUT delivery settings failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to save delivery settings.",
      },
      { status: 500 },
    );
  }
}

/**
 * Store delivery settings are presented in two separate admin tabs.
 * Each PATCH updates only that tab's fields so an unsaved edit in the
 * other tab cannot silently overwrite the saved values.
 *
 * Estimated delivery times and serviceability rules were global in the
 * existing checkout implementation; they remain shared for now.
 */
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const originError = requireSameOriginJson(request);
  if (originError) return originError;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid delivery settings." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const mode = input.mode;
    if (mode !== "RETAIL" && mode !== "WHOLESALE") {
      return NextResponse.json(
        { error: "Choose Retail or Bulk / Wholesale settings." },
        { status: 400 },
      );
    }

    const existing = await readSettings();
    const changes = mode === "RETAIL"
      ? {
          retailDeliveryCharge: input.retailDeliveryCharge,
          retailFreeDeliveryThreshold: input.retailFreeDeliveryThreshold,
          estimatedMinDays: input.estimatedMinDays,
          estimatedMaxDays: input.estimatedMaxDays,
          restrictServiceability: input.restrictServiceability,
          allowedStates: input.allowedStates,
          allowedPincodes: input.allowedPincodes,
        }
      : {
          resellerDeliveryMode: input.resellerDeliveryMode,
          resellerFlatDeliveryCharge: input.resellerFlatDeliveryCharge,
          bulkFreightMessage: input.bulkFreightMessage,
        };

    const settings = normalize({ ...existing, ...changes });

    if (
      settings.retailDeliveryCharge < 0 ||
      settings.retailFreeDeliveryThreshold < 0 ||
      settings.resellerFlatDeliveryCharge < 0 ||
      settings.estimatedMinDays < 0 ||
      settings.estimatedMaxDays < 0
    ) {
      return NextResponse.json(
        { error: "Delivery values cannot be negative." },
        { status: 400 },
      );
    }

    if (settings.estimatedMinDays > settings.estimatedMaxDays) {
      return NextResponse.json(
        { error: "Minimum delivery days cannot exceed maximum delivery days." },
        { status: 400 },
      );
    }

    const badPincode = settings.allowedPincodes.find((value) => !/^\d{6}$/.test(value));
    if (badPincode) {
      return NextResponse.json(
        { error: `Invalid pincode: ${badPincode}` },
        { status: 400 },
      );
    }

    settings.allowedStates = [...new Set(settings.allowedStates)];
    settings.allowedPincodes = [...new Set(settings.allowedPincodes)];

    await prisma.siteSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: JSON.stringify(settings) },
      create: { key: SETTINGS_KEY, value: JSON.stringify(settings) },
    });

    return NextResponse.json({
      success: true,
      settings,
      message: mode === "RETAIL"
        ? "Retail delivery settings saved successfully."
        : "Bulk / Wholesale delivery settings saved successfully.",
    });
  } catch (error) {
    console.error("PATCH delivery settings failed:", error);
    return NextResponse.json(
      { error: "Could not save delivery settings." },
      { status: 500 },
    );
  }
}

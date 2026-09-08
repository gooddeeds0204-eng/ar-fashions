import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SETTINGS_KEY =
  "site_settings_v1";

const DEFAULT_SETTINGS = {
  storeName: "AR FASHIONS",
  supportPhone: "",
  whatsappNumber: "",
  supportEmail: "",
  storeNotice: "",
  codEnabled: true,
  minimumRetailOrder: 0,
  maintenanceMode: false,
  maintenanceMessage:
    "We are currently updating the store. Please check back shortly.",
};

const DEFAULT_SALES_MODE = {
  retailStatus: "OPEN",
  resellerStatus: "OPEN",
  retailMessage:
    "Retail shopping is open.",
  resellerMessage:
    "Reseller orders are open.",
};

function normalizeSettings(
  value: unknown,
) {
  const source =
    value &&
    typeof value === "object"
      ? (value as Record<
          string,
          unknown
        >)
      : {};

  const minimumRetailOrder =
    Number(
      source.minimumRetailOrder,
    );

  return {
    storeName:
      String(
        source.storeName ??
          DEFAULT_SETTINGS.storeName,
      ).trim() ||
      DEFAULT_SETTINGS.storeName,

    supportPhone:
      String(
        source.supportPhone ??
          "",
      ).trim(),

    whatsappNumber:
      String(
        source.whatsappNumber ??
          "",
      ).trim(),

    supportEmail:
      String(
        source.supportEmail ??
          "",
      ).trim(),

    storeNotice:
      String(
        source.storeNotice ??
          "",
      ).trim(),

    codEnabled:
      source.codEnabled !==
      false,

    minimumRetailOrder:
      Number.isFinite(
        minimumRetailOrder,
      ) &&
      minimumRetailOrder >= 0
        ? minimumRetailOrder
        : 0,

    maintenanceMode:
      source.maintenanceMode ===
      true,

    maintenanceMessage:
      String(
        source.maintenanceMessage ??
          DEFAULT_SETTINGS.maintenanceMessage,
      ).trim() ||
      DEFAULT_SETTINGS.maintenanceMessage,
  };
}

export async function GET() {
  try {
    const [
      settingsRow,
      salesModeRow,
    ] =
      await Promise.all([
        prisma.siteSetting.findUnique({
          where: {
            key: SETTINGS_KEY,
          },
        }),

        prisma.salesMode.findFirst({
          orderBy: {
            updatedAt: "desc",
          },
        }),
      ]);

    let settings =
      DEFAULT_SETTINGS;

    if (settingsRow) {
      try {
        settings =
          normalizeSettings(
            JSON.parse(
              settingsRow.value,
            ),
          );
      } catch {
        settings =
          DEFAULT_SETTINGS;
      }
    }

    return NextResponse.json({
      success: true,
      settings,

      salesMode: {
        retailStatus:
          salesModeRow
            ?.retailStatus ??
          DEFAULT_SALES_MODE.retailStatus,

        resellerStatus:
          salesModeRow
            ?.resellerStatus ??
          DEFAULT_SALES_MODE.resellerStatus,

        retailMessage:
          salesModeRow
            ?.retailMessage ??
          DEFAULT_SALES_MODE.retailMessage,

        resellerMessage:
          salesModeRow
            ?.resellerMessage ??
          DEFAULT_SALES_MODE.resellerMessage,
      },
    });
  } catch (error) {
    console.error(
      "GET site settings failed:",
      error,
    );

    return NextResponse.json({
      success: true,
      settings:
        DEFAULT_SETTINGS,
      salesMode:
        DEFAULT_SALES_MODE,
    });
  }
}

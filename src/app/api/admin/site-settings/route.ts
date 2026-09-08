import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

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
  retailStatus: "OPEN" as
    | "OPEN"
    | "CLOSED",

  resellerStatus: "OPEN" as
    | "OPEN"
    | "CLOSED",

  retailMessage:
    "Retail shopping is open.",

  resellerMessage:
    "Reseller orders are open.",
};

function cleanString(
  value: unknown,
  maxLength: number,
) {
  return String(
    value ?? "",
  )
    .trim()
    .slice(
      0,
      maxLength,
    );
}

function safeNumber(
  value: unknown,
  fallback = 0,
) {
  const number =
    Number(value);

  return Number.isFinite(number) &&
    number >= 0
    ? number
    : fallback;
}

function normalizeSettings(
  value: unknown,
) {
  const source =
    value &&
    typeof value ===
      "object"
      ? (value as Record<
          string,
          unknown
        >)
      : {};

  return {
    storeName:
      cleanString(
        source.storeName ??
          DEFAULT_SETTINGS.storeName,
        80,
      ) ||
      DEFAULT_SETTINGS.storeName,

    supportPhone:
      cleanString(
        source.supportPhone,
        30,
      ),

    whatsappNumber:
      cleanString(
        source.whatsappNumber,
        30,
      ),

    supportEmail:
      cleanString(
        source.supportEmail,
        120,
      ),

    storeNotice:
      cleanString(
        source.storeNotice,
        300,
      ),

    codEnabled:
      source.codEnabled !==
      false,

    minimumRetailOrder:
      safeNumber(
        source.minimumRetailOrder,
        0,
      ),

    maintenanceMode:
      source.maintenanceMode ===
      true,

    maintenanceMessage:
      cleanString(
        source.maintenanceMessage ??
          DEFAULT_SETTINGS.maintenanceMessage,
        500,
      ),
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
    return normalizeSettings(
      JSON.parse(
        row.value,
      ),
    );
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function readSalesMode() {
  const row =
    await prisma.salesMode.findFirst({
      orderBy: {
        updatedAt: "desc",
      },
    });

  if (!row) {
    return DEFAULT_SALES_MODE;
  }

  return {
    retailStatus:
      row.retailStatus,

    resellerStatus:
      row.resellerStatus,

    retailMessage:
      row.retailMessage ??
      DEFAULT_SALES_MODE.retailMessage,

    resellerMessage:
      row.resellerMessage ??
      DEFAULT_SALES_MODE.resellerMessage,
  };
}

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const [
      settings,
      salesMode,
    ] =
      await Promise.all([
        readSettings(),
        readSalesMode(),
      ]);

    return NextResponse.json({
      success: true,
      settings,
      salesMode,
    });
  } catch (error) {
    console.error(
      "GET admin site settings failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load site settings.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const body =
      await request.json();

    const settings =
      normalizeSettings(
        body.settings,
      );

    const retailStatus =
      String(
        body.salesMode
          ?.retailStatus ??
          "OPEN",
      ).toUpperCase();

    const resellerStatus =
      String(
        body.salesMode
          ?.resellerStatus ??
          "OPEN",
      ).toUpperCase();

    if (
      ![
        "OPEN",
        "CLOSED",
      ].includes(
        retailStatus,
      ) ||
      ![
        "OPEN",
        "CLOSED",
      ].includes(
        resellerStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid sales mode status.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      settings.supportEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        settings.supportEmail,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid support email.",
        },
        {
          status: 400,
        },
      );
    }

    const salesModeData = {
      retailStatus:
        retailStatus as
          | "OPEN"
          | "CLOSED",

      resellerStatus:
        resellerStatus as
          | "OPEN"
          | "CLOSED",

      retailMessage:
        cleanString(
          body.salesMode
            ?.retailMessage,
          300,
        ) ||
        DEFAULT_SALES_MODE.retailMessage,

      resellerMessage:
        cleanString(
          body.salesMode
            ?.resellerMessage,
          300,
        ) ||
        DEFAULT_SALES_MODE.resellerMessage,
    };

    await prisma.$transaction(
      async (tx) => {
        await tx.siteSetting.upsert({
          where: {
            key: SETTINGS_KEY,
          },

          update: {
            value:
              JSON.stringify(
                settings,
              ),
          },

          create: {
            key: SETTINGS_KEY,

            value:
              JSON.stringify(
                settings,
              ),
          },
        });

        const existing =
          await tx.salesMode.findFirst({
            orderBy: {
              updatedAt:
                "desc",
            },

            select: {
              id: true,
            },
          });

        if (existing) {
          await tx.salesMode.update({
            where: {
              id:
                existing.id,
            },

            data:
              salesModeData,
          });
        } else {
          await tx.salesMode.create({
            data:
              salesModeData,
          });
        }
      },
    );

    return NextResponse.json({
      success: true,
      settings,
      salesMode:
        salesModeData,
      message:
        "Site settings saved successfully.",
    });
  } catch (error) {
    console.error(
      "PUT admin site settings failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to save site settings.",
      },
      {
        status: 500,
      },
    );
  }
}

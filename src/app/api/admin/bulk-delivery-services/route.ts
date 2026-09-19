import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const KEY =
  "bulk_delivery_services_v1";

type ServiceType =
  | "PARCEL"
  | "TRANSPORT";

type BulkDeliveryService = {
  id: string;
  type: ServiceType;
  name: string;
  phone: string;
  branch: string;
  serviceArea: string;
  notes: string;
  isActive: boolean;
};

function clean(
  value: unknown,
  max = 160,
) {
  return String(
    value ?? "",
  )
    .trim()
    .slice(0, max);
}

function normalizeService(
  value: unknown,
): BulkDeliveryService | null {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  const type =
    String(
      source.type ?? "",
    ).toUpperCase();

  const name =
    clean(
      source.name,
      100,
    );

  if (
    !name ||
    (type !== "PARCEL" &&
      type !== "TRANSPORT")
  ) {
    return null;
  }

  return {
    id:
      clean(
        source.id,
        80,
      ) ||
      randomUUID(),
    type:
      type as ServiceType,
    name,
    phone:
      clean(
        source.phone,
        30,
      ),
    branch:
      clean(
        source.branch,
        120,
      ),
    serviceArea:
      clean(
        source.serviceArea,
        180,
      ),
    notes:
      clean(
        source.notes,
        300,
      ),
    isActive:
      source.isActive !==
      false,
  };
}

async function readServices() {
  const row =
    await prisma.siteSetting.findUnique({
      where: {
        key: KEY,
      },
    });

  if (!row) {
    return [] as BulkDeliveryService[];
  }

  try {
    const parsed =
      JSON.parse(
        row.value,
      );

    if (
      !Array.isArray(
        parsed,
      )
    ) {
      return [];
    }

    return parsed
      .map(
        normalizeService,
      )
      .filter(
        (
          item,
        ): item is BulkDeliveryService =>
          Boolean(item),
      );
  } catch {
    return [];
  }
}

export async function GET() {
  const auth =
    await requireAdmin();

  if (auth) {
    return auth;
  }

  return NextResponse.json({
    success: true,
    services:
      await readServices(),
  });
}

export async function PUT(
  request: Request,
) {
  const auth =
    await requireAdmin();

  if (auth) {
    return auth;
  }

  try {
    const body =
      await request.json();

    const source =
      Array.isArray(
        body.services,
      )
        ? body.services
        : [];

    const services =
      source
        .map(
          normalizeService,
        )
        .filter(
          (
            item,
          ): item is BulkDeliveryService =>
            Boolean(item),
        )
        .slice(0, 100);

    const ids =
      new Set<string>();

    for (
      const service of
      services
    ) {
      if (
        ids.has(
          service.id,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Duplicate delivery service ID found.",
          },
          { status: 400 },
        );
      }

      ids.add(
        service.id,
      );
    }

    await prisma.siteSetting.upsert({
      where: {
        key: KEY,
      },
      update: {
        value:
          JSON.stringify(
            services,
          ),
      },
      create: {
        key: KEY,
        value:
          JSON.stringify(
            services,
          ),
      },
    });

    return NextResponse.json({
      success: true,
      services,
      message:
        "Bulk parcel and transport services saved.",
    });
  } catch (error) {
    console.error(
      "Bulk delivery services save failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to save bulk delivery services.",
      },
      { status: 500 },
    );
  }
}

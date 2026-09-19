import {
  NextResponse,
} from "next/server";
import {
  requireAdmin,
} from "@/lib/admin-auth";
import {
  prisma,
} from "@/lib/prisma";

const SETTINGS_KEY =
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

function textValue(
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

function parseService(
  value: unknown,
  index: number,
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

  const typeValue =
    textValue(
      source.type,
      20,
    ).toUpperCase();

  if (
    typeValue !==
      "PARCEL" &&
    typeValue !==
      "TRANSPORT"
  ) {
    return null;
  }

  const name =
    textValue(
      source.name,
      100,
    );

  if (!name) {
    return null;
  }

  const id =
    textValue(
      source.id,
      80,
    ) ||
    `bulk-service-${Date.now()}-${index}`;

  return {
    id,
    type:
      typeValue as ServiceType,
    name,
    phone:
      textValue(
        source.phone,
        30,
      ),
    branch:
      textValue(
        source.branch,
        120,
      ),
    serviceArea:
      textValue(
        source.serviceArea,
        180,
      ),
    notes:
      textValue(
        source.notes,
        300,
      ),
    isActive:
      source.isActive !==
      false,
  };
}

function parseServices(
  value: unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [] as BulkDeliveryService[];
  }

  const result:
    BulkDeliveryService[] =
    [];

  for (
    let index = 0;
    index <
    value.length;
    index += 1
  ) {
    const service =
      parseService(
        value[index],
        index,
      );

    if (service) {
      result.push(
        service,
      );
    }
  }

  return result.slice(
    0,
    100,
  );
}

async function readServices() {
  const row =
    await prisma.siteSetting.findUnique({
      where: {
        key:
          SETTINGS_KEY,
      },
    });

  if (!row) {
    return [] as BulkDeliveryService[];
  }

  try {
    return parseServices(
      JSON.parse(
        row.value,
      ),
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

  try {
    return NextResponse.json({
      success: true,
      services:
        await readServices(),
    });
  } catch (error) {
    console.error(
      "GET bulk delivery services failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load bulk delivery services.",
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
  const auth =
    await requireAdmin();

  if (auth) {
    return auth;
  }

  try {
    const body =
      (await request.json()) as {
        services?: unknown;
      };

    const services =
      parseServices(
        body.services,
      );

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
              "Duplicate delivery service found.",
          },
          {
            status: 400,
          },
        );
      }

      ids.add(
        service.id,
      );
    }

    await prisma.siteSetting.upsert({
      where: {
        key:
          SETTINGS_KEY,
      },
      update: {
        value:
          JSON.stringify(
            services,
          ),
      },
      create: {
        key:
          SETTINGS_KEY,
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
        "Bulk delivery services saved.",
    });
  } catch (error) {
    console.error(
      "PUT bulk delivery services failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to save bulk delivery services.",
      },
      {
        status: 500,
      },
    );
  }
}

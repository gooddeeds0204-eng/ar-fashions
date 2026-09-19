import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const SERVICES_KEY =
  "bulk_delivery_services_v1";

type BulkService = {
  id: string;
  type:
    | "PARCEL"
    | "TRANSPORT";
  name: string;
  phone: string;
  branch: string;
  serviceArea: string;
  notes: string;
  isActive: boolean;
};

function clean(
  value: unknown,
  max = 180,
) {
  return String(
    value ?? "",
  )
    .trim()
    .slice(0, max);
}

async function readServices() {
  const row =
    await prisma.siteSetting.findUnique({
      where: {
        key: SERVICES_KEY,
      },
    });

  if (!row) {
    return [] as BulkService[];
  }

  try {
    const parsed =
      JSON.parse(
        row.value,
      );

    return Array.isArray(
      parsed,
    )
      ? (parsed as BulkService[])
      : [];
  } catch {
    return [];
  }
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
    const body =
      await request.json();

    const orderId =
      clean(
        body.orderId,
        80,
      );

    const serviceId =
      clean(
        body.serviceId,
        80,
      );

    const referenceNumber =
      clean(
        body.referenceNumber,
        120,
      );

    const estimatedDelivery =
      clean(
        body.estimatedDelivery,
        120,
      );

    const notes =
      clean(
        body.notes,
        300,
      );

    if (
      !orderId ||
      !serviceId ||
      !referenceNumber
    ) {
      return NextResponse.json(
        {
          error:
            "Order, delivery service and LR / tracking number are required.",
        },
        { status: 400 },
      );
    }

    const services =
      await readServices();

    const service =
      services.find(
        (item) =>
          item.id ===
            serviceId &&
          item.isActive,
      );

    if (!service) {
      return NextResponse.json(
        {
          error:
            "Selected parcel / transport service is not active.",
        },
        { status: 400 },
      );
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },
      });

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Order not found.",
        },
        { status: 404 },
      );
    }

    if (
      order.type !==
      "RESELLER"
    ) {
      return NextResponse.json(
        {
          error:
            "Manual parcel / transport dispatch is only for reseller bulk orders.",
        },
        { status: 400 },
      );
    }

    if (
      order.status !==
      "PACKED"
    ) {
      return NextResponse.json(
        {
          error:
            "Mark the bulk order as PACKED before dispatch.",
        },
        { status: 400 },
      );
    }

    if (
      order.deliveryChargePending
    ) {
      return NextResponse.json(
        {
          error:
            "Finalize the freight charge before dispatch.",
        },
        { status: 400 },
      );
    }

    const shipment = {
      provider:
        "MANUAL_BULK",
      serviceId:
        service.id,
      serviceType:
        service.type,
      serviceName:
        service.name,
      agencyContact:
        service.phone,
      branch:
        service.branch,
      serviceArea:
        service.serviceArea,
      referenceNumber,
      estimatedDelivery:
        estimatedDelivery ||
        null,
      notes:
        notes ||
        service.notes ||
        null,
      dispatchedAt:
        new Date().toISOString(),
      createdAt:
        new Date().toISOString(),
    };

    await prisma.$transaction([
      prisma.siteSetting.upsert({
        where: {
          key:
            `shipment_v1_${orderId}`,
        },
        update: {
          value:
            JSON.stringify(
              shipment,
            ),
        },
        create: {
          key:
            `shipment_v1_${orderId}`,
          value:
            JSON.stringify(
              shipment,
            ),
        },
      }),

      prisma.order.update({
        where: {
          id: orderId,
        },
        data: {
          status:
            "SHIPPED",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message:
        "Bulk order dispatched successfully.",
      shipment,
      status:
        "SHIPPED",
    });
  } catch (error) {
    console.error(
      "Bulk dispatch failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bulk dispatch failed.",
      },
      { status: 500 },
    );
  }
}

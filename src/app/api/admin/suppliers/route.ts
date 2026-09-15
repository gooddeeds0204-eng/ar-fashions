import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
} from "@/lib/admin-auth";
import {
  requireSameOriginJson,
} from "@/lib/public-write-security";

function cleanString(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

function cleanPhone(
  value: unknown,
) {
  return cleanString(value)
    .replace(
      /[\s()-]/g,
      "",
    );
}

function validPhone(
  value: string,
) {
  return (
    !value ||
    /^\+?\d{7,15}$/.test(
      value,
    )
  );
}

function validEmail(
  value: string,
) {
  return (
    !value ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value,
    )
  );
}

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  try {
    const suppliers =
      await prisma.supplier.findMany({
        orderBy: [
          {
            isActive: "desc",
          },
          {
            name: "asc",
          },
        ],
        include: {
          _count: {
            select: {
              purchaseOrders:
                true,
            },
          },

          purchaseOrders: {
            orderBy: {
              createdAt:
                "desc",
            },

            take: 20,

            select: {
              id: true,
              poNumber: true,
              status: true,
              subtotal: true,
              expectedAt: true,
              orderedAt: true,
              receivedAt: true,
              createdAt: true,

              items: {
                select: {
                  orderedQty:
                    true,

                  receivedQty:
                    true,
                },
              },
            },
          },
        },
      });

    return NextResponse.json({
      success: true,

      suppliers:
        suppliers.map(
          (supplier) => {
            const activeOrders =
              supplier.purchaseOrders.filter(
                (order) =>
                  order.status !==
                  "CANCELLED",
              );

            const purchaseOrderCount =
              supplier._count
                .purchaseOrders;

            const totalPurchaseValue =
              activeOrders.reduce(
                (
                  total,
                  order,
                ) =>
                  total +
                  Number(
                    order.subtotal,
                  ),
                0,
              );

            const orderedPieces =
              activeOrders.reduce(
                (
                  total,
                  order,
                ) =>
                  total +
                  order.items.reduce(
                    (
                      itemTotal,
                      item,
                    ) =>
                      itemTotal +
                      item.orderedQty,
                    0,
                  ),
                0,
              );

            const receivedPieces =
              activeOrders.reduce(
                (
                  total,
                  order,
                ) =>
                  total +
                  order.items.reduce(
                    (
                      itemTotal,
                      item,
                    ) =>
                      itemTotal +
                      item.receivedQty,
                    0,
                  ),
                0,
              );

            const pendingPieces =
              Math.max(
                0,
                orderedPieces -
                  receivedPieces,
              );

            const activeIncomingPOCount =
              supplier.purchaseOrders.filter(
                (order) =>
                  order.status ===
                    "ORDERED" ||
                  order.status ===
                    "PARTIALLY_RECEIVED",
              ).length;

            const draftPOCount =
              supplier.purchaseOrders.filter(
                (order) =>
                  order.status ===
                  "DRAFT",
              ).length;

            const receivedPOCount =
              supplier.purchaseOrders.filter(
                (order) =>
                  order.status ===
                  "RECEIVED",
              ).length;

            const cancelledPOCount =
              supplier.purchaseOrders.filter(
                (order) =>
                  order.status ===
                  "CANCELLED",
              ).length;

            const lastPurchase =
              activeOrders[0] ??
              null;

            const purchaseHistory =
              supplier.purchaseOrders.map(
                (order) => {
                  const orderPieces =
                    order.items.reduce(
                      (
                        total,
                        item,
                      ) =>
                        total +
                        item.orderedQty,
                      0,
                    );

                  const historyReceived =
                    order.items.reduce(
                      (
                        total,
                        item,
                      ) =>
                        total +
                        item.receivedQty,
                      0,
                    );

                  return {
                    id:
                      order.id,

                    poNumber:
                      order.poNumber,

                    status:
                      order.status,

                    subtotal:
                      Number(
                        order.subtotal,
                      ),

                    orderedPieces:
                      orderPieces,

                    receivedPieces:
                      historyReceived,

                    pendingPieces:
                      Math.max(
                        0,
                        orderPieces -
                          historyReceived,
                      ),

                    expectedAt:
                      order.expectedAt,

                    orderedAt:
                      order.orderedAt,

                    receivedAt:
                      order.receivedAt,

                    createdAt:
                      order.createdAt,
                  };
                },
              );

            return {
              id:
                supplier.id,

              name:
                supplier.name,

              contactName:
                supplier.contactName,

              phone:
                supplier.phone,

              whatsapp:
                supplier.whatsapp,

              email:
                supplier.email,

              gstNumber:
                supplier.gstNumber,

              addressLine:
                supplier.addressLine,

              city:
                supplier.city,

              state:
                supplier.state,

              pincode:
                supplier.pincode,

              notes:
                supplier.notes,

              isActive:
                supplier.isActive,

              createdAt:
                supplier.createdAt,

              updatedAt:
                supplier.updatedAt,

              purchaseOrderCount,

              totalPurchaseValue,

              orderedPieces,

              receivedPieces,

              pendingPieces,

              activeIncomingPOCount,

              draftPOCount,

              receivedPOCount,

              cancelledPOCount,

              lastPurchaseAt:
                lastPurchase
                  ?.createdAt ??
                null,

              purchaseHistory,
            };
          },
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/admin/suppliers failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load suppliers.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  const requestGuard =
    requireSameOriginJson(
      request,
    );

  if (requestGuard) {
    return requestGuard;
  }

  try {
    const body =
      await request.json();

    const name =
      cleanString(
        body.name,
      );

    const contactName =
      cleanString(
        body.contactName,
      );

    const phone =
      cleanPhone(
        body.phone,
      );

    const whatsapp =
      cleanPhone(
        body.whatsapp,
      );

    const email =
      cleanString(
        body.email,
      ).toLowerCase();

    const gstNumber =
      cleanString(
        body.gstNumber,
      ).toUpperCase();

    const addressLine =
      cleanString(
        body.addressLine,
      );

    const city =
      cleanString(
        body.city,
      );

    const state =
      cleanString(
        body.state,
      );

    const pincode =
      cleanString(
        body.pincode,
      );

    const notes =
      cleanString(
        body.notes,
      );

    if (
      name.length < 2
    ) {
      return NextResponse.json(
        {
          error:
            "Supplier name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !validPhone(phone) ||
      !validPhone(whatsapp)
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid supplier phone number.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !validEmail(email)
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      gstNumber &&
      !/^[0-9A-Z]{15}$/.test(
        gstNumber,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "GSTIN must be 15 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      pincode &&
      !/^\d{6}$/.test(
        pincode,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Pincode must be 6 digits.",
        },
        {
          status: 400,
        },
      );
    }

    const existing =
      await prisma.supplier.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "A supplier with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const supplier =
      await prisma.supplier.create({
        data: {
          name,

          contactName:
            contactName ||
            null,

          phone:
            phone || null,

          whatsapp:
            whatsapp ||
            null,

          email:
            email || null,

          gstNumber:
            gstNumber ||
            null,

          addressLine:
            addressLine ||
            null,

          city:
            city || null,

          state:
            state || null,

          pincode:
            pincode || null,

          notes:
            notes || null,
        },
      });

    return NextResponse.json(
      {
        success: true,
        supplier,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/admin/suppliers failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to create supplier.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  const requestGuard =
    requireSameOriginJson(
      request,
    );

  if (requestGuard) {
    return requestGuard;
  }

  try {
    const body =
      await request.json();

    const id =
      cleanString(
        body.id,
      );

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Supplier ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const existing =
      await prisma.supplier.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Supplier not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      typeof body.isActive ===
        "boolean" &&
      Object.keys(body).every(
        (key) =>
          [
            "id",
            "isActive",
          ].includes(key),
      )
    ) {
      const supplier =
        await prisma.supplier.update({
          where: {
            id,
          },
          data: {
            isActive:
              body.isActive,
          },
        });

      return NextResponse.json({
        success: true,
        supplier,
      });
    }

    const name =
      cleanString(
        body.name,
      );

    const contactName =
      cleanString(
        body.contactName,
      );

    const phone =
      cleanPhone(
        body.phone,
      );

    const whatsapp =
      cleanPhone(
        body.whatsapp,
      );

    const email =
      cleanString(
        body.email,
      ).toLowerCase();

    const gstNumber =
      cleanString(
        body.gstNumber,
      ).toUpperCase();

    const addressLine =
      cleanString(
        body.addressLine,
      );

    const city =
      cleanString(
        body.city,
      );

    const state =
      cleanString(
        body.state,
      );

    const pincode =
      cleanString(
        body.pincode,
      );

    const notes =
      cleanString(
        body.notes,
      );

    if (
      name.length < 2
    ) {
      return NextResponse.json(
        {
          error:
            "Supplier name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !validPhone(phone) ||
      !validPhone(whatsapp)
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid supplier phone number.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !validEmail(email)
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      gstNumber &&
      !/^[0-9A-Z]{15}$/.test(
        gstNumber,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "GSTIN must be 15 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      pincode &&
      !/^\d{6}$/.test(
        pincode,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Pincode must be 6 digits.",
        },
        {
          status: 400,
        },
      );
    }

    const duplicate =
      await prisma.supplier.findFirst({
        where: {
          id: {
            not: id,
          },
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "A supplier with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const supplier =
      await prisma.supplier.update({
        where: {
          id,
        },
        data: {
          name,

          contactName:
            contactName ||
            null,

          phone:
            phone || null,

          whatsapp:
            whatsapp ||
            null,

          email:
            email || null,

          gstNumber:
            gstNumber ||
            null,

          addressLine:
            addressLine ||
            null,

          city:
            city || null,

          state:
            state || null,

          pincode:
            pincode || null,

          notes:
            notes || null,

          isActive:
            typeof body.isActive ===
            "boolean"
              ? body.isActive
              : existing.isActive,
        },
      });

    return NextResponse.json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/suppliers failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update supplier.",
      },
      {
        status: 500,
      },
    );
  }
}

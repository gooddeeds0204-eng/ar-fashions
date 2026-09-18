import {
  NextResponse,
} from "next/server";
import {
  requireAdmin,
} from "@/lib/admin-auth";
import {
  prisma,
} from "@/lib/prisma";
import {
  assignShiprocketAwb,
  createShiprocketOrder,
  generateShiprocketPickup,
  getShiprocketServiceability,
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

function shipmentKey(
  orderId: string,
) {
  return `shipment_v1_${orderId}`;
}

async function readShipment(
  orderId: string,
) {
  const row =
    await prisma.siteSetting.findUnique({
      where: {
        key:
          shipmentKey(
            orderId,
          ),
      },
    });

  if (!row) {
    return null;
  }

  try {
    return JSON.parse(
      row.value,
    ) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function packageNumber(
  value: unknown,
  fallback: number,
) {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  ) &&
    number > 0
    ? Math.round(
        number * 100,
      ) / 100
    : fallback;
}

export async function GET(
  request: Request,
) {
  const auth =
    await requireAdmin();

  if (auth) {
    return auth;
  }

  const url =
    new URL(request.url);

  const orderId =
    clean(
      url.searchParams.get(
        "orderId",
      ),
    );

  if (!orderId) {
    return NextResponse.json(
      {
        error:
          "Order ID is required.",
      },
      { status: 400 },
    );
  }

  const shipment =
    await readShipment(
      orderId,
    );

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
        "Shiprocket tracking refresh failed:",
        error,
      );
    }
  }

  return NextResponse.json({
    success: true,
    configured:
      isShiprocketConfigured(),
    shipment,
    tracking,
  });
}

export async function POST(
  request: Request,
) {
  const auth =
    await requireAdmin();

  if (auth) {
    return auth;
  }

  if (
    !isShiprocketConfigured()
  ) {
    return NextResponse.json(
      {
        error:
          "Shiprocket is not configured yet.",
      },
      { status: 503 },
    );
  }

  try {
    const body =
      await request.json();

    const orderId =
      clean(body.orderId);

    const action =
      clean(
        body.action ??
          "CREATE_SHIPMENT",
      ).toUpperCase();

    if (!orderId) {
      return NextResponse.json(
        {
          error:
            "Order ID is required.",
        },
        { status: 400 },
      );
    }

    const existing =
      await readShipment(
        orderId,
      );

    if (
      action === "TRACK"
    ) {
      const awbCode =
        clean(
          existing?.awbCode,
        );

      if (!awbCode) {
        return NextResponse.json(
          {
            error:
              "AWB is not available yet.",
          },
          { status: 400 },
        );
      }

      const tracking =
        await trackShiprocketAwb(
          awbCode,
        );

      return NextResponse.json({
        success: true,
        shipment:
          existing,
        tracking,
      });
    }

    if (
      action !==
      "CREATE_SHIPMENT"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid shipping action.",
        },
        { status: 400 },
      );
    }

    if (
      existing?.shipmentId &&
      existing?.awbCode
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Shipment already exists.",
        shipment:
          existing,
      });
    }

    const weightKg =
      packageNumber(
        body.weightKg,
        0.5,
      );

    const lengthCm =
      packageNumber(
        body.lengthCm,
        20,
      );

    const breadthCm =
      packageNumber(
        body.breadthCm,
        15,
      );

    const heightCm =
      packageNumber(
        body.heightCm,
        5,
      );

    const requestedCourierId =
      Number(
        body.courierId,
      );

    const order =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          user: true,
          address: true,
          payment: true,
          items: {
            include: {
              product: {
                select: {
                  sku: true,
                },
              },
              variant: {
                select: {
                  sku: true,
                },
              },
            },
          },
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
      !order.address
    ) {
      throw new Error(
        "Delivery address is missing.",
      );
    }

    if (
      ![
        "CONFIRMED",
        "PACKED",
      ].includes(
        order.status,
      )
    ) {
      throw new Error(
        "Confirm the order before creating a shipment.",
      );
    }

    if (
      order.deliveryChargePending
    ) {
      throw new Error(
        "Finalize reseller freight before creating the shipment.",
      );
    }

    if (
      order.payment?.provider ===
        "RAZORPAY" &&
      order.paymentStatus !==
        "PAID"
    ) {
      throw new Error(
        "Online payment must be paid before shipping.",
      );
    }

    const cod =
      order.payment?.provider ===
        "COD" &&
      order.paymentStatus !==
        "PAID";

    const serviceability =
      await getShiprocketServiceability({
        deliveryPincode:
          order.address
            .pincode,
        weightKg,
        cod,
      });

    if (
      serviceability.couriers
        .length === 0
    ) {
      throw new Error(
        "No Shiprocket courier is serviceable for this pincode and package.",
      );
    }

    const chosenCourier =
      Number.isFinite(
        requestedCourierId,
      )
        ? serviceability.couriers.find(
            (item) =>
              Number(
                item.courier_company_id,
              ) ===
              requestedCourierId,
          )
        : serviceability.couriers.find(
            (item) =>
              Number(
                item.courier_company_id,
              ) ===
              serviceability.recommendedCourierId,
          ) ??
          [...serviceability.couriers].sort(
            (a, b) =>
              Number(a.rate) -
              Number(b.rate),
          )[0];

    if (!chosenCourier) {
      throw new Error(
        "Selected courier is not available.",
      );
    }

    const shippingCharge =
      Number(
        order.deliveryCharge,
      );

    const shipmentOrder =
      await createShiprocketOrder({
        orderNumber:
          order.orderNumber,
        orderDate:
          order.createdAt,
        customerName:
          order.address.name ||
          order.user.name ||
          "Customer",
        email:
          order.user.email ||
          process.env
            .SHIPROCKET_FALLBACK_EMAIL ||
          process.env
            .SHIPROCKET_API_EMAIL ||
          "",
        phone:
          order.address.phone,
        addressLine1:
          order.address
            .addressLine1,
        addressLine2:
          order.address
            .addressLine2,
        city:
          order.address.city,
        state:
          order.address.state,
        pincode:
          order.address.pincode,
        items:
          order.items.map(
            (item) => ({
              name:
                item.productName,
              sku:
                item.variant?.sku ||
                item.product.sku ||
                item.productId,
              units:
                item.quantity,
              sellingPrice:
                Number(
                  item.unitPrice,
                ),
            }),
          ),
        paymentMethod:
          cod
            ? "COD"
            : "PREPAID",
        shippingCharge:
          Number.isFinite(
            shippingCharge,
          )
            ? shippingCharge
            : 0,
        subTotal:
          Math.max(
            0,
            Number(
              order.totalAmount,
            ) -
              (Number.isFinite(
                shippingCharge,
              )
                ? shippingCharge
                : 0),
          ),
        weightKg,
        lengthCm,
        breadthCm,
        heightCm,
      });

    const shipmentId =
      Number(
        shipmentOrder
          .shipment_id,
      );

    if (
      !Number.isFinite(
        shipmentId,
      ) ||
      shipmentId <= 0
    ) {
      throw new Error(
        "Shiprocket did not return a shipment ID.",
      );
    }

    const awbResponse =
      await assignShiprocketAwb(
        shipmentId,
        Number(
          chosenCourier
            .courier_company_id,
        ),
      );

    const awbData =
      awbResponse.response
        ?.data;

    const awbCode =
      clean(
        awbData?.awb_code ??
          shipmentOrder.awb_code,
      );

    if (!awbCode) {
      throw new Error(
        "Shiprocket could not assign an AWB.",
      );
    }

    let pickup:
      Record<
        string,
        unknown
      > | null = null;

    try {
      pickup =
        await generateShiprocketPickup(
          shipmentId,
        ) as unknown as Record<
          string,
          unknown
        >;
    } catch (error) {
      console.error(
        "Pickup scheduling failed after AWB assignment:",
        error,
      );
    }

    const shipment = {
      provider:
        "SHIPROCKET",
      providerOrderId:
        Number(
          shipmentOrder.order_id,
        ) || null,
      shipmentId,
      awbCode,
      courierId:
        Number(
          chosenCourier
            .courier_company_id,
        ),
      courierName:
        awbData
          ?.courier_name ||
        chosenCourier
          .courier_name,
      courierRate:
        Number(
          chosenCourier.rate,
        ) || 0,
      estimatedDeliveryDays:
        chosenCourier
          .estimated_delivery_days,
      etd:
        chosenCourier.etd ??
        null,
      package: {
        weightKg,
        lengthCm,
        breadthCm,
        heightCm,
      },
      pickupScheduled:
        Boolean(pickup),
      createdAt:
        new Date().toISOString(),
    };

    await prisma.siteSetting.upsert({
      where: {
        key:
          shipmentKey(
            orderId,
          ),
      },
      update: {
        value:
          JSON.stringify(
            shipment,
          ),
      },
      create: {
        key:
          shipmentKey(
            orderId,
          ),
        value:
          JSON.stringify(
            shipment,
          ),
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Shiprocket shipment created successfully.",
      shipment,
      pickup,
    });
  } catch (error) {
    console.error(
      "Shiprocket admin action failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Shipping action failed.",
      },
      { status: 400 },
    );
  }
}

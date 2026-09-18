import {
  NextResponse,
} from "next/server";
import {
  getShiprocketServiceability,
  isShiprocketConfigured,
} from "@/lib/shiprocket";
import {
  enforcePublicRateLimit,
} from "@/lib/public-write-security";

export async function GET(
  request: Request,
) {
  if (
    !isShiprocketConfigured()
  ) {
    return NextResponse.json({
      success: true,
      enabled: false,
      serviceable: null,
      couriers: [],
    });
  }

  const limited =
    await enforcePublicRateLimit(
      request,
      {
        scope:
          "shipping-serviceability",
        limit: 20,
        windowSeconds: 60,
      },
    );

  if (limited) {
    return limited;
  }

  const url =
    new URL(request.url);

  const pincode =
    String(
      url.searchParams.get(
        "pincode",
      ) ?? "",
    ).trim();

  const weight =
    Math.min(
      30,
      Math.max(
        0.5,
        Number(
          url.searchParams.get(
            "weight",
          ) ?? 0.5,
        ) || 0.5,
      ),
    );

  const cod =
    url.searchParams.get(
      "cod",
    ) === "1";

  if (
    !/^\d{6}$/.test(
      pincode,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Enter a valid 6-digit pincode.",
      },
      { status: 400 },
    );
  }

  try {
    const result =
      await getShiprocketServiceability({
        deliveryPincode:
          pincode,
        weightKg:
          weight,
        cod,
      });

    const couriers =
      result.couriers
        .map((courier) => ({
          courierId:
            Number(
              courier.courier_company_id,
            ),
          name:
            courier.courier_name,
          rate:
            Number(
              courier.rate,
            ) || 0,
          estimatedDays:
            courier
              .estimated_delivery_days,
          etd:
            courier.etd ??
            null,
          rating:
            Number(
              courier.rating,
            ) || null,
        }))
        .sort(
          (a, b) =>
            a.rate - b.rate,
        )
        .slice(0, 5);

    return NextResponse.json({
      success: true,
      enabled: true,
      serviceable:
        couriers.length > 0,
      recommendedCourierId:
        result.recommendedCourierId,
      couriers,
    });
  } catch (error) {
    console.error(
      "Shipping serviceability failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not check delivery serviceability.",
      },
      { status: 502 },
    );
  }
}

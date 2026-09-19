import { NextResponse } from "next/server";

import {
  enforcePublicRateLimit,
  requireSameOriginJson,
} from "@/lib/public-write-security";

export async function POST(
  request: Request,
) {
  const requestGuard =
    requireSameOriginJson(
      request,
    );

  if (requestGuard) {
    return requestGuard;
  }

  const rateLimit =
    await enforcePublicRateLimit(
      request,
      {
        scope:
          "reverse-geocode",
        limit: 30,
        windowSeconds:
          60 * 10,
      },
    );

  if (rateLimit) {
    return rateLimit;
  }

  try {
    const body =
      await request.json();

    const latitude =
      Number(
        body.latitude,
      );

    const longitude =
      Number(
        body.longitude,
      );

    if (
      !Number.isFinite(
        latitude,
      ) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(
        longitude,
      ) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid location.",
        },
        {
          status: 400,
        },
      );
    }

    const url =
      new URL(
        "https://nominatim.openstreetmap.org/reverse",
      );

    url.searchParams.set(
      "format",
      "jsonv2",
    );

    url.searchParams.set(
      "lat",
      String(latitude),
    );

    url.searchParams.set(
      "lon",
      String(longitude),
    );

    url.searchParams.set(
      "addressdetails",
      "1",
    );

    url.searchParams.set(
      "zoom",
      "18",
    );

    const response =
      await fetch(
        url.toString(),
        {
          cache: "no-store",
          headers: {
            Accept:
              "application/json",
            "Accept-Language":
              "en",
            "User-Agent":
              "AS-Fashions/1.0",
          },
        },
      );

    if (!response.ok) {
      throw new Error(
        "Reverse geocoding failed.",
      );
    }

    const data =
      await response.json();

    const address =
      data.address ?? {};

    const city =
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      address.city_district ??
      address.county ??
      "";

    const state =
      address.state ?? "";

    const pincode =
      String(
        address.postcode ?? "",
      )
        .replace(
          /\D/g,
          "",
        )
        .slice(0, 6);

    const addressLine =
      String(
        data.display_name ??
          "",
      ).trim();

    return NextResponse.json({
      success: true,
      addressLine,
      city,
      state,
      pincode,
    });
  } catch (error) {
    console.error(
      "POST /api/reverse-geocode failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to detect address from location.",
      },
      {
        status: 500,
      },
    );
  }
}

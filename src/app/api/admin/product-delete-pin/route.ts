import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  hasProductDeletePin,
  setProductDeletePin,
  validateProductDeletePin,
  verifyProductDeletePin,
} from "@/lib/product-delete-pin";

export async function GET() {
  const adminError =
    await requireAdmin();

  if (adminError) {
    return adminError;
  }

  return NextResponse.json({
    success: true,
    configured:
      await hasProductDeletePin(),
  });
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

    const pin =
      String(
        body.pin ?? "",
      ).trim();

    const currentPin =
      String(
        body.currentPin ?? "",
      ).trim();

    const validation =
      validateProductDeletePin(pin);

    if (validation) {
      return NextResponse.json(
        { error: validation },
        { status: 400 },
      );
    }

    const configured =
      await hasProductDeletePin();

    if (configured) {
      const current =
        await verifyProductDeletePin(
          currentPin,
        );

      if (!current.valid) {
        return NextResponse.json(
          {
            error:
              "Current delete PIN is incorrect.",
          },
          { status: 403 },
        );
      }
    }

    await setProductDeletePin(pin);

    return NextResponse.json({
      success: true,
      configured: true,
      message: configured
        ? "Product delete PIN changed successfully."
        : "Product delete PIN set successfully.",
    });
  } catch (error) {
    console.error(
      "PUT product delete PIN failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to save product delete PIN.",
      },
      { status: 500 },
    );
  }
}

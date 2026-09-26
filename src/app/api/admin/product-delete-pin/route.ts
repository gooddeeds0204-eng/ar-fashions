import { NextResponse } from "next/server";
import {
  getAuthenticatedAdmin,
  requireAdmin,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
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

    const adminEmail =
      String(
        body.adminEmail ?? "",
      )
        .trim()
        .toLowerCase();

    const adminPassword =
      String(
        body.adminPassword ?? "",
      );

    const validation =
      validateProductDeletePin(pin);

    if (validation) {
      return NextResponse.json(
        { error: validation },
        { status: 400 },
      );
    }

    if (
      !adminEmail ||
      !adminPassword
    ) {
      return NextResponse.json(
        {
          error:
            "Admin ID/email and password are required.",
        },
        { status: 400 },
      );
    }

    const sessionAdmin =
      await getAuthenticatedAdmin();

    if (!sessionAdmin) {
      return NextResponse.json(
        {
          error:
            "Admin session expired. Please login again.",
        },
        { status: 401 },
      );
    }

    if (
      (
        sessionAdmin.email ??
        ""
      ).toLowerCase() !==
      adminEmail
    ) {
      return NextResponse.json(
        {
          error:
            "Admin ID/email does not match the logged-in admin.",
        },
        { status: 403 },
      );
    }

    const admin =
      await prisma.user.findFirst({
        where: {
          id:
            sessionAdmin.id,
          role: "ADMIN",
          status: "ACTIVE",
        },
        select: {
          passwordHash: true,
        },
      });

    const passwordValid =
      Boolean(
        admin?.passwordHash,
      ) &&
      await verifyPassword(
        adminPassword,
        admin?.passwordHash ??
          "",
      );

    if (!passwordValid) {
      return NextResponse.json(
        {
          error:
            "Admin password is incorrect.",
        },
        { status: 403 },
      );
    }

    const configured =
      await hasProductDeletePin();

    await setProductDeletePin(pin);

    return NextResponse.json({
      success: true,
      configured: true,
      message: configured
        ? "Product delete PIN changed after admin verification."
        : "Product delete PIN set after admin verification.",
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

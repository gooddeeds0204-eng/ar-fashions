import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_OPTIONS,
  createAdminSessionToken,
} from "@/lib/admin-session";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json();

    const email =
      cleanString(
        body.email,
      ).toLowerCase();

    const password =
      cleanString(body.password);

    if (!email || !password) {
      return NextResponse.json(
        {
          error:
            "Email and password are required.",
        },
        { status: 400 },
      );
    }

    const admin =
      await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          role: true,
          status: true,
        },
      });

    const valid =
      admin &&
      admin.role === "ADMIN" &&
      admin.status === "ACTIVE" &&
      admin.passwordHash &&
      verifyPassword(
        password,
        admin.passwordHash,
      );

    if (!valid || !admin) {
      return NextResponse.json(
        {
          error:
            "Invalid email or password.",
        },
        { status: 401 },
      );
    }

    const response =
      NextResponse.json({
        success: true,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
        },
      });

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminSessionToken(
        admin.id,
      ),
      ADMIN_SESSION_OPTIONS,
    );

    return response;
  } catch (error) {
    console.error(
      "POST /api/admin/login failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to sign in.",
      },
      { status: 500 },
    );
  }
}

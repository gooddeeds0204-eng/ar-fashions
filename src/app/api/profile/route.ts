import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedCustomer,
} from "@/lib/customer-auth";

function cleanString(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

function validEmail(
  value: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

export async function GET() {
  try {
    const user =
      await getAuthenticatedCustomer();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Customer session is no longer valid.",
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "GET /api/profile failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load profile.",
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
  try {
    const user =
      await getAuthenticatedCustomer();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Customer session is no longer valid.",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json();

    const name =
      cleanString(
        body.name,
      );

    const phone =
      cleanString(
        body.phone,
      );

    const rawEmail =
      cleanString(
        body.email,
      );

    const email =
      rawEmail
        ? rawEmail.toLowerCase()
        : null;

    if (
      name.length < 2 ||
      name.length > 80
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid full name.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !/^[6-9]\d{9}$/.test(
        phone,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid 10 digit mobile number.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      email &&
      (
        email.length > 160 ||
        !validEmail(email)
      )
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

    const phoneOwner =
      await prisma.user.findFirst({
        where: {
          phone,
          id: {
            not: user.id,
          },
        },
        select: {
          id: true,
        },
      });

    if (phoneOwner) {
      return NextResponse.json(
        {
          error:
            "This mobile number is already linked to another account.",
        },
        {
          status: 409,
        },
      );
    }

    if (email) {
      const emailOwner =
        await prisma.user.findFirst({
          where: {
            email,
            id: {
              not: user.id,
            },
          },
          select: {
            id: true,
          },
        });

      if (emailOwner) {
        return NextResponse.json(
          {
            error:
              "This email is already linked to another account.",
          },
          {
            status: 409,
          },
        );
      }
    }

    const updatedUser =
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          name,
          phone,
          email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isReseller: true,
        },
      });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "PATCH /api/profile failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update personal information.",
      },
      {
        status: 500,
      },
    );
  }
}

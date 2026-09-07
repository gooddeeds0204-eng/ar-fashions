import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "asc",
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

    if (!user) {
      return NextResponse.json(
        { error: "No active user found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("GET /api/session failed:", error);

    return NextResponse.json(
      { error: "Failed to load session user." },
      { status: 500 },
    );
  }
}

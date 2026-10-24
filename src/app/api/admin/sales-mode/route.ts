import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { requireSameOriginJson } from "@/lib/public-write-security";

export const dynamic = "force-dynamic";

type Status = "OPEN" | "CLOSED";

export async function PATCH(request: Request) {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  const originError = requireSameOriginJson(request);
  if (originError) return originError;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const mode = payload.mode;
    const status = payload.status;

    if (
      (mode !== "retail" && mode !== "reseller") ||
      (status !== "OPEN" && status !== "CLOSED")
    ) {
      return NextResponse.json(
        { error: "Choose Retail or Reseller and a valid ON/OFF status." },
        { status: 400 },
      );
    }

    const value = status as Status;
    const data = mode === "retail"
      ? {
          retailStatus: value,
          retailMessage: value === "OPEN"
            ? "Retail shopping is open."
            : "Retail shopping is temporarily unavailable.",
        }
      : {
          resellerStatus: value,
          resellerMessage: value === "OPEN"
            ? "Reseller orders are open."
            : "Reseller orders are temporarily unavailable.",
        };

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.salesMode.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      if (existing) {
        return tx.salesMode.update({
          where: { id: existing.id },
          data,
        });
      }

      return tx.salesMode.create({ data });
    });

    return NextResponse.json(
      {
        success: true,
        salesMode: {
          retailStatus: updated.retailStatus,
          resellerStatus: updated.resellerStatus,
        },
        message: mode === "retail"
          ? `Retail Mode turned ${status === "OPEN" ? "ON" : "OFF"}.`
          : `Reseller Mode turned ${status === "OPEN" ? "ON" : "OFF"}.`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("PATCH admin sales mode failed:", error);
    return NextResponse.json(
      { error: "Could not update store mode. Please try again." },
      { status: 500 },
    );
  }
}

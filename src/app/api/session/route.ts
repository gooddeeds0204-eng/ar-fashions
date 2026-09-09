import { NextResponse } from "next/server";
import {
  getAuthenticatedCustomer,
} from "@/lib/customer-auth";

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
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "GET /api/session failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load customer session.",
      },
      { status: 500 },
    );
  }
}

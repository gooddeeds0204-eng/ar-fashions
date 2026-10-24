import { NextResponse } from "next/server";
import { googleConfig } from "@/lib/google-oauth";

export async function GET() {
  return NextResponse.json(
    { enabled: Boolean(googleConfig()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

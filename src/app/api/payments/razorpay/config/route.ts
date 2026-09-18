import { NextResponse } from "next/server";
import {
  getRazorpayKeyId,
  isRazorpayConfigured,
} from "@/lib/razorpay";

export async function GET() {
  return NextResponse.json({
    success: true,
    enabled:
      isRazorpayConfigured(),
    keyId:
      isRazorpayConfigured()
        ? getRazorpayKeyId()
        : "",
  });
}

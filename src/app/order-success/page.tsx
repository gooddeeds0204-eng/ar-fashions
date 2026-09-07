"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderNumber = searchParams.get("orderNumber");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
          ✓
        </div>

        <h1 className="mt-6 text-3xl font-black">
          Order Placed!
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Thank you for shopping with AR FASHIONS.
          Your order has been successfully placed.
        </p>

        {orderNumber && (
          <div className="mt-6 rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Order Number
            </p>

            <p className="mt-2 text-lg font-black">
              {orderNumber}
            </p>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-left">
          <p className="text-xs font-black text-emerald-700">
            CASH ON DELIVERY
          </p>

          <p className="mt-1 text-xs leading-5 text-emerald-700/80">
            Pay when your order is delivered.
          </p>
        </div>

        <button
          onClick={() => router.push("/")}
          className="mt-6 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white hover:bg-emerald-600"
        >
          Continue Shopping
        </button>
      </div>
    </main>
  );
}

function LoadingOrderSuccess() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
      <p className="text-sm font-semibold text-zinc-500">
        Loading...
      </p>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<LoadingOrderSuccess />}>
      <OrderSuccessContent />
    </Suspense>
  );
}

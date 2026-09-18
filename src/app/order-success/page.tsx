"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import {
  useSearchParams,
  useRouter,
} from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

function OrderSuccessContent() {
  const searchParams =
    useSearchParams();

  const router =
    useRouter();

  const orderNumber =
    searchParams.get(
      "orderNumber",
    );

  const [
    showSuccessToast,
    setShowSuccessToast,
  ] = useState(true);

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setShowSuccessToast(
            false,
          );
        },
        3500,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FAF7F0] px-4 pb-10 pt-6 text-[#211C18]">
      {/* BACKGROUND DECORATION */}
      <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl" />

      {/* SUCCESS TOAST */}
      {showSuccessToast && (
        <div className="fixed left-1/2 top-[78px] z-[80] w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-[1.35rem] border border-emerald-300/25 bg-[#031B14]/95 p-3.5 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-400 text-xl font-black text-[#031B14]">
              ✓
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Order Confirmed
              </p>

              <p className="mt-1 text-[13px] font-black text-white">
                Order placed successfully
              </p>

              {orderNumber && (
                <p className="mt-0.5 truncate text-[9px] font-semibold text-white/55">
                  #{orderNumber}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/my-orders",
                )
              }
              className="shrink-0 rounded-full bg-white px-4 py-2.5 text-[9px] font-black text-[#031B14]"
            >
              View →
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="relative z-10 mx-auto flex max-w-md items-center justify-between">
        <BrandLogo
          light
          compact
          onClick={() =>
            router.push("/")
          }
        />

        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[7px] font-black uppercase tracking-[0.16em] text-emerald-300">
          Order Complete
        </span>
      </header>

      {/* SUCCESS CONTENT */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-md items-center py-8">
        <div className="w-full overflow-hidden rounded-[2rem] border border-[#E4D7C4] bg-[#FFFDF9] shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="px-6 pb-6 pt-8 text-center">
            <div className="relative mx-auto grid h-24 w-24 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/10" />

              <span className="relative grid h-20 w-20 place-items-center rounded-full border border-emerald-300/30 bg-emerald-400 text-4xl font-black text-[#031B14] shadow-[0_0_40px_rgba(52,211,153,0.25)]">
                ✓
              </span>
            </div>

            <p className="mt-6 text-[8px] font-black uppercase tracking-[0.28em] text-emerald-300">
              Thank you for shopping
            </p>

            <h1 className="mt-3 font-serif text-[2.7rem] leading-[0.92] tracking-[-0.04em] text-[#211C18]">
              Your order
              <br />
              is confirmed.
            </h1>

            <p className="mx-auto mt-4 max-w-xs text-[11px] leading-5 text-[#7B7066]">
              We have received your order and will start preparing it for dispatch.
            </p>
          </div>

          {orderNumber && (
            <div className="mx-4 rounded-[1.35rem] border border-[#D9C29A] bg-[#F1E8DA] px-4 py-4 text-center">
              <p className="text-[7px] font-black uppercase tracking-[0.22em] text-[#7B7066]">
                Order Number
              </p>

              <p className="mt-2 break-all text-[17px] font-black tracking-[-0.02em] text-[#211C18]">
                {orderNumber}
              </p>
            </div>
          )}

          <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
            {[
              [
                "✓",
                "Confirmed",
                "Order received",
              ],
              [
                "₹",
                "COD",
                "Pay on delivery",
              ],
              [
                "↗",
                "Next",
                "Preparing order",
              ],
            ].map(
              ([
                icon,
                title,
                subtitle,
              ]) => (
                <div
                  key={title}
                  className="rounded-[1.15rem] border border-[#E4D7C4] bg-[#FFFDF9] px-2 py-3 text-center"
                >
                  <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-emerald-400/10 text-[11px] font-black text-emerald-300">
                    {icon}
                  </span>

                  <p className="mt-2 text-[8px] font-black text-[#211C18]">
                    {title}
                  </p>

                  <p className="mt-1 text-[6px] leading-3 text-[#7B7066]">
                    {subtitle}
                  </p>
                </div>
              ),
            )}
          </div>

          <div className="mx-4 mt-3 rounded-[1.25rem] border border-[#E4D7C4] bg-[#FFFDF9] p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm">
                ₹
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">
                  Cash on Delivery
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[#7B7066]">
                  Pay safely when your order reaches you.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/my-orders",
                )
              }
              className="min-h-[54px] w-full rounded-[1.15rem] bg-emerald-400 px-5 text-[11px] font-black uppercase tracking-[0.08em] text-[#031B14] shadow-[0_12px_30px_rgba(52,211,153,0.2)] transition active:scale-[0.98]"
            >
              View My Order →
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="mt-2.5 min-h-[50px] w-full rounded-[1.15rem] border border-[#E4D7C4] bg-[#FFFDF9] px-5 text-[10px] font-black uppercase tracking-[0.08em] text-[#211C18] transition active:scale-[0.98]"
            >
              Continue Shopping
            </button>

            <p className="mt-4 text-center text-[7px] font-semibold uppercase tracking-[0.16em] text-[#7B7066]">
              AS Fashions · Wear Your Story
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function LoadingOrderSuccess() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF7F0] text-[#211C18]">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />

        <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
          Confirming Order
        </p>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <LoadingOrderSuccess />
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}

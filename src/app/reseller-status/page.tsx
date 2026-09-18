"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

type Application = {
  businessName: string;
  city: string;
  state: string;
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED";
  rejectionReason:
    | string
    | null;
};

export default function ResellerStatusPage() {
  const router = useRouter();

  const [
    application,
    setApplication,
  ] =
    useState<Application | null>(
      null,
    );

  const [
    isReseller,
    setIsReseller,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        const response =
          await fetch(
            "/api/reseller-application",
            {
              cache:
                "no-store",
              credentials:
                "same-origin",
            },
          );

        const data =
          await response.json();

        if (
          response.status === 401
        ) {
          router.replace(
            "/login",
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Unable to load application.",
          );
        }

        setApplication(
          data.application ??
            null,
        );

        setIsReseller(
          data.isReseller ===
            true,
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load status.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const status =
    isReseller
      ? "APPROVED"
      : application?.status ??
        "NONE";

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 py-6 text-[#211C18]">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between">
          <BrandLogo
            light
            compact
            onClick={() =>
              router.push("/")
            }
          />

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="rounded-full border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-2 text-[9px] font-black uppercase tracking-wider text-[#7B7066]"
          >
            Home
          </button>
        </header>

        <section className="flex min-h-[75vh] items-center py-12">
          <div className="w-full">
            {loading ? (
              <div className="rounded-[2rem] border border-[#E4D7C4] bg-[#FFFDF9] p-8 text-center text-sm text-[#7B7066]">
                Checking retailer
                status...
              </div>
            ) : error ? (
              <div className="rounded-[2rem] border border-red-400/20 bg-red-500/10 p-7">
                <p className="text-sm font-black text-red-200">
                  Unable to load
                  application
                </p>

                <p className="mt-2 text-xs leading-5 text-red-200/70">
                  {error}
                </p>
              </div>
            ) : status ===
              "APPROVED" ? (
              <div className="rounded-[2rem] border border-[#D4AF37]/25 bg-gradient-to-br from-emerald-400/15 to-white/[0.03] p-7">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#D4AF37] text-2xl text-[#211C18]">
                  ✓
                </div>

                <p className="mt-6 text-[9px] font-black uppercase tracking-[0.25em] text-[#D9C29A]">
                  Application Approved
                </p>

                <h1 className="mt-3 font-serif text-4xl leading-none">
                  Wholesale
                  <br />
                  access unlocked.
                </h1>

                <p className="mt-4 text-sm leading-6 text-[#7B7066]">
                  Your AR retailer
                  account is active.
                  Reseller pricing,
                  MOQ ordering and
                  curated sets are now
                  available automatically.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/")
                  }
                  className="mt-7 w-full rounded-2xl bg-[#D4AF37] py-4 text-[10px] font-black uppercase tracking-wider text-[#211C18]"
                >
                  Enter Reseller Store →
                </button>
              </div>
            ) : status ===
              "REJECTED" ? (
              <div className="rounded-[2rem] border border-red-300/15 bg-white/[0.04] p-7">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-red-500/15 text-xl text-red-300">
                  !
                </div>

                <p className="mt-6 text-[9px] font-black uppercase tracking-[0.25em] text-red-300">
                  Review Complete
                </p>

                <h1 className="mt-3 font-serif text-4xl leading-none">
                  Application
                  <br />
                  needs attention.
                </h1>

                <p className="mt-4 text-sm leading-6 text-[#7B7066]">
                  Your customer account
                  remains active at
                  retail prices.
                </p>

                {application
                  ?.rejectionReason ? (
                  <div className="mt-5 rounded-2xl border border-[#E4D7C4] bg-[#F1E8DA] p-4">
                    <p className="text-[8px] font-black uppercase tracking-wider text-[#7B7066]">
                      AR Review Note
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#7B7066]">
                      {
                        application.rejectionReason
                      }
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/reseller-apply",
                    )
                  }
                  className="mt-7 w-full rounded-2xl bg-white py-4 text-[10px] font-black uppercase tracking-wider text-[#211C18]"
                >
                  Update Registration →
                </button>
              </div>
            ) : status ===
              "NONE" ? (
              <div className="rounded-[2rem] border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/10 to-white/[0.03] p-7">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#D4AF37] font-serif text-xl text-[#211C18]">
                  AS
                </div>

                <p className="mt-6 text-[9px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">
                  AS Fashions Wholesale
                </p>

                <h1 className="mt-3 font-serif text-4xl leading-none">
                  Become an
                  <br />
                  AR reseller.
                </h1>

                <p className="mt-4 text-sm leading-6 text-[#7B7066]">
                  Apply using your existing customer account.
                  After approval, reseller pricing, MOQ ordering
                  and curated wholesale sets will unlock.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/reseller-apply",
                    )
                  }
                  className="mt-7 w-full rounded-2xl bg-[#D4AF37] py-4 text-[10px] font-black uppercase tracking-wider text-[#211C18]"
                >
                  Start Reseller Application →
                </button>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-amber-300/15 bg-gradient-to-br from-amber-400/[0.08] to-white/[0.03] p-7">
                <div className="relative grid h-14 w-14 place-items-center rounded-full bg-amber-400/15 text-xl text-amber-300">
                  ◷
                </div>

                <p className="mt-6 text-[9px] font-black uppercase tracking-[0.25em] text-amber-300">
                  Under AR Review
                </p>

                <h1 className="mt-3 font-serif text-4xl leading-none">
                  Retailer
                  <br />
                  application received.
                </h1>

                <p className="mt-4 text-sm leading-6 text-[#7B7066]">
                  Your account can still
                  shop normally at retail
                  prices. Wholesale prices
                  stay locked until AR
                  Fashions approves your
                  retailer application.
                </p>

                {application ? (
                  <div className="mt-6 rounded-2xl border border-[#E4D7C4] bg-[#F1E8DA] p-4">
                    <p className="text-[8px] font-black uppercase tracking-wider text-[#7B7066]">
                      Application
                    </p>

                    <p className="mt-2 text-sm font-black">
                      {
                        application.businessName
                      }
                    </p>

                    <p className="mt-1 text-[10px] text-[#7B7066]">
                      {
                        application.city
                      }
                      {" · "}
                      {
                        application.state
                      }
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    router.push("/")
                  }
                  className="mt-7 w-full rounded-2xl bg-white py-4 text-[10px] font-black uppercase tracking-wider text-[#211C18]"
                >
                  Continue Retail Shopping →
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

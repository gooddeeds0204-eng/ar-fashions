import Link from "next/link";
import { redirect } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import ResellerDashboardActions from "@/components/ResellerDashboardActions";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedCustomer,
} from "@/lib/customer-auth";

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(value || 0);
}

function niceStatus(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase(),
    );
}

function dateText(
  value: Date,
) {
  return value.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

export default async function ResellerDashboardPage() {
  const user =
    await getAuthenticatedCustomer();

  if (!user) {
    redirect("/login");
  }

  if (!user.isReseller) {
    redirect(
      "/reseller-status",
    );
  }

  const [
    application,
    orders,
  ] = await Promise.all([
    prisma.resellerApplication.findUnique({
      where: {
        userId: user.id,
      },
    }),

    prisma.order.findMany({
      where: {
        userId: user.id,
        type: "RESELLER",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
          },
        },
      },
    }),
  ]);

  const totalPurchaseValue =
    orders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.totalAmount,
        ),
      0,
    );

  const totalPieces =
    orders.reduce(
      (
        orderTotal,
        order,
      ) =>
        orderTotal +
        order.items.reduce(
          (
            itemTotal,
            item,
          ) =>
            itemTotal +
            item.quantity,
          0,
        ),
      0,
    );

  const activeOrders =
    orders.filter(
      (order) =>
        ![
          "DELIVERED",
          "CANCELLED",
          "FAILED",
        ].includes(
          order.status,
        ),
    ).length;

  const latestOrders =
    orders.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/account"
            className="grid h-10 w-10 place-items-center rounded-full border border-black/[0.06] bg-white text-sm font-black"
          >
            ←
          </Link>

          <Link
            href="/"
            className="block"
          >
            <BrandLogo compact />
          </Link>

          <span className="ml-auto rounded-full bg-[#031B14] px-4 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">
            Reseller Studio
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#031B14] via-[#031B14] to-black p-6 text-white shadow-[0_25px_70px_rgba(0,0,0,0.24)] sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-emerald-200">
                Approved Reseller
              </span>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/60">
                Wholesale Access Active
              </span>
            </div>

            <p className="mt-6 text-[9px] font-black uppercase tracking-[0.28em] text-emerald-300">
              AR Fashions
            </p>

            <h1 className="mt-2 max-w-2xl font-serif text-[2.35rem] leading-[0.95] sm:text-5xl">
              Reseller
              <br />
              Studio
            </h1>

            <p className="mt-4 max-w-xl text-[11px] font-medium leading-5 text-white/55">
              Wholesale orders, Smart Stock packs and your business account in one place.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#0A382B]"
              >
                Shop Wholesale
              </Link>

              <Link
                href="/my-orders"
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-white"
              >
                View Orders
              </Link>
            </div>
          </div>
        </section>

        <ResellerDashboardActions />

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-[1.5rem] border border-black/[0.05] bg-white p-4 shadow-sm">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-400">
              Reseller Orders
            </p>

            <p className="mt-2 text-2xl font-black">
              {orders.length}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-black/[0.05] bg-white p-4 shadow-sm">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-400">
              Purchase Value
            </p>

            <p className="mt-2 text-xl font-black">
              {money(
                totalPurchaseValue,
              )}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-black/[0.05] bg-white p-4 shadow-sm">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-400">
              Pieces Purchased
            </p>

            <p className="mt-2 text-2xl font-black">
              {totalPieces}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-black/[0.05] bg-white p-4 shadow-sm">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-400">
              Active Orders
            </p>

            <p className="mt-2 text-2xl font-black">
              {activeOrders}
            </p>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="overflow-hidden rounded-[1.75rem] border border-black/[0.05] bg-white shadow-sm">
            <div className="border-b border-black/[0.05] p-5">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700">
                Business Profile
              </p>

              <h2 className="mt-1 font-serif text-2xl">
                Retailer Details
              </h2>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">
                  Business
                </p>

                <p className="mt-1 text-sm font-black">
                  {application?.businessName ??
                    "Approved Reseller"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">
                    City
                  </p>

                  <p className="mt-1 text-[11px] font-bold">
                    {application?.city ??
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">
                    State
                  </p>

                  <p className="mt-1 text-[11px] font-bold">
                    {application?.state ??
                      "—"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">
                  GSTIN
                </p>

                <p className="mt-1 text-[11px] font-bold">
                  {application?.gstNumber ||
                    "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">
                  Account Status
                </p>

                <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-emerald-700">
                  Approved · Active
                </div>
              </div>

              {application?.mapsUrl ? (
                <a
                  href={
                    application.mapsUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-black/[0.07] bg-[#F8F1E7] px-4 py-3 text-center text-[9px] font-black uppercase tracking-[0.1em]"
                >
                  View Business Location
                </a>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-black/[0.05] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-black/[0.05] p-5">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700">
                  Order Activity
                </p>

                <h2 className="mt-1 font-serif text-2xl">
                  Latest Wholesale Orders
                </h2>
              </div>

              <Link
                href="/my-orders"
                className="text-[9px] font-black uppercase tracking-[0.1em] text-emerald-700"
              >
                View All
              </Link>
            </div>

            {latestOrders.length ===
            0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-black">
                  No reseller orders yet
                </p>

                <p className="mt-2 text-[10px] leading-4 text-zinc-500">
                  Start shopping wholesale inventory and Smart Stock packs.
                </p>

                <Link
                  href="/"
                  className="mt-5 inline-block rounded-full bg-[#031B14] px-5 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-white"
                >
                  Browse Wholesale
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.05]">
                {latestOrders.map(
                  (order) => {
                    const pieces =
                      order.items.reduce(
                        (
                          sum,
                          item,
                        ) =>
                          sum +
                          item.quantity,
                        0,
                      );

                    return (
                      <div
                        key={
                          order.id
                        }
                        className="p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">
                              {
                                order.orderNumber
                              }
                            </p>

                            <p className="mt-1 text-[11px] font-bold text-zinc-600">
                              {dateText(
                                order.createdAt,
                              )}
                            </p>
                          </div>

                          <span className="rounded-full bg-[#FAF7F0] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em]">
                            {niceStatus(
                              order.status,
                            )}
                          </span>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">
                              Pack Quantity
                            </p>

                            <p className="mt-1 text-sm font-black">
                              {pieces} pcs
                            </p>
                          </div>

                          <p className="text-lg font-black">
                            {money(
                              Number(
                                order.totalAmount,
                              ),
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-[1.75rem] bg-[#031B14] p-5 text-white shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Smart Stock Balance
              </p>

              <h2 className="mt-1 font-serif text-2xl">
                Balanced wholesale packs
              </h2>

              <p className="mt-2 max-w-xl text-[10px] leading-4 text-white/50">
                Eligible products automatically balance available colours and sizes so stock moves across the assortment.
              </p>
            </div>

            <Link
              href="/"
              className="shrink-0 rounded-full bg-white px-4 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-[#0A382B]"
            >
              Shop
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

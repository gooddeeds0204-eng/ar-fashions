"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isReseller: boolean;
};

type AccountCounts = {
  orders: number;
  addresses: number;
  notifications: number;
};

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<SessionUser | null>(null);

  const [counts, setCounts] =
    useState<AccountCounts>({
      orders: 0,
      addresses: 0,
      notifications: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadAccount() {
      try {
        const sessionResponse =
          await fetch(
            "/api/session",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        const sessionData =
          await sessionResponse.json();

        if (!sessionResponse.ok) {
          throw new Error(
            sessionData.error ??
              "No customer session found.",
          );
        }

        setUser(
          sessionData.user,
        );

        const [
          ordersResponse,
          addressesResponse,
          notificationsResponse,
        ] = await Promise.all([
          fetch(
            "/api/my-orders",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          ),
          fetch(
            "/api/addresses",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          ),
          fetch(
            "/api/notifications",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          ),
        ]);

        let ordersCount = 0;
        let addressesCount = 0;
        let notificationsCount = 0;

        if (
          ordersResponse.ok
        ) {
          const ordersData =
            await ordersResponse.json();

          ordersCount =
            Number(
              ordersData.count ??
                0,
            ) || 0;
        }

        if (
          addressesResponse.ok
        ) {
          const addressesData =
            await addressesResponse.json();

          addressesCount =
            Number(
              addressesData.count ??
                0,
            ) || 0;
        }

        if (
          notificationsResponse.ok
        ) {
          const notificationsData =
            await notificationsResponse.json();

          notificationsCount =
            Number(
              notificationsData.unreadCount ??
                0,
            ) || 0;
        }

        setCounts({
          orders: ordersCount,
          addresses:
            addressesCount,
          notifications:
            notificationsCount,
        });
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load account.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, []);

  const initial =
    user?.name?.trim()
      ? user.name
          .trim()
          .charAt(0)
          .toUpperCase()
      : "A";

  return (
    <main className="min-h-screen bg-[#f7f7f5] pb-24 text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="rounded-full px-3 py-2 text-sm font-bold"
          >
            ←
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="ml-3 text-xl font-black tracking-[-0.05em]"
          >
            AR
            <span className="text-emerald-600">
              FASHIONS
            </span>
          </button>

          <span className="ml-auto text-xs font-bold text-zinc-400">
            My Account
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-7">
        {loading ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold text-zinc-500">
              Loading your account...
            </p>
          </div>
        ) : error || !user ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-2xl">
              👤
            </div>

            <h1 className="mt-5 text-xl font-black">
              Customer session not found
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {error ||
                "Place an order first to create your secure customer session."}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="mt-6 rounded-2xl bg-zinc-950 px-6 py-3 text-sm font-black text-white"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* PROFILE CARD */}
            <section className="overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-sm">
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-black text-zinc-950">
                    {initial}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                      Customer Profile
                    </p>

                    <h1 className="mt-1 truncate text-2xl font-black">
                      {user.name ||
                        "AR Fashions Customer"}
                    </h1>

                    {user.phone && (
                      <p className="mt-1 text-sm text-zinc-300">
                        +91 {user.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
                    {user.role}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      user.isReseller
                        ? "bg-emerald-500 text-white"
                        : "bg-white/10 text-zinc-200"
                    }`}
                  >
                    {user.isReseller
                      ? "Reseller Active"
                      : "Retail Customer"}
                  </span>
                </div>
              </div>
            </section>

            {/* QUICK STATS */}
            <section className="mt-5 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/my-orders",
                  )
                }
                className="rounded-3xl bg-white p-5 text-left shadow-sm"
              >
                <p className="text-3xl font-black">
                  {counts.orders}
                </p>

                <p className="mt-1 text-xs font-bold text-zinc-500">
                  My Orders
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/addresses",
                  )
                }
                className="rounded-3xl bg-white p-5 text-left shadow-sm"
              >
                <p className="text-3xl font-black">
                  {
                    counts.addresses
                  }
                </p>

                <p className="mt-1 text-xs font-bold text-zinc-500">
                  Saved Addresses
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/notifications",
                  )
                }
                className="rounded-3xl bg-white p-5 text-left shadow-sm"
              >
                <p className="text-3xl font-black">
                  {
                    counts.notifications
                  }
                </p>

                <p className="mt-1 text-xs font-bold text-zinc-500">
                  Notifications
                </p>
              </button>
            </section>

            {/* ACCOUNT MENU */}
            <section className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm">
              {[
                {
                  icon: "📦",
                  title:
                    "My Orders",
                  subtitle:
                    "Track retail and reseller orders",
                  action: () =>
                    router.push(
                      "/my-orders",
                    ),
                },
                {
                  icon: "📍",
                  title:
                    "Saved Addresses",
                  subtitle:
                    "Manage delivery addresses",
                  action: () =>
                    router.push(
                      "/addresses",
                    ),
                },
                {
                  icon: "🔔",
                  title:
                    "Notifications",
                  subtitle:
                    counts.notifications > 0
                      ? `${counts.notifications} unread update${counts.notifications === 1 ? "" : "s"}`
                      : "Store updates, offers and alerts",
                  action: () =>
                    router.push(
                      "/notifications",
                    ),
                },
                {
                  icon: "♡",
                  title:
                    "Wishlist",
                  subtitle:
                    "View your saved products",
                  action: () =>
                    router.push(
                      "/wishlist",
                    ),
                },
                {
                  icon: "🛍",
                  title:
                    "Shopping Cart",
                  subtitle:
                    "Continue your current order",
                  action: () =>
                    router.push(
                      "/cart",
                    ),
                },
              ].map(
                (item, index) => (
                  <button
                    key={
                      item.title
                    }
                    type="button"
                    onClick={
                      item.action
                    }
                    className={`flex w-full items-center gap-4 p-5 text-left transition hover:bg-zinc-50 ${
                      index > 0
                        ? "border-t border-black/5"
                        : ""
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-xl">
                      {
                        item.icon
                      }
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-black">
                        {
                          item.title
                        }
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {
                          item.subtitle
                        }
                      </p>
                    </div>

                    <span className="text-zinc-300">
                      →
                    </span>
                  </button>
                ),
              )}
            </section>

            {/* PROFILE DETAILS */}
            <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black">
                Profile Details
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Full Name
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {user.name ||
                      "Not added"}
                  </p>
                </div>

                <div className="border-t border-black/5 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Mobile Number
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {user.phone
                      ? `+91 ${user.phone}`
                      : "Not added"}
                  </p>
                </div>

                <div className="border-t border-black/5 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Email
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {user.email ||
                      "Not added"}
                  </p>
                </div>
              </div>
            </section>

            {/* RESELLER STATUS */}
            <section className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Reseller Zone
              </p>

              <h2 className="mt-2 text-lg font-black">
                {user.isReseller
                  ? "Your reseller account is active"
                  : "Wholesale shopping is available"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-emerald-800/80">
                Shop eligible products
                using reseller pricing
                and MOQ-based bulk
                quantities.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/")
                }
                className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 text-xs font-black text-white"
              >
                Shop Reseller Products
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

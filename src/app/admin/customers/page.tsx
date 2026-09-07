"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status:
    | "ACTIVE"
    | "BLOCKED"
    | "PENDING";
  isReseller: boolean;
  resellerLevel: string | null;
  createdAt: string;
  totalOrders: number;
  deliveredOrders: number;
  retailOrders: number;
  resellerOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  addressesCount: number;
  reviewsCount: number;
  wishlistCount: number;
};

const statuses = [
  "ALL",
  "ACTIVE",
  "BLOCKED",
  "PENDING",
] as const;

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
  ).format(value);
}

function statusClass(
  status: Customer["status"],
) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700";
    case "BLOCKED":
      return "bg-red-50 text-red-700";
    case "PENDING":
      return "bg-amber-50 text-amber-700";
  }
}

export default function AdminCustomersPage() {
  const router = useRouter();

  const [
    customers,
    setCustomers,
  ] = useState<Customer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<
    (typeof statuses)[number]
  >("ALL");

  const [updating, setUpdating] =
    useState<string | null>(null);

  async function loadCustomers() {
    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/admin/customers",
          {
            cache: "no-store",
            credentials:
              "same-origin",
          },
        );

      if (
        response.status === 401
      ) {
        router.replace(
          "/admin/login",
        );
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to load customers.",
        );
      }

      setCustomers(
        Array.isArray(
          data.customers,
        )
          ? data.customers
          : [],
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load customers.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function updateCustomer(
    customerId: string,
    changes: {
      status?: Customer["status"];
      isReseller?: boolean;
    },
  ) {
    try {
      setUpdating(
        customerId,
      );

      const response =
        await fetch(
          "/api/admin/customers",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              customerId,
              ...changes,
            }),
          },
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        router.replace(
          "/admin/login",
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update customer.",
        );
      }

      setCustomers(
        (current) =>
          current.map(
            (customer) =>
              customer.id ===
              customerId
                ? {
                    ...customer,
                    ...data.customer,
                  }
                : customer,
          ),
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update customer.",
      );
    } finally {
      setUpdating(null);
    }
  }

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return customers.filter(
        (customer) => {
          const matchesStatus =
            selectedStatus ===
              "ALL" ||
            customer.status ===
              selectedStatus;

          const matchesSearch =
            !query ||
            [
              customer.name,
              customer.email,
              customer.phone,
            ].some((value) =>
              String(
                value ?? "",
              )
                .toLowerCase()
                .includes(query),
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        },
      );
    }, [
      customers,
      search,
      selectedStatus,
    ]);

  const totalSpend =
    customers.reduce(
      (total, customer) =>
        total +
        customer.totalSpent,
      0,
    );

  const resellerCount =
    customers.filter(
      (customer) =>
        customer.isReseller,
    ).length;

  const activeCount =
    customers.filter(
      (customer) =>
        customer.status ===
        "ACTIVE",
    ).length;

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#172033]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin",
              )
            }
            className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-zinc-100"
          >
            ←
          </button>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-400">
              AR Fashions Admin
            </p>

            <h1 className="text-lg font-black">
              Customers
            </h1>
          </div>

          <button
            type="button"
            onClick={
              loadCustomers
            }
            className="ml-auto rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <section className="rounded-[28px] bg-[#111827] p-6 text-white shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Customer Management
          </p>

          <h2 className="mt-3 text-2xl font-black">
            Customer Overview
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-2xl font-black">
                {
                  customers.length
                }
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                Customers
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-2xl font-black">
                {activeCount}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                Active
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-2xl font-black">
                {
                  resellerCount
                }
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                Resellers
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xl font-black">
                {money(
                  totalSpend,
                )}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                Delivered Sales
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search name, phone or email..."
            className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
          />

          <div className="mt-4 flex gap-2 overflow-x-auto">
            {statuses.map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setSelectedStatus(
                      status,
                    )
                  }
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${
                    selectedStatus ===
                    status
                      ? "bg-zinc-950 text-white"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {status}
                </button>
              ),
            )}
          </div>
        </section>

        {loading ? (
          <div className="mt-5 rounded-3xl bg-white p-10 text-center">
            Loading customers...
          </div>
        ) : filtered.length ===
          0 ? (
          <div className="mt-5 rounded-3xl bg-white p-10 text-center">
            No customers found.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {filtered.map(
              (customer) => (
                <article
                  key={customer.id}
                  className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black">
                        {customer.name ||
                          "Customer"}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        {customer.phone ||
                          "No phone"}
                      </p>

                      {customer.email && (
                        <p className="mt-1 text-xs text-zinc-400">
                          {
                            customer.email
                          }
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black ${statusClass(
                          customer.status,
                        )}`}
                      >
                        {
                          customer.status
                        }
                      </span>

                      {customer.isReseller && (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">
                          RESELLER
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <p className="text-xl font-black">
                        {
                          customer.totalOrders
                        }
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        Total Orders
                      </p>
                    </div>

                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <p className="text-xl font-black">
                        {money(
                          customer.totalSpent,
                        )}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        Delivered Spend
                      </p>
                    </div>

                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <p className="text-xl font-black">
                        {
                          customer.retailOrders
                        }
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        Retail Orders
                      </p>
                    </div>

                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <p className="text-xl font-black">
                        {
                          customer.resellerOrders
                        }
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        Reseller Orders
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span>
                      📍{" "}
                      {
                        customer.addressesCount
                      }{" "}
                      addresses
                    </span>

                    <span>
                      ★{" "}
                      {
                        customer.reviewsCount
                      }{" "}
                      reviews
                    </span>

                    <span>
                      ♡{" "}
                      {
                        customer.wishlistCount
                      }{" "}
                      wishlist
                    </span>
                  </div>

                  <div className="mt-5 border-t border-black/5 pt-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Account Status
                        </label>

                        <select
                          value={
                            customer.status
                          }
                          disabled={
                            updating ===
                            customer.id
                          }
                          onChange={(event) =>
                            updateCustomer(
                              customer.id,
                              {
                                status:
                                  event
                                    .target
                                    .value as Customer["status"],
                              },
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm font-bold"
                        >
                          <option value="ACTIVE">
                            ACTIVE
                          </option>
                          <option value="PENDING">
                            PENDING
                          </option>
                          <option value="BLOCKED">
                            BLOCKED
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Reseller Access
                        </label>

                        <button
                          type="button"
                          disabled={
                            updating ===
                            customer.id
                          }
                          onClick={() =>
                            updateCustomer(
                              customer.id,
                              {
                                isReseller:
                                  !customer.isReseller,
                              },
                            )
                          }
                          className={`mt-2 w-full rounded-xl px-4 py-3 text-sm font-black ${
                            customer.isReseller
                              ? "bg-emerald-600 text-white"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {customer.isReseller
                            ? "Reseller Active"
                            : "Enable Reseller"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </main>
  );
}

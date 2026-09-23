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

  resellerApplication: {
    id: string;
    businessName: string;
    businessPhone: string | null;
    gstNumber: string | null;
    addressLine: string | null;
    city: string;
    state: string;
    pincode: string | null;
    mapsUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    locationAccuracy: number | null;
    locationCapturedAt: string | null;
    visitingCardUrl: string | null;
    shopPhotoUrls: string[];
    status:
      | "PENDING"
      | "APPROVED"
      | "REJECTED";
    rejectionReason:
      | string
      | null;
    reviewedAt:
      | string
      | null;
    createdAt: string;
  } | null;
};

const statuses = [
  "ALL",
  "ACTIVE",
  "BLOCKED",
  "PENDING",
] as const;

const resellerRejectionReasons = [
  {
    label: "Shop Photos",
    reason:
      "Please upload clear shop photos showing the shop front and inside or stock display.",
  },
  {
    label: "Visiting Card",
    reason:
      "Please upload a clear and valid business visiting card with readable shop details.",
  },
  {
    label: "Address / Location",
    reason:
      "Business address or live shop location could not be verified. Please update the correct address and location.",
  },
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

  const [
    rejectingCustomerId,
    setRejectingCustomerId,
  ] = useState<string | null>(
    null,
  );

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

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

  async function reviewRetailer(
    customerId: string,
    action:
      | "APPROVE_RESELLER"
      | "REJECT_RESELLER",
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
              action,
              rejectionReason:
                action ===
                "REJECT_RESELLER"
                  ? rejectionReason
                  : undefined,
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
            "Failed to review retailer application.",
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

      setRejectingCustomerId(
        null,
      );

      setRejectionReason(
        "",
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to review retailer application.",
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

  const pendingRetailers =
    customers.filter(
      (customer) =>
        customer
          .resellerApplication
          ?.status ===
        "PENDING",
    );

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
    <main className="min-h-screen bg-[#FAF7F0] text-[#211C18]">
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
              AS Fashions Admin
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
        <section className="rounded-[28px] bg-[#211C18] p-6 text-white shadow-xl">
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

        {pendingRetailers.length >
          0 ? (
          <section className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50/70 p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700">
                  Retailer Requests
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Pending Approvals
                </h2>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Approve only verified
                  retailers. Wholesale
                  pricing stays locked
                  until approval.
                </p>
              </div>

              <span className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-black text-white">
                {
                  pendingRetailers.length
                }
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {pendingRetailers.map(
                (customer) => {
                  const application =
                    customer.resellerApplication!;

                  const isRejecting =
                    rejectingCustomerId ===
                    customer.id;

                  return (
                    <article
                      key={
                        customer.id
                      }
                      className="rounded-2xl border border-amber-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black">
                            {
                              application.businessName
                            }
                          </p>

                          <p className="mt-1 text-xs font-semibold text-zinc-500">
                            {
                              customer.name ||
                              "Customer"
                            }
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-400">
                            {
                              application.city
                            }
                            {" · "}
                            {
                              application.state
                            }
                          </p>
                        </div>

                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[9px] font-black text-amber-700">
                          PENDING
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 text-[10px] text-zinc-500 sm:grid-cols-2">
                        <div className="rounded-xl bg-zinc-50 p-3">
                          <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">
                            Contact
                          </p>

                          <p className="mt-1 font-semibold text-zinc-700">
                            {
                              customer.phone ||
                              "No phone"
                            }
                          </p>

                          {customer.email ? (
                            <p className="mt-1 break-all">
                              {
                                customer.email
                              }
                            </p>
                          ) : null}
                        </div>

                        <div className="rounded-xl bg-zinc-50 p-3">
                          <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">
                            Business Mobile
                          </p>

                          <p className="mt-1 font-semibold text-zinc-700">
                            {
                              application.businessPhone ||
                              "Not provided"
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-zinc-50 p-3">
                          <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">
                            GSTIN
                          </p>

                          <p className="mt-1 font-semibold text-zinc-700">
                            {
                              application.gstNumber ||
                              "Not provided"
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-zinc-50 p-3 sm:col-span-2">
                          <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">
                            Business Address
                          </p>

                          <p className="mt-1 font-semibold leading-5 text-zinc-700">
                            {
                              application.addressLine ||
                              "Address not provided"
                            }
                          </p>

                          <p className="mt-1">
                            {application.city}
                            {" · "}
                            {application.state}
                            {application.pincode
                              ? ` · ${application.pincode}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      {(application.visitingCardUrl ||
                        application.shopPhotoUrls?.length >
                          0) ? (
                        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                          <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">
                            Verification Photos
                          </p>

                          {application.visitingCardUrl ? (
                            <div className="mt-3">
                              <p className="mb-2 text-[9px] font-black text-zinc-600">
                                Visiting Card
                              </p>

                              <a
                                href={
                                  application.visitingCardUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={
                                    application.visitingCardUrl
                                  }
                                  alt="Visiting card"
                                  className="h-32 w-full rounded-xl border border-zinc-200 object-cover"
                                />
                              </a>
                            </div>
                          ) : null}

                          {application.shopPhotoUrls?.length >
                          0 ? (
                            <div className="mt-3">
                              <p className="mb-2 text-[9px] font-black text-zinc-600">
                                Shop Photos
                              </p>

                              <div className="grid grid-cols-3 gap-2">
                                {application.shopPhotoUrls.map(
                                  (
                                    url,
                                    index,
                                  ) => (
                                    <a
                                      key={url}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <img
                                        src={url}
                                        alt={`Shop ${
                                          index + 1
                                        }`}
                                        className="aspect-square w-full rounded-lg border border-zinc-200 object-cover"
                                      />
                                    </a>
                                  ),
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {application.latitude !==
                        null &&
                      application.longitude !==
                        null ? (
                        <div className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-white">
                          <iframe
                            title="Verified shop location"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${application.longitude - 0.004}%2C${application.latitude - 0.004}%2C${application.longitude + 0.004}%2C${application.latitude + 0.004}&layer=mapnik&marker=${application.latitude}%2C${application.longitude}`}
                            className="h-44 w-full border-0"
                            loading="lazy"
                          />

                          <div className="px-3 py-2 text-[9px] font-semibold text-emerald-700">
                            Live shop location captured
                            {application.locationAccuracy !==
                            null
                              ? ` · ~${Math.round(
                                  application.locationAccuracy,
                                )}m accuracy`
                              : ""}
                          </div>
                        </div>
                      ) : null}

                      {application.mapsUrl ? (
                        <a
                          href={
                            application.mapsUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] font-black text-emerald-700"
                        >
                          <span>
                            📍 Open Shop in Google Maps
                          </span>
                          <span>↗</span>
                        </a>
                      ) : null}

                      {isRejecting ? (
                        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3">
                          <label className="text-[9px] font-black uppercase tracking-wider text-red-700">
                            Rejection Reason
                          </label>

                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {resellerRejectionReasons.map(
                              (item) => {
                                const selected =
                                  rejectionReason ===
                                  item.reason;

                                return (
                                  <button
                                    key={
                                      item.label
                                    }
                                    type="button"
                                    onClick={() =>
                                      setRejectionReason(
                                        item.reason,
                                      )
                                    }
                                    className={`rounded-xl border px-3 py-3 text-left text-[9px] font-black transition ${
                                      selected
                                        ? "border-red-500 bg-red-600 text-white"
                                        : "border-red-200 bg-white text-red-700"
                                    }`}
                                  >
                                    <span className="block">
                                      {selected
                                        ? "✓ "
                                        : ""}
                                      {
                                        item.label
                                      }
                                    </span>

                                    <span
                                      className={`mt-1 block text-[8px] font-medium leading-4 ${
                                        selected
                                          ? "text-white/80"
                                          : "text-zinc-500"
                                      }`}
                                    >
                                      {
                                        item.reason
                                      }
                                    </span>
                                  </button>
                                );
                              },
                            )}
                          </div>

                          <textarea
                            value={
                              rejectionReason
                            }
                            onChange={(
                              event,
                            ) =>
                              setRejectionReason(
                                event.target.value,
                              )
                            }
                            rows={3}
                            placeholder="Select a reason above or enter a custom reason."
                            className="mt-2 w-full resize-none rounded-xl border border-red-200 bg-white p-3 text-xs outline-none"
                          />

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingCustomerId(
                                  null,
                                );
                                setRejectionReason(
                                  "",
                                );
                              }}
                              className="rounded-xl border border-black/10 bg-white py-2.5 text-[10px] font-black"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              disabled={
                                updating ===
                                  customer.id ||
                                rejectionReason
                                  .trim()
                                  .length <
                                  3
                              }
                              onClick={() =>
                                reviewRetailer(
                                  customer.id,
                                  "REJECT_RESELLER",
                                )
                              }
                              className="rounded-xl bg-red-600 py-2.5 text-[10px] font-black text-white disabled:opacity-40"
                            >
                              Confirm Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={
                              updating ===
                              customer.id
                            }
                            onClick={() => {
                              setRejectingCustomerId(
                                customer.id,
                              );
                              setRejectionReason(
                                "",
                              );
                            }}
                            className="rounded-xl border border-red-200 bg-red-50 py-3 text-[10px] font-black text-red-700 disabled:opacity-40"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            disabled={
                              updating ===
                              customer.id
                            }
                            onClick={() =>
                              reviewRetailer(
                                customer.id,
                                "APPROVE_RESELLER",
                              )
                            }
                            className="rounded-xl bg-emerald-600 py-3 text-[10px] font-black text-white disabled:opacity-40"
                          >
                            {updating ===
                            customer.id
                              ? "Updating..."
                              : "Approve Retailer"}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                },
              )}
            </div>
          </section>
        ) : null}

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

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/admin/customers/${customer.id}`,
                      )
                    }
                    className="mt-4 flex w-full items-center justify-between rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.07] px-4 py-3 text-left transition hover:border-[#D4AF37]/50"
                  >
                    <span>
                      <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[#8A6E1C]">
                        Customer 360°
                      </span>
                      <span className="mt-1 block text-[10px] text-zinc-500">
                        Profile · addresses · orders · wishlist · reviews · reseller data
                      </span>
                    </span>
                    <span className="text-lg text-[#8A6E1C]">
                      →
                    </span>
                  </button>

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

                        <div
                          className={`mt-2 rounded-xl px-4 py-3 text-center text-sm font-black ${
                            customer.isReseller
                              ? "bg-emerald-600 text-white"
                              : customer
                                    .resellerApplication
                                    ?.status ===
                                  "PENDING"
                                ? "bg-amber-50 text-amber-700"
                                : customer
                                      .resellerApplication
                                      ?.status ===
                                    "REJECTED"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {customer.isReseller
                            ? "Approved Reseller"
                            : customer
                                  .resellerApplication
                                  ?.status ===
                                "PENDING"
                              ? "Approval Pending"
                              : customer
                                    .resellerApplication
                                    ?.status ===
                                  "REJECTED"
                                ? "Application Rejected"
                                : "Retail Customer"}
                        </div>
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

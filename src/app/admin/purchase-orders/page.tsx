"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: string;
  subtotal: number;
  notes: string | null;
  expectedAt: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  createdAt: string;

  supplier: {
    id: string;
    name: string;
    phone: string | null;
    whatsapp: string | null;
    city: string | null;
    state: string | null;
  };

  items: Array<{
    id: string;
    variantId: string;
    productName: string;
    colorName: string;
    sizeName: string;
    sku: string | null;
    orderedQty: number;
    receivedQty: number;
    unitCost: number;
    totalCost: number;
  }>;
};

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style:
        "currency",
      currency:
        "INR",
      maximumFractionDigits:
        0,
    },
  ).format(
    value || 0,
  );
}

function niceStatus(
  value: string,
) {
  return value
    .replaceAll(
      "_",
      " ",
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase(),
    );
}

export default function PurchaseOrdersPage() {
  const router =
    useRouter();

  const [
    orders,
    setOrders,
  ] =
    useState<
      PurchaseOrder[]
    >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/admin/purchase-orders",
          {
            cache:
              "no-store",

            credentials:
              "same-origin",
          },
        );

      if (
        response.status ===
        401
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
            "Failed to load purchase orders.",
        );
      }

      setOrders(
        Array.isArray(
          data.purchaseOrders,
        )
          ? data.purchaseOrders
          : [],
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load purchase orders.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  const draftCount =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            order.status ===
            "DRAFT",
        ).length,
      [orders],
    );

  const orderedCount =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            order.status ===
              "ORDERED" ||
            order.status ===
              "PARTIALLY_RECEIVED",
        ).length,
      [orders],
    );

  const totalValue =
    useMemo(
      () =>
        orders.reduce(
          (
            total,
            order,
          ) =>
            total +
            order.subtotal,
          0,
        ),
      [orders],
    );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/admin",
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
        >
          ← Dashboard
        </button>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              AR FASHIONS
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Purchase Orders
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Supplier purchasing and incoming stock control.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/restock",
              )
            }
            className="rounded-2xl bg-[#06261c] px-5 py-3 text-xs font-black text-white"
          >
            + Create From Restock
          </button>
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Summary
            label="Total POs"
            value={
              orders.length
            }
          />

          <Summary
            label="Draft"
            value={
              draftCount
            }
          />

          <Summary
            label="Ordered"
            value={
              orderedCount
            }
          />

          <Summary
            label="Total Value"
            value={money(
              totalValue,
            )}
          />
        </section>

        {message ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700">
            {message}
          </div>
        ) : null}

        <section className="mt-5">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-black text-slate-500">
              Loading purchase orders...
            </div>
          ) : orders.length ===
            0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-lg font-black">
                No purchase orders yet
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Create the first draft from the Restock Queue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(
                (order) => {
                  const totalPieces =
                    order.items.reduce(
                      (
                        total,
                        item,
                      ) =>
                        total +
                        item.orderedQty,
                      0,
                    );

                  return (
                    <article
                      key={
                        order.id
                      }
                      className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                        <div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[8px] font-black uppercase text-slate-600">
                            {niceStatus(
                              order.status,
                            )}
                          </span>

                          <h2 className="mt-3 text-lg font-black">
                            {
                              order.poNumber
                            }
                          </h2>

                          <p className="mt-1 text-[10px] font-semibold text-slate-400">
                            {
                              order.supplier.name
                            }
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-black">
                            {money(
                              order.subtotal,
                            )}
                          </p>

                          <p className="mt-1 text-[9px] font-semibold text-slate-400">
                            {
                              totalPieces
                            }{" "}
                            pcs
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {order.items.map(
                          (item) => (
                            <div
                              key={
                                item.id
                              }
                              className="flex items-center justify-between gap-3 p-4"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black">
                                  {
                                    item.productName
                                  }
                                </p>

                                <p className="mt-1 text-[9px] font-semibold text-slate-400">
                                  {
                                    item.colorName
                                  }{" "}
                                  ·{" "}
                                  {
                                    item.sizeName
                                  }
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-sm font-black">
                                  {
                                    item.orderedQty
                                  }{" "}
                                  pcs
                                </p>

                                <p className="mt-1 text-[9px] text-slate-400">
                                  {money(
                                    item.totalCost,
                                  )}
                                </p>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

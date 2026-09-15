"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type PurchaseOrderItem = {
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
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  status:
    | "DRAFT"
    | "ORDERED"
    | "PARTIALLY_RECEIVED"
    | "RECEIVED"
    | "CANCELLED";
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

  items:
    PurchaseOrderItem[];
};

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

function statusClass(
  value: string,
) {
  if (
    value ===
    "RECEIVED"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    value ===
    "PARTIALLY_RECEIVED"
  ) {
    return "bg-sky-50 text-sky-700";
  }

  if (
    value ===
    "ORDERED"
  ) {
    return "bg-indigo-50 text-indigo-700";
  }

  if (
    value ===
    "CANCELLED"
  ) {
    return "bg-red-50 text-red-600";
  }

  return "bg-slate-100 text-slate-600";
}

function dateInputValue(
  value: string | null,
) {
  if (!value) {
    return "";
  }

  return value.slice(
    0,
    10,
  );
}

function displayDate(
  value: string | null,
) {
  if (!value) {
    return "Not set";
  }

  return new Date(
    value,
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
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
  ] =
    useState(true);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    busyOrderId,
    setBusyOrderId,
  ] =
    useState<
      string | null
    >(null);

  const [
    receivingOrderId,
    setReceivingOrderId,
  ] =
    useState<
      string | null
    >(null);

  const [
    receiveQty,
    setReceiveQty,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    editingOrderId,
    setEditingOrderId,
  ] = useState<
    string | null
  >(null);

  const [
    editExpectedAt,
    setEditExpectedAt,
  ] = useState("");

  const [
    editNotes,
    setEditNotes,
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

  const receivedCount =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            order.status ===
            "RECEIVED",
        ).length,
      [orders],
    );

  const cancelledCount =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            order.status ===
            "CANCELLED",
        ).length,
      [orders],
    );

  async function markOrdered(
    order:
      PurchaseOrder,
  ) {
    try {
      setBusyOrderId(
        order.id,
      );

      setMessage("");

      const response =
        await fetch(
          "/api/admin/purchase-orders",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                action:
                  "MARK_ORDERED",

                purchaseOrderId:
                  order.id,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to mark purchase order as ordered.",
        );
      }

      setMessage(
        `${order.poNumber} marked as Ordered.`,
      );

      await loadOrders();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update purchase order.",
      );
    } finally {
      setBusyOrderId(
        null,
      );
    }
  }

  function openReceive(
    order:
      PurchaseOrder,
  ) {
    const next:
      Record<
        string,
        string
      > = {};

    for (
      const item of
      order.items
    ) {
      const remaining =
        Math.max(
          0,
          item.orderedQty -
            item.receivedQty,
        );

      next[item.id] =
        remaining > 0
          ? String(
              remaining,
            )
          : "0";
    }

    setReceiveQty(
      next,
    );

    setReceivingOrderId(
      order.id,
    );

    setEditingOrderId(
      null,
    );

    setMessage("");
  }

  async function submitReceive(
    order:
      PurchaseOrder,
  ) {
    const items:
      Array<{
        itemId: string;
        quantity: number;
      }> = [];

    for (
      const item of
      order.items
    ) {
      const remaining =
        Math.max(
          0,
          item.orderedQty -
            item.receivedQty,
        );

      const raw =
        receiveQty[
          item.id
        ] ?? "0";

      const quantity =
        Number(raw);

      if (
        !Number.isInteger(
          quantity,
        ) ||
        quantity < 0
      ) {
        setMessage(
          "Receive quantities must be whole numbers.",
        );
        return;
      }

      if (
        quantity >
        remaining
      ) {
        setMessage(
          `${item.productName} · ${item.colorName} · ${item.sizeName}: maximum remaining quantity is ${remaining}.`,
        );
        return;
      }

      if (
        quantity > 0
      ) {
        items.push({
          itemId:
            item.id,

          quantity,
        });
      }
    }

    if (
      items.length === 0
    ) {
      setMessage(
        "Enter at least one received quantity.",
      );
      return;
    }

    try {
      setBusyOrderId(
        order.id,
      );

      setMessage("");

      const response =
        await fetch(
          "/api/admin/purchase-orders",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                action:
                  "RECEIVE",

                purchaseOrderId:
                  order.id,

                items,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to receive purchase order stock.",
        );
      }

      setReceivingOrderId(
        null,
      );

      setReceiveQty(
        {},
      );

      setMessage(
        `${data.receivedThisTime} pcs received. Inventory updated automatically.`,
      );

      await loadOrders();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to receive purchase order.",
      );
    } finally {
      setBusyOrderId(
        null,
      );
    }
  }

  function openEdit(
    order:
      PurchaseOrder,
  ) {
    setEditingOrderId(
      order.id,
    );

    setReceivingOrderId(
      null,
    );

    setEditExpectedAt(
      dateInputValue(
        order.expectedAt,
      ),
    );

    setEditNotes(
      order.notes ?? "",
    );

    setMessage("");
  }

  async function saveDetails(
    order:
      PurchaseOrder,
  ) {
    try {
      setBusyOrderId(
        order.id,
      );

      setMessage("");

      const response =
        await fetch(
          "/api/admin/purchase-orders",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                action:
                  "UPDATE_DETAILS",

                purchaseOrderId:
                  order.id,

                expectedAt:
                  editExpectedAt,

                notes:
                  editNotes,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to save purchase order details.",
        );
      }

      setEditingOrderId(
        null,
      );

      setMessage(
        `${order.poNumber} details updated successfully.`,
      );

      await loadOrders();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save purchase order details.",
      );
    } finally {
      setBusyOrderId(
        null,
      );
    }
  }

  async function cancelOrder(
    order:
      PurchaseOrder,
  ) {
    const confirmed =
      window.confirm(
        `Cancel ${order.poNumber}? Remaining planned/incoming stock protection will be released.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setBusyOrderId(
        order.id,
      );

      setMessage("");

      const response =
        await fetch(
          "/api/admin/purchase-orders",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                action:
                  "CANCEL",

                purchaseOrderId:
                  order.id,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to cancel purchase order.",
        );
      }

      setEditingOrderId(
        null,
      );

      setReceivingOrderId(
        null,
      );

      setMessage(
        `${order.poNumber} cancelled. Purchase protection released.`,
      );

      await loadOrders();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to cancel purchase order.",
      );
    } finally {
      setBusyOrderId(
        null,
      );
    }
  }

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
              Supplier ordering, receiving, delivery planning and automatic inventory updates.
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
            label="Draft"
            value={
              draftCount
            }
          />

          <Summary
            label="Incoming"
            value={
              orderedCount
            }
          />

          <Summary
            label="Received"
            value={
              receivedCount
            }
          />

          <Summary
            label="Cancelled"
            value={
              cancelledCount
            }
          />
        </section>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
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

                  const receivedPieces =
                    order.items.reduce(
                      (
                        total,
                        item,
                      ) =>
                        total +
                        item.receivedQty,
                      0,
                    );

                  const remainingPieces =
                    Math.max(
                      0,
                      totalPieces -
                        receivedPieces,
                    );

                  const receiving =
                    receivingOrderId ===
                    order.id;

                  const busy =
                    busyOrderId ===
                    order.id;

                  const editing =
                    editingOrderId ===
                    order.id;

                  const canEdit =
                    order.status ===
                      "DRAFT" ||
                    order.status ===
                      "ORDERED" ||
                    order.status ===
                      "PARTIALLY_RECEIVED";

                  const canCancel =
                    (
                      order.status ===
                        "DRAFT" ||
                      order.status ===
                        "ORDERED"
                    ) &&
                    receivedPieces ===
                      0;

                  return (
                    <article
                      key={
                        order.id
                      }
                      className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                        <div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${statusClass(
                              order.status,
                            )}`}
                          >
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
                            pcs ordered
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-px bg-slate-100">
                        <MiniStat
                          label="Ordered"
                          value={`${totalPieces}`}
                        />

                        <MiniStat
                          label="Received"
                          value={`${receivedPieces}`}
                        />

                        <MiniStat
                          label="Remaining"
                          value={`${remainingPieces}`}
                        />
                      </div>

                      <div className="grid gap-2 border-b border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
                        <InfoBox
                          label="Expected Delivery"
                          value={displayDate(
                            order.expectedAt,
                          )}
                        />

                        <InfoBox
                          label="PO Notes"
                          value={
                            order.notes ||
                            "No notes added"
                          }
                        />
                      </div>

                      {editing ? (
                        <div className="border-b border-slate-100 bg-emerald-50/30 p-4">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                            Purchase Order Details
                          </p>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label>
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                Expected Delivery Date
                              </span>

                              <input
                                type="date"
                                value={
                                  editExpectedAt
                                }
                                onChange={(event) =>
                                  setEditExpectedAt(
                                    event.target.value,
                                  )
                                }
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black outline-none focus:border-emerald-400"
                              />
                            </label>

                            <label>
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                Supplier / PO Notes
                              </span>

                              <textarea
                                value={
                                  editNotes
                                }
                                onChange={(event) =>
                                  setEditNotes(
                                    event.target.value,
                                  )
                                }
                                rows={3}
                                placeholder="Example: Call supplier before dispatch..."
                                className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-emerald-400"
                              />
                            </label>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingOrderId(
                                  null,
                                )
                              }
                              disabled={
                                busy
                              }
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black"
                            >
                              Cancel Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                saveDetails(
                                  order,
                                )
                              }
                              disabled={
                                busy
                              }
                              className="rounded-xl bg-[#06261c] px-4 py-3 text-xs font-black text-white disabled:opacity-50"
                            >
                              {busy
                                ? "Saving..."
                                : "Save PO Details"}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div className="divide-y divide-slate-100">
                        {order.items.map(
                          (item) => {
                            const remaining =
                              Math.max(
                                0,
                                item.orderedQty -
                                  item.receivedQty,
                              );

                            return (
                              <div
                                key={
                                  item.id
                                }
                                className="p-4"
                              >
                                <div className="flex items-center justify-between gap-3">
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
                                        item.receivedQty
                                      }
                                      /
                                      {
                                        item.orderedQty
                                      }{" "}
                                      pcs
                                    </p>

                                    <p className="mt-1 text-[8px] font-semibold text-slate-400">
                                      {remaining >
                                      0
                                        ? `${remaining} remaining`
                                        : "Complete"}
                                    </p>
                                  </div>
                                </div>

                                {receiving &&
                                remaining >
                                  0 ? (
                                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                                    <div>
                                      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                        Receive Now
                                      </p>

                                      <p className="mt-1 text-[9px] text-slate-500">
                                        Max{" "}
                                        {
                                          remaining
                                        }{" "}
                                        pcs
                                      </p>
                                    </div>

                                    <input
                                      type="number"
                                      min="0"
                                      max={
                                        remaining
                                      }
                                      step="1"
                                      value={
                                        receiveQty[
                                          item.id
                                        ] ??
                                        "0"
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        setReceiveQty(
                                          (
                                            current,
                                          ) => ({
                                            ...current,

                                            [item.id]:
                                              event
                                                .target
                                                .value,
                                          }),
                                        )
                                      }
                                      className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm font-black outline-none focus:border-emerald-400"
                                    />
                                  </div>
                                ) : null}
                              </div>
                            );
                          },
                        )}
                      </div>

                      <div className="border-t border-slate-100 p-4">
                        {order.status ===
                        "DRAFT" ? (
                          <button
                            type="button"
                            onClick={() =>
                              markOrdered(
                                order,
                              )
                            }
                            disabled={
                              busy
                            }
                            className="w-full rounded-2xl bg-[#06261c] px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-white disabled:opacity-50"
                          >
                            {busy
                              ? "Updating..."
                              : "Mark As Ordered"}
                          </button>
                        ) : order.status ===
                            "ORDERED" ||
                          order.status ===
                            "PARTIALLY_RECEIVED" ? (
                          receiving ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReceivingOrderId(
                                    null,
                                  );

                                  setReceiveQty(
                                    {},
                                  );
                                }}
                                disabled={
                                  busy
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black"
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  submitReceive(
                                    order,
                                  )
                                }
                                disabled={
                                  busy
                                }
                                className="rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50"
                              >
                                {busy
                                  ? "Receiving..."
                                  : "Receive Stock"}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openReceive(
                                  order,
                                )
                              }
                              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-white"
                            >
                              Receive Stock ·{" "}
                              {
                                remainingPieces
                              }{" "}
                              pcs remaining
                            </button>
                          )
                        ) : order.status ===
                          "RECEIVED" ? (
                          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-xs font-black text-emerald-700">
                            ✓ Purchase Order Fully Received
                          </div>
                        ) : order.status ===
                          "CANCELLED" ? (
                          <div className="rounded-2xl bg-red-50 px-4 py-3 text-center text-xs font-black text-red-600">
                            Purchase Order Cancelled
                          </div>
                        ) : null}

                        {canEdit &&
                        !receiving &&
                        !editing ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  order,
                                )
                              }
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black"
                            >
                              Edit Details
                            </button>

                            {canCancel ? (
                              <button
                                type="button"
                                onClick={() =>
                                  cancelOrder(
                                    order,
                                  )
                                }
                                disabled={
                                  busy
                                }
                                className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black text-red-600 disabled:opacity-50"
                              >
                                Cancel PO
                              </button>
                            ) : (
                              <div className="grid place-items-center rounded-xl bg-slate-50 px-3 py-2 text-center text-[8px] font-black uppercase tracking-wider text-slate-400">
                                Cancel Locked After Receipt
                              </div>
                            )}
                          </div>
                        ) : null}
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
  value: number;
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

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white p-4 text-center">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black">
        {value}
      </p>
    </div>
  );
}


function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-black text-slate-700">
        {value}
      </p>
    </div>
  );
}

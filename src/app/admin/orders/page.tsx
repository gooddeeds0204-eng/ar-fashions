"use client";

import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  inventoryRestored: boolean;
};

type Order = {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  subtotal: number;
  deliveryCharge: number;
  deliveryChargePending: boolean;
  totalAmount: number;
  createdAt: string;
  customer: {
    name: string | null;
    phone: string | null;
  };
  address: {
    name: string | null;
    phone: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    pincode: string;
    landmark: string | null;
  } | null;
  items: OrderItem[];
};

const statuses = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
];

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function timelineSteps(status: string) {
  const mainFlow = [
    "PENDING",
    "CONFIRMED",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
  ];

  if (status === "CANCELLED") {
    return [
      ...mainFlow.slice(0, 1),
      "CANCELLED",
    ];
  }

  if (status === "RETURN_REQUESTED") {
    return [
      ...mainFlow,
      "RETURN_REQUESTED",
    ];
  }

  if (status === "RETURNED") {
    return [
      ...mainFlow,
      "RETURN_REQUESTED",
      "RETURNED",
    ];
  }

  if (status === "REFUNDED") {
    return [
      ...mainFlow,
      "RETURN_REQUESTED",
      "RETURNED",
      "REFUNDED",
    ];
  }

  return mainFlow;
}

function timelineIndex(status: string) {
  const steps = [
    "PENDING",
    "CONFIRMED",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "RETURN_REQUESTED",
    "RETURNED",
    "REFUNDED",
    "CANCELLED",
  ];

  return steps.indexOf(status);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function statusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700";
    case "CONFIRMED":
      return "bg-blue-50 text-blue-700";
    case "PACKED":
      return "bg-purple-50 text-purple-700";
    case "SHIPPED":
      return "bg-indigo-50 text-indigo-700";
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700";
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    case "RETURN_REQUESTED":
      return "bg-orange-50 text-orange-700";
    case "RETURNED":
      return "bg-rose-50 text-rose-700";
    case "REFUNDED":
      return "bg-teal-50 text-teal-700";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [
    freightCharge,
    setFreightCharge,
  ] = useState("");

  const [
    freightUpdating,
    setFreightUpdating,
  ] = useState(false);

  useEffect(() => {
    if (!selectedOrder) {
      setFreightCharge("");
      return;
    }

    setFreightCharge(
      selectedOrder.deliveryChargePending
        ? ""
        : String(
            selectedOrder.deliveryCharge,
          ),
    );
  }, [
    selectedOrder?.id,
    selectedOrder?.deliveryCharge,
    selectedOrder?.deliveryChargePending,
  ]);

  async function loadOrders() {
    try {
      setLoading(true);

      const response = await fetch("/api/orders", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load orders.");
      }

      setOrders(data.orders || []);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load orders.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateStatus(
    orderId: string,
    status: string,
  ) {
    try {
      setUpdating(orderId);

      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update order.",
        );
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
              }
            : order,
        ),
      );

      setSelectedOrder((current) =>
        current?.id === orderId
          ? {
              ...current,
              status,
            }
          : current,
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update order.",
      );
    } finally {
      setUpdating(null);
    }
  }

  async function updateFreight() {
    if (!selectedOrder) {
      return;
    }

    const amount =
      Number(freightCharge);

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      alert(
        "Enter a valid freight charge.",
      );
      return;
    }

    try {
      setFreightUpdating(true);

      const response =
        await fetch(
          "/api/orders",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                action:
                  "SET_FREIGHT",
                orderId:
                  selectedOrder.id,
                deliveryCharge:
                  amount,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update freight.",
        );
      }

      const update = {
        deliveryCharge:
          Number(
            data.order
              .deliveryCharge,
          ),
        deliveryChargePending:
          Boolean(
            data.order
              .deliveryChargePending,
          ),
        totalAmount:
          Number(
            data.order
              .totalAmount,
          ),
      };

      setOrders(
        (current) =>
          current.map(
            (order) =>
              order.id ===
              selectedOrder.id
                ? {
                    ...order,
                    ...update,
                  }
                : order,
          ),
      );

      setSelectedOrder(
        (current) =>
          current
            ? {
                ...current,
                ...update,
              }
            : current,
      );

      setFreightCharge(
        String(
          update.deliveryCharge,
        ),
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update freight.",
      );
    } finally {
      setFreightUpdating(
        false,
      );
    }
  }

  const filteredOrders = useMemo(() => {
    if (selectedStatus === "ALL") {
      return orders;
    }

    return orders.filter(
      (order) => order.status === selectedStatus,
    );
  }, [orders, selectedStatus]);

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#172033]">
      <main className="lg:pl-[250px]">
        <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f6f7f9]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-[#8b93a3]">
                AR Fashions / Admin / Orders
              </div>

              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                Orders
              </h1>
            </div>

            <button
              onClick={loadOrders}
              className="rounded-xl border border-black/5 bg-white px-4 py-2 text-xs font-semibold shadow-sm"
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        <div className="px-5 py-7 sm:px-8 lg:px-10">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs text-zinc-400">
                Total Orders
              </p>
              <p className="mt-2 text-3xl font-black">
                {orders.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs text-zinc-400">
                Pending
              </p>
              <p className="mt-2 text-3xl font-black text-amber-600">
                {
                  orders.filter(
                    (order) => order.status === "PENDING",
                  ).length
                }
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs text-zinc-400">
                Processing
              </p>
              <p className="mt-2 text-3xl font-black text-blue-600">
                {
                  orders.filter((order) =>
                    ["CONFIRMED", "PACKED", "SHIPPED"].includes(
                      order.status,
                    ),
                  ).length
                }
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs text-zinc-400">
                Delivered
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-600">
                {
                  orders.filter(
                    (order) => order.status === "DELIVERED",
                  ).length
                }
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    selectedStatus === status
                      ? "bg-zinc-950 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {statusLabel(status)}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6 space-y-4">
            {loading ? (
              <div className="rounded-2xl bg-white p-12 text-center text-sm text-zinc-400">
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
                <div className="text-4xl">📦</div>
                <h2 className="mt-4 font-black">
                  No orders found
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  New customer orders will appear here.
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-black">
                          {order.orderNumber}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass(
                            order.status,
                          )}`}
                        >
                          {statusLabel(order.status)}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold text-zinc-500">
                          {order.paymentMethod || "N/A"}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                            Customer
                          </p>
                          <p className="font-bold">
                            {order.customer.name || "Customer"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                            Mobile
                          </p>
                          <p className="font-bold">
                            {order.customer.phone || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                            Total
                          </p>
                          <p className="font-black">
                            {money(order.totalAmount)}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-zinc-400">
                        {new Date(
                          order.createdAt,
                        ).toLocaleString("en-IN")}
                        {" · "}
                        {order.items.reduce(
                          (sum, item) => sum + item.quantity,
                          0,
                        )}{" "}
                        items
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          setSelectedOrder(order)
                        }
                        className="rounded-xl border border-black/10 px-4 py-3 text-xs font-bold"
                      >
                        View Details
                      </button>

                      <select
                        value={order.status}
                        disabled={updating === order.id}
                        onChange={(event) =>
                          updateStatus(
                            order.id,
                            event.target.value,
                          )
                        }
                        className="rounded-xl border border-black/10 bg-white px-3 py-3 text-xs font-bold outline-none"
                      >
                        {statuses
                          .filter(
                            (status) => status !== "ALL",
                          )
                          .map((status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {statusLabel(status)}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      </main>

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Order Details
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {selectedOrder.orderNumber}
                </h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                      selectedOrder.type === "RESELLER"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {selectedOrder.type === "RESELLER"
                      ? "Reseller Order"
                      : "Retail Order"}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass(
                      selectedOrder.status,
                    )}`}
                  >
                    {statusLabel(selectedOrder.status)}
                  </span>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black uppercase text-zinc-600">
                    Payment: {selectedOrder.paymentStatus}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-full bg-zinc-100 px-3 py-2 text-sm font-bold"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-black/5 bg-zinc-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Order Progress
                  </p>
                  <h3 className="mt-1 text-sm font-black">
                    {statusLabel(selectedOrder.status)}
                  </h3>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-zinc-600 shadow-sm">
                  {selectedOrder.status}
                </span>
              </div>

              <div className="mt-5 space-y-0">
                {timelineSteps(selectedOrder.status).map(
                  (step, index, steps) => {
                    const currentIndex =
                      timelineIndex(selectedOrder.status);

                    const stepIndex = timelineIndex(step);
                    const completed =
                      stepIndex <= currentIndex &&
                      currentIndex >= 0;

                    const isCurrent =
                      step === selectedOrder.status;

                    return (
                      <div
                        key={`${step}-${index}`}
                        className="flex gap-3"
                      >
                        <div className="flex w-5 flex-col items-center">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${
                              completed
                                ? "bg-zinc-950 text-white"
                                : "border border-zinc-300 bg-white text-zinc-400"
                            }`}
                          >
                            {completed ? "✓" : index + 1}
                          </div>

                          {index < steps.length - 1 && (
                            <div
                              className={`my-1 min-h-7 w-px ${
                                stepIndex < currentIndex
                                  ? "bg-zinc-950"
                                  : "bg-zinc-200"
                              }`}
                            />
                          )}
                        </div>

                        <div className="pb-5">
                          <p
                            className={`text-xs font-black ${
                              isCurrent
                                ? "text-zinc-950"
                                : completed
                                  ? "text-zinc-700"
                                  : "text-zinc-400"
                            }`}
                          >
                            {statusLabel(step)}
                          </p>

                          {isCurrent && (
                            <p className="mt-1 text-[10px] font-medium text-emerald-600">
                              Current status
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-[10px] font-bold uppercase text-zinc-400">
                  Customer
                </p>
                <p className="mt-2 font-black">
                  {selectedOrder.customer.name}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {selectedOrder.customer.phone}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-[10px] font-bold uppercase text-zinc-400">
                  Payment
                </p>
                <p className="mt-2 font-black">
                  {selectedOrder.paymentMethod || "N/A"}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Status: {selectedOrder.paymentStatus}
                </p>
              </div>
            </div>

            {selectedOrder.address && (
              <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                <p className="text-[10px] font-bold uppercase text-zinc-400">
                  Delivery Address
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  {selectedOrder.address.addressLine1}
                  {selectedOrder.address.addressLine2
                    ? `, ${selectedOrder.address.addressLine2}`
                    : ""}
                  <br />
                  {selectedOrder.address.city},{" "}
                  {selectedOrder.address.state} -{" "}
                  {selectedOrder.address.pincode}
                  {selectedOrder.address.landmark
                    ? ` · ${selectedOrder.address.landmark}`
                    : ""}
                </p>
              </div>
            )}

            <div className="mt-6">
              <h3 className="font-black">
                Products
              </h3>

              <div className="mt-3 divide-y rounded-2xl border border-black/5">
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <p className="text-sm font-bold">
                        {item.productName}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {item.colorName || "-"} ·{" "}
                        {item.sizeName || "-"} · Qty{" "}
                        {item.quantity}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-zinc-400">
                          {money(item.unitPrice)} / piece
                        </span>

                        {item.inventoryRestored ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">
                            Stock Restored
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase text-zinc-500">
                            Stock Active
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm font-black">
                      {money(item.totalPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl bg-zinc-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  Subtotal
                </span>
                <b>{money(selectedOrder.subtotal)}</b>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">
                  Delivery
                </span>

                <b className="text-right">
                  {selectedOrder.deliveryChargePending
                    ? "Freight Pending"
                    : selectedOrder.deliveryCharge === 0
                      ? "FREE"
                      : money(
                          selectedOrder.deliveryCharge,
                        )}
                </b>
              </div>

              <div className="border-t border-black/10 pt-3">
                <div className="flex justify-between">
                  <span className="font-black">
                    Total
                  </span>
                  <b className="text-lg">
                    {money(selectedOrder.totalAmount)}
                  </b>
                </div>
              </div>
            </div>

            {selectedOrder.type ===
              "RESELLER" &&
              [
                "PENDING",
                "CONFIRMED",
                "PACKED",
              ].includes(
                selectedOrder.status,
              ) && (
                <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-violet-800">
                        {selectedOrder.deliveryChargePending
                          ? "Freight Pending"
                          : "Bulk Freight"}
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-violet-700">
                        Enter the actual courier /
                        transport charge after packing.
                      </p>
                    </div>

                    {selectedOrder.deliveryChargePending && (
                      <span className="rounded-full bg-violet-700 px-3 py-1 text-[9px] font-black uppercase text-white">
                        Action Required
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <div className="flex flex-1 items-center rounded-xl border border-violet-200 bg-white px-3">
                      <span className="text-sm font-black text-zinc-500">
                        ₹
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          freightCharge
                        }
                        onChange={(event) =>
                          setFreightCharge(
                            event.target.value,
                          )
                        }
                        placeholder="Actual freight"
                        className="w-full bg-transparent px-2 py-3 text-sm font-bold outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={
                        freightUpdating
                      }
                      onClick={
                        updateFreight
                      }
                      className="rounded-xl bg-violet-700 px-4 py-3 text-xs font-black text-white disabled:opacity-50"
                    >
                      {freightUpdating
                        ? "Saving..."
                        : selectedOrder.deliveryChargePending
                          ? "Set Freight"
                          : "Update Freight"}
                    </button>
                  </div>

                  {selectedOrder.deliveryChargePending && (
                    <p className="mt-3 text-[10px] font-bold text-violet-700">
                      This order cannot be marked SHIPPED until freight is finalized.
                    </p>
                  )}
                </div>
              )}

            <div className="mt-5 flex gap-2">
              <select
                value={selectedOrder.status}
                disabled={updating === selectedOrder.id}
                onChange={(event) =>
                  updateStatus(
                    selectedOrder.id,
                    event.target.value,
                  )
                }
                className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold"
              >
                {statuses
                  .filter((status) => status !== "ALL")
                  .map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
              </select>

              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

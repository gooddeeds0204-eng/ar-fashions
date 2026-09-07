"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type OrderItem = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  colorName: string;
  sizeName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type Order = {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2:
      | string
      | null;
    city: string;
    state: string;
    pincode: string;
    landmark:
      | string
      | null;
  } | null;
};

function formatMoney(
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

function statusText(
  status: string,
) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

export default function MyOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadOrders() {
      try {
        const response =
          await fetch(
            "/api/my-orders",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Failed to load orders.",
          );
        }

        setOrders(
          Array.isArray(
            data.orders,
          )
            ? data.orders
            : [],
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load orders.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              AR Fashions
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              My Orders
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            Continue Shopping
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            Loading your orders...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-zinc-900">
              {error}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Your orders are protected
              by your customer session.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Shop Now
            </button>
          </div>
        ) : orders.length ===
          0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold">
              No orders yet
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Your future retail and
              reseller orders will
              appear here.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(
              (order) => (
                <section
                  key={order.id}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 p-4">
                    <div>
                      <p className="text-xs font-medium text-zinc-500">
                        Order
                      </p>

                      <p className="font-bold">
                        {
                          order.orderNumber
                        }
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {new Date(
                          order.createdAt,
                        ).toLocaleString(
                          "en-IN",
                          {
                            dateStyle:
                              "medium",
                            timeStyle:
                              "short",
                          },
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold">
                          {
                            order.type
                          }
                        </span>

                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                          {statusText(
                            order.status,
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-lg font-bold">
                        {formatMoney(
                          order.totalAmount,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-zinc-100">
                    {order.items.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className="flex items-center justify-between gap-4 p-4"
                        >
                          <div>
                            <p className="font-semibold">
                              {
                                item.productName
                              }
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {
                                item.colorName
                              }{" "}
                              · Size{" "}
                              {
                                item.sizeName
                              }{" "}
                              · Qty{" "}
                              {
                                item.quantity
                              }
                            </p>
                          </div>

                          <p className="font-semibold">
                            {formatMoney(
                              item.totalPrice,
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="grid gap-4 bg-zinc-50 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Payment
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {
                          order.paymentMethod
                        }{" "}
                        ·{" "}
                        {statusText(
                          order.paymentStatus,
                        )}
                      </p>
                    </div>

                    {order.address && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Delivery Address
                        </p>

                        <p className="mt-1 text-sm">
                          {
                            order
                              .address
                              .addressLine1
                          }
                          {order
                            .address
                            .addressLine2
                            ? `, ${order.address.addressLine2}`
                            : ""}
                          ,{" "}
                          {
                            order
                              .address
                              .city
                          }
                          ,{" "}
                          {
                            order
                              .address
                              .state
                          }{" "}
                          -{" "}
                          {
                            order
                              .address
                              .pincode
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              ),
            )}
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type Summary = {
  totalOrders: number;
  deliveredOrders: number;
  deliveredSales: number;
  averageOrderValue: number;
  pipelineOrders: number;
  pipelineValue: number;
  discountTotal: number;
  deliveryRevenue: number;
};

type TypeSales = {
  orders: number;
  sales: number;
};

type StatusItem = {
  status: string;
  orders: number;
  value: number;
};

type TrendItem = {
  date: string;
  orders: number;
  sales: number;
};

type ProductItem = {
  productId: string;
  name: string;
  quantity: number;
  itemSales: number;
};

type CustomerItem = {
  userId: string;
  name: string;
  phone: string | null;
  orders: number;
  sales: number;
};

type ReportData = {
  range: {
    days: number;
    from: string;
    to: string;
  };

  summary: Summary;

  salesByType: {
    RETAIL: TypeSales;
    RESELLER: TypeSales;
  };

  statusBreakdown:
    StatusItem[];

  dailyTrend:
    TrendItem[];

  topProducts:
    ProductItem[];

  topCustomers:
    CustomerItem[];

  notes: {
    salesRule: string;
    trendRule: string;
    profitRule: string;
  };
};

function money(value: number) {
  return `₹${Number(
    value || 0,
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

function statusLabel(
  value: string,
) {
  return value.replaceAll(
    "_",
    " ",
  );
}

export default function ReportsPage() {
  const router =
    useRouter();

  const [
    days,
    setDays,
  ] =
    useState<
      7 | 30 | 90
    >(30);

  const [
    data,
    setData,
  ] =
    useState<ReportData | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  async function loadReports() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          `/api/admin/reports?days=${days}`,
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

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Failed to load reports.",
        );
      }

      setData(result);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load reports.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [days]);

  const maxTrend =
    useMemo(() => {
      if (!data) {
        return 0;
      }

      return Math.max(
        0,
        ...data.dailyTrend.map(
          (item) =>
            item.sales,
        ),
      );
    }, [data]);

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-4 py-6 text-[#172033] md:px-8">
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              AR FASHIONS
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Reports & Analytics
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Sales, orders, customers and product performance.
            </p>
          </div>

          <button
            type="button"
            onClick={
              loadReports
            }
            className="rounded-xl border border-black/5 bg-white px-4 py-2.5 text-xs font-black shadow-sm"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          {[
            7,
            30,
            90,
          ].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setDays(
                  value as
                    | 7
                    | 30
                    | 90,
                )
              }
              className={`rounded-xl px-4 py-2 text-xs font-black ${
                days === value
                  ? "bg-zinc-950 text-white"
                  : "border border-black/5 bg-white text-zinc-600"
              }`}
            >
              {value} Days
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-10 text-sm font-bold text-zinc-400">
            Loading reports...
          </div>
        ) : data ? (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Delivered Sales
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-700">
                  {money(
                    data.summary
                      .deliveredSales,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  {
                    data.summary
                      .deliveredOrders
                  }{" "}
                  delivered orders
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Average Order Value
                </p>

                <p className="mt-2 text-3xl font-black">
                  {money(
                    data.summary
                      .averageOrderValue,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  Delivered orders
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Active Pipeline
                </p>

                <p className="mt-2 text-3xl font-black text-violet-700">
                  {money(
                    data.summary
                      .pipelineValue,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  {
                    data.summary
                      .pipelineOrders
                  }{" "}
                  active orders
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Total Orders
                </p>

                <p className="mt-2 text-3xl font-black">
                  {
                    data.summary
                      .totalOrders
                  }
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  Selected period
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Discounts
                </p>

                <p className="mt-2 text-2xl font-black">
                  {money(
                    data.summary
                      .discountTotal,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  Delivered orders only
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Delivery Revenue
                </p>

                <p className="mt-2 text-2xl font-black">
                  {money(
                    data.summary
                      .deliveryRevenue,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  Delivered orders only
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Retail Sales
                </p>

                <p className="mt-2 text-2xl font-black">
                  {money(
                    data.salesByType
                      .RETAIL.sales,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  {
                    data.salesByType
                      .RETAIL.orders
                  }{" "}
                  delivered
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Reseller Sales
                </p>

                <p className="mt-2 text-2xl font-black">
                  {money(
                    data.salesByType
                      .RESELLER.sales,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  {
                    data.salesByType
                      .RESELLER.orders
                  }{" "}
                  delivered
                </p>
              </div>
            </section>

            <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black">
                    Sales Trend
                  </h2>

                  <p className="mt-1 text-xs text-zinc-400">
                    Delivered order value by order creation date.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex h-52 items-end gap-1 overflow-x-auto border-b border-zinc-100 pb-1">
                {data.dailyTrend.map(
                  (item) => {
                    const height =
                      maxTrend > 0
                        ? Math.max(
                            4,
                            Math.round(
                              (item.sales /
                                maxTrend) *
                                180,
                            ),
                          )
                        : 4;

                    return (
                      <div
                        key={
                          item.date
                        }
                        className="flex min-w-3 flex-1 flex-col items-center justify-end"
                        title={`${item.date} · ${money(
                          item.sales,
                        )}`}
                      >
                        <div
                          className={`w-full min-w-2 rounded-t ${
                            item.sales > 0
                              ? "bg-emerald-500"
                              : "bg-zinc-100"
                          }`}
                          style={{
                            height:
                              `${height}px`,
                          }}
                        />
                      </div>
                    );
                  },
                )}
              </div>

              <div className="mt-3 flex justify-between text-[10px] font-bold text-zinc-400">
                <span>
                  {
                    data.dailyTrend[0]
                      ?.date
                  }
                </span>

                <span>
                  {
                    data.dailyTrend[
                      data.dailyTrend
                        .length - 1
                    ]?.date
                  }
                </span>
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black">
                  Order Status
                </h2>

                <div className="mt-4 divide-y">
                  {data.statusBreakdown.map(
                    (item) => (
                      <div
                        key={
                          item.status
                        }
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div>
                          <p className="text-xs font-black">
                            {statusLabel(
                              item.status,
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-400">
                            {
                              item.orders
                            }{" "}
                            orders
                          </p>
                        </div>

                        <p className="text-sm font-black">
                          {money(
                            item.value,
                          )}
                        </p>
                      </div>
                    ),
                  )}

                  {data.statusBreakdown
                    .length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      No orders in this period.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black">
                  Top Products
                </h2>

                <p className="mt-1 text-xs text-zinc-400">
                  Delivered item quantities.
                </p>

                <div className="mt-4 divide-y">
                  {data.topProducts.map(
                    (
                      product,
                      index,
                    ) => (
                      <div
                        key={
                          product.productId
                        }
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-black">
                            {index +
                              1}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-black">
                              {
                                product.name
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-zinc-400">
                              {
                                product.quantity
                              }{" "}
                              pcs sold
                            </p>
                          </div>
                        </div>

                        <p className="text-sm font-black">
                          {money(
                            product.itemSales,
                          )}
                        </p>
                      </div>
                    ),
                  )}

                  {data.topProducts
                    .length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      No delivered products yet.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
                <h2 className="text-lg font-black">
                  Top Customers
                </h2>

                <div className="mt-4 divide-y">
                  {data.topCustomers.map(
                    (
                      customer,
                      index,
                    ) => (
                      <div
                        key={
                          customer.userId
                        }
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-black">
                            {index +
                              1}
                          </span>

                          <div>
                            <p className="text-xs font-black">
                              {
                                customer.name
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-zinc-400">
                              {customer.phone
                                ? `${customer.phone} · `
                                : ""}
                              {
                                customer.orders
                              }{" "}
                              delivered orders
                            </p>
                          </div>
                        </div>

                        <p className="text-sm font-black text-emerald-700">
                          {money(
                            customer.sales,
                          )}
                        </p>
                      </div>
                    ),
                  )}

                  {data.topCustomers
                    .length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      No delivered customers yet.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-black uppercase tracking-wider text-amber-800">
                Reporting Notes
              </p>

              <p className="mt-3 text-xs leading-6 text-amber-800">
                • {data.notes.salesRule}
                <br />
                • {data.notes.trendRule}
                <br />
                • {data.notes.profitRule}
              </p>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

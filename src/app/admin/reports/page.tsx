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

type ProfitSummary = {
  merchandiseRevenue: number;
  snapshotCoveredRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;

  snapshotCoveragePercent:
    number;

  snapshotPieceCoveragePercent:
    number;

  deliveredItemPieces: number;
  snapshotCoveredPieces: number;

  negativeMarginProducts:
    number;

  lowMarginProductCount:
    number;
};

type ProfitTypeStats = {
  revenue: number;
  coveredRevenue: number;
  cogs: number;
  profit: number;
  marginPercent: number;
  coveragePercent: number;
};

type ProfitProductItem = {
  productId: string;
  name: string;
  quantity: number;
  coveredQuantity: number;
  revenue: number;
  coveredRevenue: number;
  cogs: number;
  profit: number;
  marginPercent: number;
  coveragePercent: number;
};

type ProfitAnalytics = {
  summary: ProfitSummary;

  byType: {
    RETAIL:
      ProfitTypeStats;

    RESELLER:
      ProfitTypeStats;
  };

  topProfitProducts:
    ProfitProductItem[];

  lowMarginProducts:
    ProfitProductItem[];
};

type PurchaseSummary = {
  purchaseOrders: number;
  purchaseSpend: number;
  receivedPurchaseValue: number;
  receivedPurchasePieces: number;
  pendingIncomingValue: number;
  pendingIncomingPieces: number;
  draftPurchaseValue: number;
  draftPurchasePieces: number;
  cancelledPurchaseOrders: number;
};

type SupplierSpendItem = {
  supplierId: string;
  supplierName: string;
  purchaseOrders: number;
  committedValue: number;
  receivedValue: number;
  incomingValue: number;
  draftValue: number;
  receivedPieces: number;
};

type PurchasedProductItem = {
  name: string;
  quantity: number;
  purchaseValue: number;
};

type PurchaseTrendItem = {
  date: string;
  purchaseOrders: number;
  committedValue: number;
  receivedValue: number;
};

type CostAlertItem = {
  supplierId: string;
  supplierName: string;
  variantId: string;
  productName: string;
  colorName: string;
  sizeName: string;
  sku: string | null;
  quotedCost: number;
  lastPurchaseCost: number;
  difference: number;
  percentChange: number;
  direction:
    | "INCREASE"
    | "DROP"
    | "SAME";
  preferred: boolean;
  lastPurchasedAt:
    | string
    | null;
};

type PurchaseAnalytics = {
  summary: PurchaseSummary;
  supplierSpend:
    SupplierSpendItem[];
  topPurchasedProducts:
    PurchasedProductItem[];
  purchaseTrend:
    PurchaseTrendItem[];
  costAlerts:
    CostAlertItem[];
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

  profitAnalytics:
    ProfitAnalytics;

  purchaseAnalytics:
    PurchaseAnalytics;

  notes: {
    salesRule: string;
    trendRule: string;
    profitRule: string;
    purchaseRule: string;
    purchaseTrendRule: string;
    costAlertRule: string;
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

  const maxPurchaseTrend =
    useMemo(() => {
      if (!data) {
        return 0;
      }

      return Math.max(
        0,
        ...data.purchaseAnalytics
          .purchaseTrend.map(
            (item) =>
              item.committedValue,
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

            <section className="mt-8 overflow-hidden rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
                    Profit Intelligence
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Margin & Profitability
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    Delivered merchandise revenue compared with historical cost snapshots.
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                    Cost Coverage
                  </p>

                  <p className="mt-1 text-xl font-black text-emerald-800">
                    {
                      data.profitAnalytics
                        .summary
                        .snapshotCoveragePercent
                    }%
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                    Gross Profit
                  </p>

                  <p className="mt-2 text-2xl font-black text-emerald-800">
                    {money(
                      data.profitAnalytics
                        .summary
                        .grossProfit,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                    COGS
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {money(
                      data.profitAnalytics
                        .summary
                        .cogs,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-violet-50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-violet-600">
                    Gross Margin
                  </p>

                  <p className="mt-2 text-2xl font-black text-violet-800">
                    {
                      data.profitAnalytics
                        .summary
                        .grossMarginPercent
                    }%
                  </p>
                </div>

                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-sky-600">
                    Covered Revenue
                  </p>

                  <p className="mt-2 text-2xl font-black text-sky-800">
                    {money(
                      data.profitAnalytics
                        .summary
                        .snapshotCoveredRevenue,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">
                        Retail Margin
                      </p>

                      <p className="mt-1 text-[10px] text-zinc-400">
                        Covered revenue{" "}
                        {money(
                          data.profitAnalytics
                            .byType
                            .RETAIL
                            .coveredRevenue,
                        )}
                      </p>
                    </div>

                    <p className="text-xl font-black text-emerald-700">
                      {
                        data.profitAnalytics
                          .byType
                          .RETAIL
                          .marginPercent
                      }%
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-black/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">
                        Reseller Margin
                      </p>

                      <p className="mt-1 text-[10px] text-zinc-400">
                        Covered revenue{" "}
                        {money(
                          data.profitAnalytics
                            .byType
                            .RESELLER
                            .coveredRevenue,
                        )}
                      </p>
                    </div>

                    <p className="text-xl font-black text-emerald-700">
                      {
                        data.profitAnalytics
                          .byType
                          .RESELLER
                          .marginPercent
                      }%
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 text-[10px] font-bold text-zinc-500">
                Snapshot coverage{" "}
                {
                  data.profitAnalytics
                    .summary
                    .snapshotCoveredPieces
                }{" "}
                /{" "}
                {
                  data.profitAnalytics
                    .summary
                    .deliveredItemPieces
                }{" "}
                pcs · Negative-margin products{" "}
                {
                  data.profitAnalytics
                    .summary
                    .negativeMarginProducts
                }{" "}
                · Low-margin products{" "}
                {
                  data.profitAnalytics
                    .summary
                    .lowMarginProductCount
                }
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">
                      Top Profit Products
                    </h2>

                    <p className="mt-1 text-xs text-zinc-400">
                      Highest gross profit from snapshot-covered sales.
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
                    {
                      data.profitAnalytics
                        .topProfitProducts
                        .length
                    }{" "}
                    products
                  </span>
                </div>

                <div className="mt-4 divide-y">
                  {data.profitAnalytics.topProfitProducts.map(
                    (product, index) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between gap-4 py-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">
                            {index + 1}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-black">
                              {product.name}
                            </p>

                            <p className="mt-1 text-[10px] text-zinc-400">
                              {
                                product.coveredQuantity
                              }{" "}
                              pcs · Revenue{" "}
                              {money(
                                product.coveredRevenue,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-black ${
                            product.profit >= 0
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}>
                            {money(
                              product.profit,
                            )}
                          </p>

                          <p className="mt-1 text-[9px] font-bold text-zinc-400">
                            {
                              product.marginPercent
                            }% margin
                          </p>
                        </div>
                      </div>
                    ),
                  )}

                  {data.profitAnalytics
                    .topProfitProducts
                    .length === 0 && (
                    <div className="py-10 text-center">
                      <p className="text-sm font-black text-zinc-500">
                        No profit data yet
                      </p>

                      <p className="mt-1 text-xs text-zinc-400">
                        New delivered orders with cost snapshots will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">
                      Low Margin Products
                    </h2>

                    <p className="mt-1 text-xs text-zinc-400">
                      Snapshot-covered products below 20% gross margin.
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-700">
                    {
                      data.profitAnalytics
                        .lowMarginProducts
                        .length
                    }{" "}
                    alerts
                  </span>
                </div>

                <div className="mt-4 divide-y">
                  {data.profitAnalytics.lowMarginProducts.map(
                    (product) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between gap-4 py-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black">
                            {product.name}
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-400">
                            Revenue{" "}
                            {money(
                              product.coveredRevenue,
                            )}{" "}
                            · COGS{" "}
                            {money(
                              product.cogs,
                            )}
                          </p>
                        </div>

                        <div
                          className={`shrink-0 rounded-xl px-3 py-2 text-right ${
                            product.marginPercent < 0
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <p className="text-sm font-black">
                            {
                              product.marginPercent
                            }%
                          </p>

                          <p className="mt-0.5 text-[9px] font-bold">
                            {money(
                              product.profit,
                            )}{" "}
                            profit
                          </p>
                        </div>
                      </div>
                    ),
                  )}

                  {data.profitAnalytics
                    .lowMarginProducts
                    .length === 0 && (
                    <div className="py-10 text-center">
                      <p className="text-sm font-black text-emerald-700">
                        No low-margin alerts
                      </p>

                      <p className="mt-1 text-xs text-zinc-400">
                        Only snapshot-covered delivered products are evaluated.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="mt-8 overflow-hidden rounded-[28px] bg-zinc-950 p-5 text-white shadow-xl sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
                    Purchasing Intelligence
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Purchase & Supplier Analytics
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    Supplier spend, incoming stock value, received purchases and cost movement.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Active POs
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      data.purchaseAnalytics
                        .summary
                        .purchaseOrders
                    }
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Purchase Spend
                  </p>

                  <p className="mt-2 text-2xl font-black text-emerald-400">
                    {money(
                      data.purchaseAnalytics
                        .summary
                        .purchaseSpend,
                    )}
                  </p>

                  <p className="mt-2 text-[10px] text-zinc-500">
                    Non-cancelled PO value
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Received
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {money(
                      data.purchaseAnalytics
                        .summary
                        .receivedPurchaseValue,
                    )}
                  </p>

                  <p className="mt-2 text-[10px] text-zinc-500">
                    {
                      data.purchaseAnalytics
                        .summary
                        .receivedPurchasePieces
                    }{" "}
                    pcs received
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70">
                    Incoming
                  </p>

                  <p className="mt-2 text-2xl font-black text-amber-300">
                    {money(
                      data.purchaseAnalytics
                        .summary
                        .pendingIncomingValue,
                    )}
                  </p>

                  <p className="mt-2 text-[10px] text-zinc-500">
                    {
                      data.purchaseAnalytics
                        .summary
                        .pendingIncomingPieces
                    }{" "}
                    pcs on the way
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.07] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300/70">
                    Draft Purchase
                  </p>

                  <p className="mt-2 text-2xl font-black text-violet-300">
                    {money(
                      data.purchaseAnalytics
                        .summary
                        .draftPurchaseValue,
                    )}
                  </p>

                  <p className="mt-2 text-[10px] text-zinc-500">
                    {
                      data.purchaseAnalytics
                        .summary
                        .draftPurchasePieces
                    }{" "}
                    pcs planned
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black">
                      Purchase Trend
                    </h3>

                    <p className="mt-1 text-[10px] text-zinc-500">
                      PO committed value by creation date.
                    </p>
                  </div>

                  <p className="text-[10px] font-bold text-zinc-500">
                    {
                      data.purchaseAnalytics
                        .summary
                        .cancelledPurchaseOrders
                    }{" "}
                    cancelled excluded
                  </p>
                </div>

                <div className="mt-5 flex h-40 items-end gap-1 overflow-x-auto border-b border-white/10 pb-1">
                  {data.purchaseAnalytics.purchaseTrend.map(
                    (item) => {
                      const height =
                        maxPurchaseTrend > 0
                          ? Math.max(
                              3,
                              Math.round(
                                (item.committedValue /
                                  maxPurchaseTrend) *
                                  130,
                              ),
                            )
                          : 3;

                      return (
                        <div
                          key={item.date}
                          className="flex min-w-3 flex-1 flex-col items-center justify-end"
                          title={`${item.date} · ${money(
                            item.committedValue,
                          )}`}
                        >
                          <div
                            className={`w-full min-w-2 rounded-t ${
                              item.committedValue >
                              0
                                ? "bg-emerald-400"
                                : "bg-white/10"
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

                <div className="mt-3 flex justify-between text-[9px] font-bold text-zinc-600">
                  <span>
                    {
                      data.purchaseAnalytics
                        .purchaseTrend[0]
                        ?.date
                    }
                  </span>

                  <span>
                    {
                      data.purchaseAnalytics
                        .purchaseTrend[
                          data.purchaseAnalytics
                            .purchaseTrend
                            .length - 1
                        ]?.date
                    }
                  </span>
                </div>
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black">
                  Supplier Spend
                </h2>

                <p className="mt-1 text-xs text-zinc-400">
                  Purchase performance by supplier.
                </p>

                <div className="mt-4 divide-y">
                  {data.purchaseAnalytics.supplierSpend.map(
                    (supplier, index) => (
                      <div
                        key={
                          supplier.supplierId
                        }
                        className="py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">
                              {index + 1}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-black">
                                {
                                  supplier.supplierName
                                }
                              </p>

                              <p className="mt-1 text-[10px] text-zinc-400">
                                {
                                  supplier.purchaseOrders
                                }{" "}
                                POs ·{" "}
                                {
                                  supplier.receivedPieces
                                }{" "}
                                pcs received
                              </p>
                            </div>
                          </div>

                          <p className="shrink-0 text-sm font-black text-emerald-700">
                            {money(
                              supplier.receivedValue,
                            )}
                          </p>
                        </div>

                        {(supplier.incomingValue >
                          0 ||
                          supplier.draftValue >
                            0) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {supplier.incomingValue >
                              0 && (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black text-amber-700">
                                Incoming{" "}
                                {money(
                                  supplier.incomingValue,
                                )}
                              </span>
                            )}

                            {supplier.draftValue >
                              0 && (
                              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black text-violet-700">
                                Draft{" "}
                                {money(
                                  supplier.draftValue,
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ),
                  )}

                  {data.purchaseAnalytics
                    .supplierSpend
                    .length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      No supplier purchases in this period.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black">
                  Top Purchased Products
                </h2>

                <p className="mt-1 text-xs text-zinc-400">
                  Based on received purchase quantities.
                </p>

                <div className="mt-4 divide-y">
                  {data.purchaseAnalytics.topPurchasedProducts.map(
                    (product, index) => (
                      <div
                        key={`${product.name}-${index}`}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-black">
                            {index + 1}
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
                              pcs received
                            </p>
                          </div>
                        </div>

                        <p className="shrink-0 text-sm font-black">
                          {money(
                            product.purchaseValue,
                          )}
                        </p>
                      </div>
                    ),
                  )}

                  {data.purchaseAnalytics
                    .topPurchasedProducts
                    .length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      No received purchases in this period.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">
                    Supplier Cost Alerts
                  </h2>

                  <p className="mt-1 text-xs text-zinc-400">
                    Current quoted cost compared with last received purchase cost.
                  </p>
                </div>

                <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[10px] font-black">
                  {
                    data.purchaseAnalytics
                      .costAlerts.length
                  }{" "}
                  changes
                </span>
              </div>

              <div className="mt-4 divide-y">
                {data.purchaseAnalytics.costAlerts.map(
                  (alert) => (
                    <div
                      key={`${alert.supplierId}-${alert.variantId}`}
                      className="flex flex-wrap items-center justify-between gap-4 py-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-black">
                            {
                              alert.productName
                            }
                          </p>

                          {alert.preferred && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-700">
                              Preferred
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-[10px] text-zinc-400">
                          {
                            alert.colorName
                          }{" "}
                          ·{" "}
                          {
                            alert.sizeName
                          }{" "}
                          ·{" "}
                          {
                            alert.supplierName
                          }
                        </p>

                        <p className="mt-2 text-[10px] font-bold text-zinc-500">
                          Last{" "}
                          {money(
                            alert.lastPurchaseCost,
                          )}{" "}
                          → Quote{" "}
                          {money(
                            alert.quotedCost,
                          )}
                        </p>
                      </div>

                      <div
                        className={`rounded-2xl px-3 py-2 text-right ${
                          alert.direction ===
                          "INCREASE"
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <p className="text-xs font-black">
                          {alert.direction ===
                          "INCREASE"
                            ? "▲"
                            : "▼"}{" "}
                          {Math.abs(
                            alert.percentChange,
                          )}
                          %
                        </p>

                        <p className="mt-0.5 text-[9px] font-bold">
                          {alert.direction ===
                          "INCREASE"
                            ? "+"
                            : "-"}
                          {money(
                            Math.abs(
                              alert.difference,
                            ),
                          )}
                        </p>
                      </div>
                    </div>
                  ),
                )}

                {data.purchaseAnalytics
                  .costAlerts.length ===
                  0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm font-black text-emerald-700">
                      Costs are stable
                    </p>

                    <p className="mt-1 text-xs text-zinc-400">
                      No supplier quote changes against the last purchase cost.
                    </p>
                  </div>
                )}
              </div>
            </section>

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
                <br />
                • {data.notes.purchaseRule}
                <br />
                • {data.notes.purchaseTrendRule}
                <br />
                • {data.notes.costAlertRule}
              </p>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

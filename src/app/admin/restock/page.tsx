"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type StockHealth =
  | "HEALTHY"
  | "LOW"
  | "CRITICAL"
  | "OUT_OF_STOCK";

type InventoryVariant = {
  id: string;
  productId: string;

  product: {
    id: string;
    name: string;
    sku: string | null;
    status: string;
    gender: string;
  };

  color: {
    id: string;
    name: string;
    family: string | null;
    hexCode: string | null;
  };

  size: {
    id: string;
    name: string;
    category: string | null;
    sizeType: string | null;
    inches: string | null;
  };

  sku: string | null;

  stock: number;
  reservedStock: number;
  availableStock: number;

  recentSalesQty: number;

  stockHealth:
    StockHealth;

  recommendedReorderQty:
    number;

  costPrice:
    number | null;

  retailPrice:
    number | null;

  resellerPrice:
    number | null;
};

type InventoryResponse = {
  variants:
    InventoryVariant[];

  settings: {
    lowStockThreshold:
      number;

    criticalStockThreshold:
      number;
  };
};

type QueueFilter =
  | "ALL"
  | "OUT_OF_STOCK"
  | "CRITICAL"
  | "LOW";

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

function healthLabel(
  health: StockHealth,
) {
  if (
    health ===
    "OUT_OF_STOCK"
  ) {
    return "Out of Stock";
  }

  if (
    health === "CRITICAL"
  ) {
    return "Critical";
  }

  if (
    health === "LOW"
  ) {
    return "Low Stock";
  }

  return "Healthy";
}

function healthClass(
  health: StockHealth,
) {
  if (
    health ===
    "OUT_OF_STOCK"
  ) {
    return "bg-red-50 text-red-700";
  }

  if (
    health === "CRITICAL"
  ) {
    return "bg-rose-50 text-rose-700";
  }

  if (
    health === "LOW"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

export default function RestockQueuePage() {
  const router =
    useRouter();

  const [
    variants,
    setVariants,
  ] =
    useState<
      InventoryVariant[]
    >([]);

  const [
    settings,
    setSettings,
  ] = useState({
    lowStockThreshold: 5,
    criticalStockThreshold: 2,
  });

  const [
    filter,
    setFilter,
  ] =
    useState<QueueFilter>(
      "ALL",
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  async function loadQueue(
    refresh = false,
  ) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setMessage("");

      const response =
        await fetch(
          "/api/inventory",
          {
            cache: "no-store",
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
        (await response.json()) as
          Partial<InventoryResponse> & {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to load restock queue.",
        );
      }

      setVariants(
        Array.isArray(
          data.variants,
        )
          ? data.variants
          : [],
      );

      if (data.settings) {
        setSettings(
          data.settings,
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load restock queue.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  const queue =
    useMemo(
      () =>
        variants
          .filter(
            (item) =>
              item.recommendedReorderQty >
              0,
          )
          .sort(
            (a, b) => {
              const priority = {
                OUT_OF_STOCK:
                  0,
                CRITICAL: 1,
                LOW: 2,
                HEALTHY: 3,
              };

              const severity =
                priority[
                  a.stockHealth
                ] -
                priority[
                  b.stockHealth
                ];

              if (
                severity !== 0
              ) {
                return severity;
              }

              return (
                a.availableStock -
                b.availableStock
              );
            },
          ),
      [variants],
    );

  const visibleQueue =
    useMemo(() => {
      if (
        filter === "ALL"
      ) {
        return queue;
      }

      return queue.filter(
        (item) =>
          item.stockHealth ===
          filter,
      );
    }, [
      queue,
      filter,
    ]);

  const groups =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            productId: string;
            productName: string;
            productSku:
              string | null;
            items:
              InventoryVariant[];
          }
        >();

      for (
        const item of visibleQueue
      ) {
        const current =
          map.get(
            item.productId,
          );

        if (current) {
          current.items.push(
            item,
          );
        } else {
          map.set(
            item.productId,
            {
              productId:
                item.productId,

              productName:
                item.product.name,

              productSku:
                item.product.sku,

              items: [item],
            },
          );
        }
      }

      return Array.from(
        map.values(),
      );
    }, [visibleQueue]);

  const totalRequiredPieces =
    queue.reduce(
      (total, item) =>
        total +
        item.recommendedReorderQty,
      0,
    );

  const estimatedPurchaseCost =
    queue.reduce(
      (total, item) =>
        total +
        (item.costPrice ===
        null
          ? 0
          : item.costPrice *
            item.recommendedReorderQty),
      0,
    );

  const pricedVariants =
    queue.filter(
      (item) =>
        item.costPrice !==
        null,
    ).length;

  const missingCostVariants =
    queue.length -
    pricedVariants;

  const criticalCount =
    queue.filter(
      (item) =>
        item.stockHealth ===
        "CRITICAL",
    ).length;

  const outCount =
    queue.filter(
      (item) =>
        item.stockHealth ===
        "OUT_OF_STOCK",
    ).length;

  const lowCount =
    queue.filter(
      (item) =>
        item.stockHealth ===
        "LOW",
    ).length;

  async function copyPlan() {
    if (
      queue.length === 0
    ) {
      setMessage(
        "Restock queue is empty.",
      );
      return;
    }

    const lines = [
      "AR FASHIONS - RESTOCK PLAN",
      "",
      `Variants: ${queue.length}`,
      `Required Pieces: ${totalRequiredPieces}`,
      `Estimated Cost: ${
        pricedVariants > 0
          ? money(
              estimatedPurchaseCost,
            )
          : "Not available"
      }`,
      "",
      ...queue.map(
        (item) =>
          `${item.product.name} | ${item.color.name} | ${item.size.name} | Add ${item.recommendedReorderQty} pcs`,
      ),
    ];

    try {
      await navigator.clipboard.writeText(
        lines.join("\n"),
      );

      setMessage(
        "Purchase plan copied successfully.",
      );
    } catch {
      setMessage(
        "Could not copy purchase plan.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin",
                )
              }
              className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
            >
              ← Dashboard
            </button>

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              AR FASHIONS
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Restock Queue
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Product-wise purchase planning from live low-stock alerts.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={
                copyPlan
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black"
            >
              Copy Plan
            </button>

            <button
              type="button"
              onClick={() =>
                loadQueue(
                  true,
                )
              }
              disabled={
                refreshing
              }
              className="rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Variants To Restock"
            value={
              queue.length
            }
          />

          <SummaryCard
            label="Required Pieces"
            value={
              totalRequiredPieces
            }
          />

          <SummaryCard
            label="Estimated Cost"
            value={
              pricedVariants >
              0
                ? money(
                    estimatedPurchaseCost,
                  )
                : "—"
            }
          />

          <SummaryCard
            label="Products"
            value={
              new Set(
                queue.map(
                  (item) =>
                    item.productId,
                ),
              ).size
            }
          />
        </section>

        <section className="mt-4 overflow-hidden rounded-3xl border border-black/[0.05] bg-[#06261c] text-white shadow-sm">
          <div className="grid grid-cols-3 gap-px bg-white/10">
            <div className="bg-[#06261c] p-4">
              <p className="text-[8px] font-black uppercase tracking-wider text-red-300">
                Out
              </p>

              <p className="mt-1 text-2xl font-black">
                {outCount}
              </p>
            </div>

            <div className="bg-[#06261c] p-4">
              <p className="text-[8px] font-black uppercase tracking-wider text-rose-300">
                Critical
              </p>

              <p className="mt-1 text-2xl font-black">
                {
                  criticalCount
                }
              </p>
            </div>

            <div className="bg-[#06261c] p-4">
              <p className="text-[8px] font-black uppercase tracking-wider text-amber-300">
                Low
              </p>

              <p className="mt-1 text-2xl font-black">
                {lowCount}
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-3 text-[9px] text-white/50">
            Rules · Low ≤{" "}
            {
              settings.lowStockThreshold
            }{" "}
            · Critical ≤{" "}
            {
              settings.criticalStockThreshold
            }
          </div>
        </section>

        {missingCostVariants >
        0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-black text-amber-800">
              Purchase cost is partial
            </p>

            <p className="mt-1 text-[10px] font-semibold text-amber-700">
              {
                missingCostVariants
              }{" "}
              variant
              {missingCostVariants ===
              1
                ? ""
                : "s"}{" "}
              do not have a cost price yet.
            </p>
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
            {message}
          </div>
        ) : null}

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto">
            {[
              [
                "ALL",
                `All ${queue.length}`,
              ],
              [
                "OUT_OF_STOCK",
                `Out ${outCount}`,
              ],
              [
                "CRITICAL",
                `Critical ${criticalCount}`,
              ],
              [
                "LOW",
                `Low ${lowCount}`,
              ],
            ].map(
              ([
                value,
                label,
              ]) => (
                <button
                  key={
                    value
                  }
                  type="button"
                  onClick={() =>
                    setFilter(
                      value as QueueFilter,
                    )
                  }
                  className={`whitespace-nowrap rounded-2xl px-4 py-3 text-[10px] font-black ${
                    filter ===
                    value
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </section>

        {loading ? (
          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-black text-slate-500">
            Loading restock plan...
          </div>
        ) : groups.length ===
          0 ? (
          <div className="mt-5 rounded-3xl border border-emerald-100 bg-white p-10 text-center shadow-sm">
            <p className="text-xl font-black text-emerald-700">
              Stock is healthy ✓
            </p>

            <p className="mt-2 text-sm text-slate-500">
              No variants currently need restocking.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {groups.map(
              (group) => {
                const groupPieces =
                  group.items.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.recommendedReorderQty,
                    0,
                  );

                const groupCost =
                  group.items.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      (item.costPrice ===
                      null
                        ? 0
                        : item.costPrice *
                          item.recommendedReorderQty),
                    0,
                  );

                const groupHasCost =
                  group.items.some(
                    (item) =>
                      item.costPrice !==
                      null,
                  );

                return (
                  <section
                    key={
                      group.productId
                    }
                    className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
                          Purchase Batch
                        </p>

                        <h2 className="mt-1 text-lg font-black">
                          {
                            group.productName
                          }
                        </h2>

                        <p className="mt-1 text-[9px] font-semibold text-slate-400">
                          {group.productSku ??
                            "No product SKU"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-black">
                          {
                            groupPieces
                          }{" "}
                          pcs
                        </p>

                        <p className="mt-1 text-[9px] font-semibold text-slate-400">
                          {groupHasCost
                            ? money(
                                groupCost,
                              )
                            : "Cost unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {group.items.map(
                        (item) => (
                          <div
                            key={
                              item.id
                            }
                            className="p-4 sm:p-5"
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-slate-200"
                                style={{
                                  backgroundColor:
                                    item.color
                                      .hexCode ??
                                    "#f1f5f9",
                                }}
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-black">
                                    {
                                      item.color.name
                                    }{" "}
                                    ·{" "}
                                    {
                                      item.size.name
                                    }
                                  </p>

                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${healthClass(
                                      item.stockHealth,
                                    )}`}
                                  >
                                    {healthLabel(
                                      item.stockHealth,
                                    )}
                                  </span>
                                </div>

                                <p className="mt-1 text-[9px] font-semibold text-slate-400">
                                  Available{" "}
                                  {
                                    item.availableStock
                                  }{" "}
                                  · 30d sales{" "}
                                  {
                                    item.recentSalesQty
                                  }
                                </p>

                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  <MiniStat
                                    label="Add"
                                    value={`+${item.recommendedReorderQty}`}
                                  />

                                  <MiniStat
                                    label="Cost / pc"
                                    value={
                                      item.costPrice ===
                                      null
                                        ? "—"
                                        : money(
                                            item.costPrice,
                                          )
                                    }
                                  />

                                  <MiniStat
                                    label="Est."
                                    value={
                                      item.costPrice ===
                                      null
                                        ? "—"
                                        : money(
                                            item.costPrice *
                                              item.recommendedReorderQty,
                                          )
                                    }
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/admin/inventory?variant=${encodeURIComponent(
                                      item.id,
                                    )}&action=restock`,
                                  )
                                }
                                className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-[9px] font-black text-white"
                              >
                                Restock
                              </button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </section>
                );
              },
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value:
    | number
    | string;
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
    <div className="rounded-xl bg-slate-50 p-2.5">
      <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-black">
        {value}
      </p>
    </div>
  );
}

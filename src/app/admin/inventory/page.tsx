"use client";

import { useEffect, useMemo, useState } from "react";

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
  isSlowStock: boolean;
  slowStockDays: number;
  stockHealth:
    | "HEALTHY"
    | "LOW"
    | "CRITICAL"
    | "OUT_OF_STOCK";
  recommendedReorderQty: number;
  costPrice: number | null;
  retailPrice: number | null;
  resellerPrice: number | null;
  isActive: boolean;
  updatedAt: string;
};

type InventoryResponse = {
  variants: InventoryVariant[];
  summary: {
    totalVariants: number;
    totalStock: number;
    totalReserved: number;
    totalAvailable: number;
    lowStock: number;
    criticalStock: number;
    outOfStock: number;
    slowStock: number;
  };
  settings: {
    lowStockThreshold: number;
    criticalStockThreshold: number;
  };
};

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "IN_STOCK", label: "In Stock" },
  {
    value: "CRITICAL_STOCK",
    label: "Critical",
  },
  { value: "LOW_STOCK", label: "Low Stock" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
  { value: "SLOW_STOCK", label: "Slow Stock" },
];

function money(value: number | null) {
  if (value === null) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}

function stockLabel(item: InventoryVariant) {
  if (
    item.stockHealth ===
    "OUT_OF_STOCK"
  ) {
    return "OUT OF STOCK";
  }

  if (
    item.stockHealth ===
    "CRITICAL"
  ) {
    return "CRITICAL";
  }

  if (
    item.stockHealth ===
    "LOW"
  ) {
    return "LOW STOCK";
  }

  return "IN STOCK";
}

function stockClass(item: InventoryVariant) {
  if (
    item.stockHealth ===
    "OUT_OF_STOCK"
  ) {
    return "bg-red-100 text-red-800";
  }

  if (
    item.stockHealth ===
    "CRITICAL"
  ) {
    return "bg-rose-50 text-rose-700";
  }

  if (
    item.stockHealth ===
    "LOW"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

export default function InventoryPage() {
  const [data, setData] = useState<InventoryResponse>({
    variants: [],
    summary: {
      totalVariants: 0,
      totalStock: 0,
      totalReserved: 0,
      totalAvailable: 0,
      lowStock: 0,
      criticalStock: 0,
      outOfStock: 0,
      slowStock: 0,
    },
    settings: {
      lowStockThreshold: 5,
      criticalStockThreshold: 2,
    },
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] =
    useState<InventoryVariant | null>(null);

  const [adjustment, setAdjustment] = useState("1");
  const [reason, setReason] = useState("MANUAL_ADJUSTMENT");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [
    lowStockThreshold,
    setLowStockThreshold,
  ] = useState("5");

  const [
    criticalStockThreshold,
    setCriticalStockThreshold,
  ] = useState("2");

  const [
    savingAutomation,
    setSavingAutomation,
  ] = useState(false);

  const [
    restockIntentHandled,
    setRestockIntentHandled,
  ] = useState(false);

  async function loadInventory(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (filter !== "ALL") {
        params.set("filter", filter);
      }

      const response = await fetch(
        `/api/inventory?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to load inventory.",
        );
      }

      setData(result);

      if (result.settings) {
        setLowStockThreshold(
          String(
            result.settings
              .lowStockThreshold,
          ),
        );

        setCriticalStockThreshold(
          String(
            result.settings
              .criticalStockThreshold,
          ),
        );
      }
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load inventory.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInventory();
    }, 250);

    return () => clearTimeout(timer);
  }, [search, filter]);

  const visibleVariants = useMemo(
    () => data.variants,
    [data.variants],
  );

  useEffect(() => {
    if (
      restockIntentHandled ||
      loading ||
      typeof window ===
        "undefined"
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const variantId =
      params.get("variant");

    const action =
      params.get("action");

    if (
      action !== "restock" ||
      !variantId
    ) {
      setRestockIntentHandled(
        true,
      );
      return;
    }

    const target =
      data.variants.find(
        (item) =>
          item.id ===
          variantId,
      );

    if (target) {
      const suggested =
        Math.max(
          1,
          Number(
            target.recommendedReorderQty ||
              1,
          ),
        );

      setSelected(target);

      setAdjustment(
        String(suggested),
      );

      setReason(
        "NEW_STOCK",
      );

      setMessage(
        `Restock ready for ${target.product.name} · ${target.color.name} · ${target.size.name}. Suggested quantity: +${suggested} pcs.`,
      );
    } else {
      setMessage(
        "This inventory variant could not be loaded. Refresh and try again.",
      );
    }

    setRestockIntentHandled(
      true,
    );

    window.history.replaceState(
      {},
      "",
      "/admin/inventory",
    );
  }, [
    data.variants,
    loading,
    restockIntentHandled,
  ]);

  function openRestock(
    item: InventoryVariant,
  ) {
    setSelected(item);

    setAdjustment(
      String(
        Math.max(
          1,
          item.recommendedReorderQty ||
            1,
        ),
      ),
    );

    setReason(
      "NEW_STOCK",
    );

    setMessage("");
  }

  async function saveAutomationSettings() {
    const low =
      Number(
        lowStockThreshold,
      );

    const critical =
      Number(
        criticalStockThreshold,
      );

    if (
      !Number.isInteger(low) ||
      low < 1 ||
      low > 100
    ) {
      setMessage(
        "Low stock threshold must be between 1 and 100.",
      );
      return;
    }

    if (
      !Number.isInteger(
        critical,
      ) ||
      critical < 0 ||
      critical >= low
    ) {
      setMessage(
        "Critical threshold must be lower than the low stock threshold.",
      );
      return;
    }

    try {
      setSavingAutomation(
        true,
      );

      setMessage("");

      const response =
        await fetch(
          "/api/inventory",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              lowStockThreshold:
                low,
              criticalStockThreshold:
                critical,
            }),
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to save automation settings.",
        );
      }

      setMessage(
        "Stock automation thresholds saved successfully.",
      );

      await loadInventory(
        true,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save automation settings.",
      );
    } finally {
      setSavingAutomation(
        false,
      );
    }
  }

  async function adjustStock(amount: number) {
    if (!selected) return;

    const quantity = Math.abs(
      Number(adjustment) || 0,
    );

    if (!quantity || !Number.isInteger(quantity)) {
      setMessage("Enter a valid whole number.");
      return;
    }

    const finalAdjustment =
      amount > 0 ? quantity : -quantity;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/inventory",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            variantId: selected.id,
            adjustment: finalAdjustment,
            reason,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to update inventory.",
        );
      }

      setMessage(
        `Stock updated successfully: ${
          finalAdjustment > 0 ? "+" : ""
        }${finalAdjustment}`,
      );

      setSelected(null);
      await loadInventory(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update inventory.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              AS FASHIONS
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Inventory
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage variant-level stock and availability.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadInventory(true)}
            disabled={refreshing}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <SummaryCard
            label="Variants"
            value={data.summary.totalVariants}
          />

          <SummaryCard
            label="Total Stock"
            value={data.summary.totalStock}
          />

          <SummaryCard
            label="Reserved"
            value={data.summary.totalReserved}
          />

          <SummaryCard
            label="Available"
            value={data.summary.totalAvailable}
          />

          <SummaryCard
            label="Low Stock"
            value={data.summary.lowStock}
          />

          <SummaryCard
            label="Critical"
            value={
              data.summary
                .criticalStock
            }
          />

          <SummaryCard
            label="Out of Stock"
            value={data.summary.outOfStock}
          />

          <SummaryCard
            label="Slow Stock"
            value={data.summary.slowStock}
          />
        </div>

        <div className="mt-6 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                Stock Automation
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                Low Stock Alert Rules
              </h2>

              <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-slate-500">
                AS Fashions automatically marks variants as Critical or Low Stock and calculates a suggested restock quantity from live stock and recent 30-day sales.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Low At
                </span>

                <input
                  type="number"
                  min="1"
                  max="100"
                  value={
                    lowStockThreshold
                  }
                  onChange={(event) =>
                    setLowStockThreshold(
                      event.target.value,
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-black outline-none focus:border-emerald-400 sm:w-24"
                />
              </label>

              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Critical At
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    criticalStockThreshold
                  }
                  onChange={(event) =>
                    setCriticalStockThreshold(
                      event.target.value,
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-black outline-none focus:border-emerald-400 sm:w-24"
                />
              </label>

              <button
                type="button"
                onClick={
                  saveAutomationSettings
                }
                disabled={
                  savingAutomation
                }
                className="col-span-2 mt-auto rounded-xl bg-[#06261c] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50"
              >
                {savingAutomation
                  ? "Saving..."
                  : "Save Rules"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search product, SKU, color or size..."
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            />

            <div className="flex gap-2 overflow-x-auto">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setFilter(item.value)
                  }
                  className={`whitespace-nowrap rounded-2xl px-4 py-3 text-xs font-black ${
                    filter === item.value
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm font-bold text-slate-500">
              Loading inventory...
            </div>
          ) : visibleVariants.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-black text-slate-900">
                No inventory found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try another search or filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Product
                    </th>

                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Variant
                    </th>

                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Stock
                    </th>

                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Reserved
                    </th>

                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Available
                    </th>

                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Restock
                    </th>

                    <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleVariants.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-5">
                        <p className="font-black text-slate-900">
                          {item.product.name}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {item.product.sku || "No product SKU"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2">
                          {item.color.hexCode && (
                            <span
                              className="h-7 w-7 rounded-full border border-slate-200"
                              style={{
                                backgroundColor:
                                  item.color.hexCode,
                              }}
                            />
                          )}

                          <div>
                            <p className="text-sm font-black text-slate-800">
                              {item.color.name}
                            </p>

                            <p className="text-xs font-semibold text-slate-400">
                              {item.size.name}
                              {item.size.inches
                                ? ` · Height ${item.size.inches}`
                                : ""}
                              {item.sku
                                ? ` • ${item.sku}`
                                : ""}
                            </p>

                            <p className="mt-1 text-[10px] font-semibold text-slate-400">
                              30d sales: {item.recentSalesQty}
                              {item.isSlowStock
                                ? " • Slow moving"
                                : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <span className="text-xl font-black text-slate-950">
                          {item.stock}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <span className="font-bold text-slate-600">
                          {item.reservedStock}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <span className="text-lg font-black text-slate-950">
                          {item.availableStock}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${stockClass(
                            item,
                          )}`}
                        >
                          {stockLabel(item)}
                        </span>

                        {item.isSlowStock ? (
                          <span className="ml-2 rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase text-violet-700">
                            SLOW
                          </span>
                        ) : null}
                      </td>

                      <td className="px-5 py-5">
                        {item.recommendedReorderQty >
                        0 ? (
                          <div>
                            <p className="text-sm font-black text-slate-950">
                              +{
                                item.recommendedReorderQty
                              } pcs
                            </p>

                            <p className="mt-1 text-[9px] font-semibold text-slate-400">
                              Suggested
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600">
                            Healthy
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              item.recommendedReorderQty >
                              0
                            ) {
                              openRestock(
                                item,
                              );
                            } else {
                              setSelected(
                                item,
                              );

                              setAdjustment(
                                "1",
                              );

                              setReason(
                                "MANUAL_ADJUSTMENT",
                              );
                            }
                          }}
                          className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                        >
                          {item.recommendedReorderQty >
                          0
                            ? "Restock"
                            : "Adjust Stock"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                    Inventory Adjustment
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {selected.product.name}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {selected.color.name} •{" "}
                    {selected.size.name}
                    {selected.size.inches
                      ? ` · Height ${selected.size.inches}`
                      : ""}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Last 30 days sold:{" "}
                    {selected.recentSalesQty}
                    {selected.isSlowStock
                      ? " • Slow stock"
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600"
                >
                  ×
                </button>
              </div>

              {reason ===
              "NEW_STOCK" &&
              selected.recommendedReorderQty >
                0 ? (
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-700">
                    Restock Recommendation
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-950">
                    Add +{
                      selected.recommendedReorderQty
                    } pcs
                  </p>

                  <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">
                    Suggested from current stock level and recent sales.
                  </p>
                </div>
              ) : null}

              <div className="mt-6 grid grid-cols-3 gap-3">
                <MiniStat
                  label="Stock"
                  value={selected.stock}
                />

                <MiniStat
                  label="Reserved"
                  value={selected.reservedStock}
                />

                <MiniStat
                  label="Available"
                  value={selected.availableStock}
                />
              </div>

              <label className="mt-6 block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Quantity
                </span>

                <input
                  value={adjustment}
                  onChange={(event) =>
                    setAdjustment(
                      event.target.value,
                    )
                  }
                  type="number"
                  min="1"
                  step="1"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black outline-none focus:border-emerald-400 focus:bg-white"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Reason
                </span>

                <select
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-emerald-400 focus:bg-white"
                >
                  <option value="MANUAL_ADJUSTMENT">
                    Manual Adjustment
                  </option>
                  <option value="NEW_STOCK">
                    New Stock
                  </option>
                  <option value="DAMAGED">
                    Damaged
                  </option>
                  <option value="CORRECTION">
                    Stock Correction
                  </option>
                  <option value="RETURN_RESTOCK">
                    Return Restock
                  </option>
                </select>
              </label>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => adjustStock(-1)}
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  − Remove Stock
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => adjustStock(1)}
                  className="rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  + Add Stock
                </button>
              </div>

              {saving && (
                <p className="mt-4 text-center text-xs font-bold text-slate-500">
                  Updating inventory...
                </p>
              )}
            </div>
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
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-950">
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

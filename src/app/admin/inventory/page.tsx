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
  };
  sku: string | null;
  stock: number;
  reservedStock: number;
  availableStock: number;
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
    outOfStock: number;
  };
};

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "IN_STOCK", label: "In Stock" },
  { value: "LOW_STOCK", label: "Low Stock" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
];

function money(value: number | null) {
  if (value === null) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}

function stockLabel(item: InventoryVariant) {
  if (item.availableStock <= 0) return "OUT OF STOCK";
  if (item.availableStock <= 5) return "LOW STOCK";
  return "IN STOCK";
}

function stockClass(item: InventoryVariant) {
  if (item.availableStock <= 0) {
    return "bg-red-50 text-red-700";
  }

  if (item.availableStock <= 5) {
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
      outOfStock: 0,
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
              AR FASHIONS
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

        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
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
            label="Out of Stock"
            value={data.summary.outOfStock}
          />
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
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
              <table className="w-full min-w-[900px]">
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
                              {item.sku
                                ? ` • ${item.sku}`
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
                      </td>

                      <td className="px-5 py-5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setSelected(item)
                          }
                          className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                        >
                          Adjust Stock
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

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  calculateProfitProtection,
  type ProfitHealth,
} from "@/lib/profit-protection";

type ProductVariant = {
  id: string;
  sku?: string | null;
  colorId: string;
  sizeId: string;
  costPrice?: number | string | null;
  retailPrice?: number | string | null;
  resellerPrice?: number | string | null;
  isActive: boolean;
  color?: { name?: string | null } | null;
  size?: { name?: string | null } | null;
};

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  status: string;
  salesMode: "RETAIL" | "BULK" | "BOTH";
  retailPrice: number | string;
  resellerPrice?: number | string | null;
  variants: ProductVariant[];
};

type Row = ReturnType<typeof calculateProfitProtection> & {
  productId: string;
  productName: string;
  productSku: string | null;
  variantId: string;
  variantSku: string | null;
  colorName: string;
  sizeName: string;
  salesMode: Product["salesMode"];
  isActive: boolean;
};

function money(value: number | null) {
  if (value === null) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function percent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function healthLabel(health: ProfitHealth) {
  switch (health) {
    case "LOSS":
      return "Loss";
    case "LOW_MARGIN":
      return "Low Margin";
    case "HEALTHY":
      return "Healthy";
    default:
      return "Cost Missing";
  }
}

function healthClass(health: ProfitHealth) {
  switch (health) {
    case "LOSS":
      return "border-red-400/30 bg-red-400/10 text-red-300";
    case "LOW_MARGIN":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    case "HEALTHY":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

export default function ProfitProtectionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<
    "ALL" | ProfitHealth
  >("ALL");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/products", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ?? "Failed to load products",
          );
        }

        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load profit protection data",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const rows = useMemo<Row[]>(() => {
    return products.flatMap((product) =>
      product.variants.map((variant) => ({
        ...calculateProfitProtection({
          costPrice: variant.costPrice,
          variantRetailPrice: variant.retailPrice,
          productRetailPrice: product.retailPrice,
          variantResellerPrice: variant.resellerPrice,
          productResellerPrice: product.resellerPrice,
        }),
        productId: product.id,
        productName: product.name,
        productSku: product.sku ?? null,
        variantId: variant.id,
        variantSku: variant.sku ?? null,
        colorName: variant.color?.name ?? variant.colorId,
        sizeName: variant.size?.name ?? variant.sizeId,
        salesMode: product.salesMode,
        isActive: variant.isActive,
      })),
    );
  }, [products]);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return rows.filter((row) => {
      const searchable = [
        row.productName,
        row.productSku,
        row.variantSku,
        row.colorName,
        row.sizeName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (needle && !searchable.includes(needle)) {
        return false;
      }

      if (filter === "ALL") {
        return true;
      }

      return (
        row.retailHealth === filter ||
        row.resellerHealth === filter
      );
    });
  }, [rows, query, filter]);

  const summary = useMemo(() => {
    let healthy = 0;
    let lowMargin = 0;
    let loss = 0;
    let noCost = 0;

    for (const row of rows) {
      const relevant =
        row.salesMode === "BULK"
          ? row.resellerHealth
          : row.retailHealth;

      if (relevant === "HEALTHY") healthy += 1;
      if (relevant === "LOW_MARGIN") lowMargin += 1;
      if (relevant === "LOSS") loss += 1;
      if (relevant === "NO_COST") noCost += 1;
    }

    return {
      total: rows.length,
      healthy,
      lowMargin,
      loss,
      noCost,
    };
  }, [rows]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/reports"
              className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
            >
              ← Back to Reports
            </Link>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-emerald-400">
              AR FASHIONS · PROFIT PROTECTION
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Pre-sale Margin Guard
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Current variant cost ni actual retail/reseller fallback pricing tho compare chesi loss and low-margin risk ni sale mundhe show chestundi. This screen is warning-only; product save ni block cheyyadu.
            </p>
          </div>

          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
          >
            Open Products
          </Link>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-semibold text-red-300">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Variants", summary.total, "text-white"],
            ["Healthy", summary.healthy, "text-emerald-300"],
            ["Low Margin", summary.lowMargin, "text-amber-300"],
            ["Loss", summary.loss, "text-red-300"],
            ["Cost Missing", summary.noCost, "text-slate-300"],
          ].map(([label, value, valueClass]) => (
            <div
              key={String(label)}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                {label}
              </p>
              <p className={`mt-2 text-3xl font-black ${valueClass}`}>
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product, SKU, color, size..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-emerald-400 lg:max-w-md"
            />

            <div className="flex flex-wrap gap-2">
              {[
                ["ALL", "All"],
                ["HEALTHY", "Healthy"],
                ["LOW_MARGIN", "Low Margin"],
                ["LOSS", "Loss"],
                ["NO_COST", "Cost Missing"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFilter(value as typeof filter)
                  }
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    filter === value
                      ? "border-emerald-400 bg-emerald-400 text-slate-950"
                      : "border-white/10 bg-slate-900 text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">
              Loading margin protection data...
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              No matching variants found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="bg-slate-900">
                  <tr className="text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-4">Product / Variant</th>
                    <th className="px-4 py-4">Cost</th>
                    <th className="px-4 py-4">Retail</th>
                    <th className="px-4 py-4">Retail Margin</th>
                    <th className="px-4 py-4">Reseller</th>
                    <th className="px-4 py-4">Reseller Margin</th>
                    <th className="px-4 py-4">Minimum Safe</th>
                    <th className="px-4 py-4">Suggested</th>
                    <th className="px-4 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {visibleRows.map((row) => (
                    <tr
                      key={row.variantId}
                      className={row.isActive ? "" : "opacity-50"}
                    >
                      <td className="px-4 py-4">
                        <p className="font-bold text-white">
                          {row.productName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.colorName} · {row.sizeName}
                          {row.variantSku
                            ? ` · ${row.variantSku}`
                            : ""}
                        </p>
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        {money(row.cost)}
                      </td>

                      <td className="px-4 py-4">
                        {money(row.retailPrice)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">
                            {percent(row.retailMargin)}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${healthClass(
                              row.retailHealth,
                            )}`}
                          >
                            {healthLabel(row.retailHealth)}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {row.salesMode === "RETAIL"
                          ? "—"
                          : money(row.resellerPrice)}
                      </td>

                      <td className="px-4 py-4">
                        {row.salesMode === "RETAIL" ? (
                          "—"
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold">
                              {percent(row.resellerMargin)}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${healthClass(
                                row.resellerHealth,
                              )}`}
                            >
                              {healthLabel(row.resellerHealth)}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 text-amber-200">
                        {money(row.minimumSafePrice)}
                      </td>

                      <td className="px-4 py-4 font-bold text-emerald-300">
                        {money(row.suggestedPrice)}
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/products/${row.productId}`}
                          className="inline-flex rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-400/20"
                        >
                          Edit Product
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/[0.05] p-5 text-sm leading-6 text-slate-300">
          <p className="font-bold text-amber-300">How this guard works</p>
          <p className="mt-2">
            Gross margin = (selling price − cost) ÷ selling price. Below 20% is flagged as Low Margin, negative margin is Loss, and suggested price targets 30% gross margin. Variant price uses the same fallback rule as checkout: variant price first, then product price.
          </p>
        </section>
      </div>
    </main>
  );
}

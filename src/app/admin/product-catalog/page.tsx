"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  gender: "WOMEN" | "MEN" | "KIDS" | "UNISEX";
  status: string;
  retailPrice: string | number;
  resellerPrice: string | number | null;
  updatedAt?: string;
  category: {
    id: string;
    name: string;
  };
  media?: {
    id: string;
    url: string;
    type: "IMAGE" | "VIDEO";
  }[];
  variants: {
    id: string;
    stock: number;
    color: {
      id: string;
      name: string;
    };
    size: {
      id: string;
      name: string;
    };
  }[];
  _count: {
    variants: number;
    media: number;
  };
};

type GenderFilter = "ALL" | "WOMEN" | "MEN" | "KIDS";

const genderOptions: {
  value: GenderFilter;
  label: string;
}[] = [
  { value: "ALL", label: "All" },
  { value: "WOMEN", label: "Women" },
  { value: "MEN", label: "Men" },
  { value: "KIDS", label: "Kids" },
];

function money(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return Number(value).toLocaleString("en-IN");
}

export default function ProductCatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] =
    useState<GenderFilter>("ALL");

  async function loadProducts() {
    setLoading(true);

    try {
      const sessionResponse = await fetch("/api/admin/session", {
        cache: "no-store",
        credentials: "include",
      });

      if (sessionResponse.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const response = await fetch("/api/products", {
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json();

      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load product catalog:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...products]
      .filter((product) => {
        if (
          genderFilter !== "ALL" &&
          product.gender !== genderFilter
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        const variantText = product.variants
          .map(
            (variant) =>
              `${variant.color.name} ${variant.size.name}`,
          )
          .join(" ");

        const searchable = [
          product.name,
          product.sku ?? "",
          product.category.name,
          product.status,
          product.gender,
          variantText,
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => {
        const aTime = a.updatedAt
          ? new Date(a.updatedAt).getTime()
          : 0;
        const bTime = b.updatedAt
          ? new Date(b.updatedAt).getTime()
          : 0;

        return bTime - aTime;
      });
  }, [products, search, genderFilter]);

  const genderCounts = useMemo(
    () => ({
      ALL: products.length,
      WOMEN: products.filter((p) => p.gender === "WOMEN").length,
      MEN: products.filter((p) => p.gender === "MEN").length,
      KIDS: products.filter((p) => p.gender === "KIDS").length,
    }),
    [products],
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
              AS FASHIONS
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Product Catalog
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Search, filter and edit every product from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/admin/products"
              className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-slate-950"
            >
              + Add Product
            </a>

            <button
              type="button"
              onClick={() => void loadProducts()}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-slate-300 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </header>

        <section className="sticky top-0 z-20 mb-5 rounded-3xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              ⌕
            </span>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product name, SKU, category, colour or size..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950 py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {genderOptions.map((option) => {
              const selected = genderFilter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGenderFilter(option.value)}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition sm:text-sm ${
                    selected
                      ? "border-emerald-400 bg-emerald-400 text-slate-950"
                      : "border-white/10 bg-slate-950 text-slate-400"
                  }`}
                >
                  {option.label}
                  <span
                    className={`ml-1 text-[10px] ${
                      selected
                        ? "text-slate-800/70"
                        : "text-slate-600"
                    }`}
                  >
                    ({genderCounts[option.value]})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing{" "}
              <strong className="text-white">
                {filteredProducts.length}
              </strong>{" "}
              products
            </span>

            {(search || genderFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setGenderFilter("ALL");
                }}
                className="font-bold text-emerald-400"
              >
                Clear filters
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-slate-500">
            Loading product catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center">
            <p className="font-bold">No matching products</p>
            <p className="mt-2 text-sm text-slate-500">
              Try another product name, SKU or gender filter.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
            <div className="divide-y divide-white/10">
              {filteredProducts.map((product) => {
                const image = product.media?.find(
                  (item) => item.type === "IMAGE",
                );
                const totalStock = product.variants.reduce(
                  (sum, variant) => sum + Number(variant.stock || 0),
                  0,
                );

                return (
                  <div
                    key={product.id}
                    className="flex gap-3 p-4 sm:gap-5 sm:p-5"
                  >
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900 sm:h-24 sm:w-20">
                      {image ? (
                        <img
                          src={image.url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-xl text-slate-700">
                          ◇
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-bold">
                          {product.name}
                        </h2>

                        <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase text-emerald-400">
                          {product.status}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-slate-500">
                        <span className="font-semibold text-emerald-400">
                          {product.category.name}
                        </span>
                        <span>•</span>
                        <span>{product.gender}</span>
                      </div>

                      <p className="mt-1 truncate text-[11px] text-slate-600">
                        {product.sku ?? "No SKU"} ·{" "}
                        {product._count.variants} variants ·{" "}
                        {product._count.media} media ·{" "}
                        {totalStock} stock
                      </p>

                      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="font-black">
                            ₹{money(product.retailPrice)}
                          </p>

                          {product.resellerPrice !== null && (
                            <p className="text-xs font-semibold text-emerald-400">
                              Reseller ₹{money(product.resellerPrice)}
                            </p>
                          )}
                        </div>

                        <a
                          href={`/admin/products/${product.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-400 transition hover:bg-emerald-400 hover:text-slate-950"
                        >
                          ✏ Edit
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

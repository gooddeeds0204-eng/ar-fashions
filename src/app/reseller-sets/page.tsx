"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type SetItem = {
  productId: string;

  quantity: number;

  unitPrice: number;

  product: {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    status: string;
    salesMode: string;
    retailPrice: number;
    resellerPrice:
      | number
      | null;
    image: string | null;
  };
};

type ResellerSet = {
  id: string;

  name: string;

  slug: string;

  description:
    | string
    | null;

  type:
    | "FIXED"
    | "MIXED"
    | "ASSORTED";

  pieces: number;

  setPrice: number;

  perPiecePrice: number;

  moq: number;

  thumbnailUrl:
    | string
    | null;

  videoUrl:
    | string
    | null;

  isFeatured: boolean;

  sortOrder: number;

  items: SetItem[];
};

function money(
  value: number,
) {
  return `₹${Number(
    value || 0,
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

export default function ResellerSetsPage() {
  const router = useRouter();

  const [
    sets,
    setSets,
  ] =
    useState<
      ResellerSet[]
    >([]);

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

  const [
    search,
    setSearch,
  ] =
    useState("");

  useEffect(() => {
    async function loadSets() {
      try {
        const response =
          await fetch(
            "/api/reseller-sets",
            {
              cache:
                "no-store",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Failed to load reseller sets.",
          );
        }

        setSets(
          Array.isArray(
            data.sets,
          )
            ? data.sets
            : [],
        );
      } catch (error) {
        setError(
          error instanceof
          Error
            ? error.message
            : "Failed to load reseller sets.",
        );
      } finally {
        setLoading(
          false,
        );
      }
    }

    loadSets();
  }, []);

  const filteredSets =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return sets;
      }

      return sets.filter(
        (set) =>
          set.name
            .toLowerCase()
            .includes(
              query,
            ) ||
          set.description
            ?.toLowerCase()
            .includes(
              query,
            ) ||
          set.items.some(
            (item) =>
              item.product.name
                .toLowerCase()
                .includes(
                  query,
                ),
          ),
      );
    }, [
      sets,
      search,
    ]);

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/?mode=reseller",
              )
            }
            className="text-xl font-black tracking-[-0.05em]"
          >
            AR
            <span className="text-emerald-600">
              FASHIONS
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/cart",
              )
            }
            className="ml-auto rounded-full border border-black/10 px-4 py-2 text-xs font-black"
          >
            Cart
          </button>
        </div>
      </header>

      <section className="bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-400">
            AR Fashions Wholesale
          </p>

          <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
            Reseller Sets
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
            Curated fashion sets
            with reseller pricing,
            ready product mixes and
            clear MOQ.
          </p>

          <div className="mt-7 grid max-w-lg grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-[9px] font-bold uppercase text-zinc-500">
                Active Sets
              </p>

              <p className="mt-1 text-xl font-black">
                {
                  sets.length
                }
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-[9px] font-bold uppercase text-zinc-500">
                Featured
              </p>

              <p className="mt-1 text-xl font-black">
                {
                  sets.filter(
                    (set) =>
                      set.isFeatured,
                  ).length
                }
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-[9px] font-bold uppercase text-zinc-500">
                Mode
              </p>

              <p className="mt-1 text-sm font-black text-emerald-400">
                RESELLER
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <input
          value={search}
          onChange={(
            event,
          ) =>
            setSearch(
              event.target
                .value,
            )
          }
          placeholder="Search reseller sets or products..."
          className="mb-7 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm outline-none focus:border-emerald-500"
        />

        {loading ? (
          <div className="rounded-3xl bg-white p-10 text-center text-sm font-semibold text-zinc-500">
            Loading reseller
            sets...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600">
            {error}
          </div>
        ) : filteredSets.length ===
          0 ? (
          <div className="rounded-3xl bg-white p-10 text-center">
            <h2 className="font-black">
              No reseller sets
              found
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Try another search
              or check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredSets.map(
              (set) => {
                const image =
                  set.thumbnailUrl ??
                  set.items[0]
                    ?.product
                    .image ??
                  null;

                const normalValue =
                  set.items.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.unitPrice *
                        item.quantity,
                    0,
                  );

                const saving =
                  Math.max(
                    0,
                    normalValue -
                      set.setPrice,
                  );

                return (
                  <article
                    key={
                      set.id
                    }
                    className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
                      {image ? (
                        <img
                          src={
                            image
                          }
                          alt={
                            set.name
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl">
                          ◆
                        </div>
                      )}

                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-black/85 px-3 py-1.5 text-[9px] font-black text-white">
                          {
                            set.type
                          }
                        </span>

                        {set.isFeatured ? (
                          <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-[9px] font-black text-white">
                            FEATURED
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                        {
                          set.pieces
                        }{" "}
                        Piece Set
                      </p>

                      <h2 className="mt-2 text-xl font-black">
                        {
                          set.name
                        }
                      </h2>

                      {set.description ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                          {
                            set.description
                          }
                        </p>
                      ) : null}

                      <div className="mt-5 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-2xl font-black">
                            {money(
                              set.setPrice,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {money(
                              set.perPiecePrice,
                            )}{" "}
                            per piece
                          </p>
                        </div>

                        {saving >
                        0 ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700">
                            Save{" "}
                            {money(
                              saving,
                            )}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5 rounded-2xl bg-zinc-50 p-4">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-zinc-500">
                            MOQ
                          </span>

                          <span className="font-black">
                            {
                              set.moq
                            }{" "}
                            set
                            {set.moq ===
                            1
                              ? ""
                              : "s"}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2">
                          {set.items.map(
                            (
                              item,
                            ) => (
                              <div
                                key={
                                  item.productId
                                }
                                className="flex items-center justify-between gap-3 text-xs"
                              >
                                <span className="truncate text-zinc-600">
                                  {
                                    item
                                      .product
                                      .name
                                  }
                                </span>

                                <span className="shrink-0 font-black">
                                  ×{" "}
                                  {
                                    item.quantity
                                  }
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/reseller-sets/${set.slug}`,
                          )
                        }
                        className="mt-5 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white transition hover:bg-emerald-600"
                      >
                        Build This Set
                      </button>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </div>
    </main>
  );
}

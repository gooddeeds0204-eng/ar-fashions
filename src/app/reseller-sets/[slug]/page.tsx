"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

type Variant = {
  id: string;
  stock: number;

  retailPrice:
    | number
    | null;

  resellerPrice:
    | number
    | null;

  color: {
    id: string;
    name: string;
  };

  size: {
    id: string;
    name: string;
    inches: string | null;
  };
};

type SetItem = {
  productId: string;

  quantity: number;

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

    variants: Variant[];
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

  items: SetItem[];
};

type CartItem = {
  id: string;
  productId: string;
  productName: string;

  image:
    | string
    | null;

  variantId: string;
  colorId: string;
  colorName: string;
  sizeId: string;
  sizeName: string;

  price: number;
  quantity: number;

  mode: "RESELLER";

  resellerMOQ: number;

  resellerSetId: string;
  resellerSetSlug: string;
  resellerSetCount: number;
  resellerSetName: string;
  resellerSetPrice: number;
};

function sizeLabel(
  name: string,
  inches?: string | null,
) {
  return inches
    ? `${name} · Height ${inches}`
    : name;
}

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

export default function ResellerSetDetailPage() {
  const router = useRouter();

  const params =
    useParams<{
      slug: string;
    }>();

  const [
    set,
    setSet,
  ] =
    useState<
      ResellerSet | null
    >(null);

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
    setCount,
    setSetCount,
  ] =
    useState(1);

  const [
    quantities,
    setQuantities,
  ] = useState<
    Record<
      string,
      number
    >
  >({});

  useEffect(() => {
    async function loadSet() {
      try {
        const response =
          await fetch(
            `/api/reseller-sets/${encodeURIComponent(
              params.slug,
            )}`,
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
              "Failed to load reseller set.",
          );
        }

        setSet(
          data.set,
        );

        setSetCount(
          Math.max(
            1,
            Number(
              data.set
                .moq ??
                1,
            ),
          ),
        );
      } catch (error) {
        setError(
          error instanceof
          Error
            ? error.message
            : "Failed to load reseller set.",
        );
      } finally {
        setLoading(
          false,
        );
      }
    }

    loadSet();
  }, [params.slug]);

  const selectedByProduct =
    useMemo(() => {
      const totals =
        new Map<
          string,
          number
        >();

      if (!set) {
        return totals;
      }

      for (
        const item of
        set.items
      ) {
        let total = 0;

        for (
          const variant of
          item.product
            .variants
        ) {
          total +=
            quantities[
              variant.id
            ] ?? 0;
        }

        totals.set(
          item.productId,
          total,
        );
      }

      return totals;
    }, [
      set,
      quantities,
    ]);

  const complete =
    useMemo(() => {
      if (!set) {
        return false;
      }

      return set.items.every(
        (item) => {
          const required =
            item.quantity *
            setCount;

          const selected =
            selectedByProduct.get(
              item.productId,
            ) ?? 0;

          return (
            selected ===
            required
          );
        },
      );
    }, [
      set,
      setCount,
      selectedByProduct,
    ]);

  const totalSelected =
    Object.values(
      quantities,
    ).reduce(
      (
        total,
        quantity,
      ) =>
        total +
        quantity,
      0,
    );

  function changeSetCount(
    change: number,
  ) {
    if (!set) {
      return;
    }

    const minimum =
      Math.max(
        1,
        set.moq,
      );

    const next =
      Math.max(
        minimum,
        setCount +
          change,
      );

    if (
      next === setCount
    ) {
      return;
    }

    setSetCount(next);

    /*
     * Variant allocation must be
     * reselected whenever set count
     * changes.
     */
    setQuantities({});
  }

  function changeVariantQuantity(
    item: SetItem,
    variant: Variant,
    change: number,
  ) {
    const required =
      item.quantity *
      setCount;

    const selected =
      selectedByProduct.get(
        item.productId,
      ) ?? 0;

    const current =
      quantities[
        variant.id
      ] ?? 0;

    if (
      change > 0 &&
      selected >= required
    ) {
      return;
    }

    const next =
      Math.max(
        0,
        Math.min(
          variant.stock,
          current +
            change,
        ),
      );

    setQuantities(
      (existing) => {
        const updated = {
          ...existing,
        };

        if (next === 0) {
          delete updated[
            variant.id
          ];
        } else {
          updated[
            variant.id
          ] = next;
        }

        return updated;
      },
    );
  }

  function addSetToCart() {
    if (!set) {
      return;
    }

    if (!complete) {
      alert(
        "Complete the required size and color quantities first.",
      );

      return;
    }

    const cartItems:
      CartItem[] = [];

    for (
      const item of
      set.items
    ) {
      for (
        const variant of
        item.product
          .variants
      ) {
        const quantity =
          quantities[
            variant.id
          ] ?? 0;

        if (
          quantity <= 0
        ) {
          continue;
        }

        if (
          quantity >
          variant.stock
        ) {
          alert(
            `Only ${variant.stock} pieces available for ${item.product.name} (${variant.color.name} / ${sizeLabel(
              variant.size.name,
              variant.size.inches,
            )}).`,
          );

          return;
        }

        const price =
          variant.resellerPrice ??
          item.product
            .resellerPrice ??
          item.product
            .retailPrice;

        cartItems.push({
          id:
            `${item.product.id}-${variant.id}-RESELLER-SET-${set.id}`,

          productId:
            item.product.id,

          productName:
            item.product.name,

          image:
            item.product.image,

          variantId:
            variant.id,

          colorId:
            variant.color.id,

          colorName:
            variant.color.name,

          sizeId:
            variant.size.id,

          sizeName:
            sizeLabel(
              variant.size.name,
              variant.size.inches,
            ),

          price,

          quantity,

          mode:
            "RESELLER",

          /*
           * Curated sets use
           * set-level MOQ on
           * the server.
           */
          resellerMOQ: 1,

          resellerSetId:
            set.id,

          resellerSetSlug:
            set.slug,

          resellerSetCount:
            setCount,

          resellerSetName:
            set.name,

          resellerSetPrice:
            set.setPrice,
        });
      }
    }

    let existing:
      unknown[] = [];

    try {
      const raw =
        localStorage.getItem(
          "ar-fashions-cart",
        );

      if (raw) {
        const parsed =
          JSON.parse(raw);

        if (
          Array.isArray(
            parsed,
          )
        ) {
          existing =
            parsed;
        }
      }
    } catch {
      existing = [];
    }

    if (
      existing.length > 0
    ) {
      const replace =
        window.confirm(
          "Your current cart will be replaced with this curated reseller set. Continue?",
        );

      if (!replace) {
        return;
      }
    }

    localStorage.setItem(
      "ar-fashions-cart",
      JSON.stringify(
        cartItems,
      ),
    );

    router.push(
      "/cart",
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm font-bold text-zinc-500">
          Loading reseller
          set...
        </p>
      </main>
    );
  }

  if (
    error ||
    !set
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5">
        <div className="text-center">
          <h1 className="text-xl font-black">
            Reseller set
            unavailable
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/reseller-sets",
              )
            }
            className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-black text-white"
          >
            Back to Sets
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/reseller-sets",
              )
            }
            className="rounded-full px-3 py-2 text-sm font-black"
          >
            ←
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/?mode=reseller",
              )
            }
            className="ml-2 text-lg font-black tracking-[-0.05em]"
          >
            AR
            <span className="text-emerald-600">
              FASHIONS
            </span>
          </button>

          <span className="ml-auto rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700">
            RESELLER SET
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:py-10">
        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="overflow-hidden rounded-3xl bg-white">
            {set.thumbnailUrl ??
            set.items[0]
              ?.product
              .image ? (
              <img
                src={
                  set.thumbnailUrl ??
                  set.items[0]
                    ?.product
                    .image ??
                  ""
                }
                alt={
                  set.name
                }
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-zinc-100 text-4xl">
                ◆
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-black text-white">
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

            <h1 className="mt-4 text-3xl font-black tracking-tight">
              {set.name}
            </h1>

            {set.description ? (
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">
                {
                  set.description
                }
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-end gap-5">
              <div>
                <p className="text-3xl font-black">
                  {money(
                    set.setPrice *
                      setCount,
                  )}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {money(
                    set.perPiecePrice,
                  )}{" "}
                  per piece
                </p>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-[9px] font-bold uppercase text-zinc-400">
                  Total Pieces
                </p>

                <p className="mt-1 font-black">
                  {set.pieces *
                    setCount}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-zinc-950 p-4 text-white">
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-400">
                  Number of Sets
                </p>

                <p className="mt-1 text-xs text-zinc-400">
                  MOQ{" "}
                  {set.moq}
                </p>
              </div>

              <div className="flex items-center overflow-hidden rounded-xl bg-white text-black">
                <button
                  type="button"
                  disabled={
                    setCount <=
                    Math.max(
                      1,
                      set.moq,
                    )
                  }
                  onClick={() =>
                    changeSetCount(
                      -1,
                    )
                  }
                  className="px-4 py-3 font-black disabled:text-zinc-300"
                >
                  −
                </button>

                <span className="min-w-10 text-center font-black">
                  {setCount}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    changeSetCount(
                      1,
                    )
                  }
                  className="px-4 py-3 font-black"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              Set Builder
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Choose Colors &
              Sizes
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Allocate the exact
              required quantity for
              every product.
            </p>
          </div>

          <div className="space-y-6">
            {set.items.map(
              (item) => {
                const required =
                  item.quantity *
                  setCount;

                const selected =
                  selectedByProduct.get(
                    item.productId,
                  ) ?? 0;

                return (
                  <article
                    key={
                      item.productId
                    }
                    className="rounded-3xl border border-black/5 bg-white p-4 sm:p-6"
                  >
                    <div className="flex gap-4">
                      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                        {item.product
                          .image ? (
                          <img
                            src={
                              item
                                .product
                                .image
                            }
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-black">
                          {
                            item
                              .product
                              .name
                          }
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {
                            item
                              .product
                              .sku ??
                            "No SKU"
                          }
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black ${
                              selected ===
                              required
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {selected} /{" "}
                            {required}{" "}
                            selected
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {item.product
                        .variants.map(
                          (
                            variant,
                          ) => {
                            const quantity =
                              quantities[
                                variant.id
                              ] ?? 0;

                            const productSelected =
                              selectedByProduct.get(
                                item.productId,
                              ) ??
                              0;

                            return (
                              <div
                                key={
                                  variant.id
                                }
                                className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${
                                  quantity >
                                  0
                                    ? "border-emerald-200 bg-emerald-50/40"
                                    : "border-black/5 bg-zinc-50"
                                }`}
                              >
                                <div>
                                  <p className="text-sm font-black">
                                    {
                                      variant
                                        .color
                                        .name
                                    }{" "}
                                    · Size{" "}
                                    {
                                      variant
                                        .size
                                        .name
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    Stock{" "}
                                    {
                                      variant.stock
                                    }
                                  </p>
                                </div>

                                <div className="flex items-center overflow-hidden rounded-xl border bg-white">
                                  <button
                                    type="button"
                                    disabled={
                                      quantity <=
                                      0
                                    }
                                    onClick={() =>
                                      changeVariantQuantity(
                                        item,
                                        variant,
                                        -1,
                                      )
                                    }
                                    className="px-3 py-2 font-black disabled:text-zinc-300"
                                  >
                                    −
                                  </button>

                                  <span className="min-w-9 text-center text-sm font-black">
                                    {
                                      quantity
                                    }
                                  </span>

                                  <button
                                    type="button"
                                    disabled={
                                      variant.stock <=
                                        quantity ||
                                      productSelected >=
                                        required
                                    }
                                    onClick={() =>
                                      changeVariantQuantity(
                                        item,
                                        variant,
                                        1,
                                      )
                                    }
                                    className="px-3 py-2 font-black disabled:text-zinc-300"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          },
                        )}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        </section>

        <section className="sticky bottom-3 mt-8 rounded-3xl bg-zinc-950 p-4 text-white shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase text-zinc-400">
                Selected
              </p>

              <p className="mt-1 font-black">
                {totalSelected} /{" "}
                {set.pieces *
                  setCount}{" "}
                pieces
              </p>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-bold uppercase text-zinc-400">
                Set Total
              </p>

              <p className="mt-1 text-lg font-black">
                {money(
                  set.setPrice *
                    setCount,
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={
              !complete
            }
            onClick={
              addSetToCart
            }
            className="mt-4 w-full rounded-2xl bg-emerald-500 py-4 text-sm font-black text-white disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {complete
              ? "Add Reseller Set to Cart"
              : "Complete Set Selection"}
          </button>
        </section>
      </div>
    </main>
  );
}

"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

type CartItem = {
  id: string;
  productId: string;
  productName: string;
  image: string | null;
  variantId: string;
  colorId: string;
  colorName: string;
  sizeId: string;
  sizeName: string;
  price: number;
  quantity: number;
  mode?: "RETAIL" | "RESELLER";
  resellerMOQ?: number;

  smartStockBalance?: boolean;
  smartPackSize?: number;

  resellerSetId?: string;
  resellerSetSlug?: string;
  resellerSetCount?: number;
  resellerSetName?: string;
  resellerSetPrice?: number;
};

type ToastState = {
  type: "SUCCESS" | "ERROR";
  title: string;
  message: string;
} | null;

function money(
  value: number,
) {
  return `₹${Number(
    value || 0,
  ).toLocaleString("en-IN")}`;
}

function isSmartPackItem(
  item: CartItem,
) {
  return (
    item.mode === "RESELLER" &&
    item.smartStockBalance === true &&
    !item.resellerSetId
  );
}

export default function CartPage() {
  const router = useRouter();

  const [
    cart,
    setCart,
  ] = useState<CartItem[]>(
    [],
  );

  const [
    loaded,
    setLoaded,
  ] = useState(false);

  const [
    toast,
    setToast,
  ] =
    useState<ToastState>(
      null,
    );

  const [
    clearConfirm,
    setClearConfirm,
  ] = useState(false);

  function notify(
    type: "SUCCESS" | "ERROR",
    title: string,
    message: string,
  ) {
    setToast({
      type,
      title,
      message,
    });

    window.setTimeout(
      () => {
        setToast(null);
      },
      2800,
    );
  }

  useEffect(() => {
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
          setCart(parsed);
        }
      }
    } catch (error) {
      console.error(
        "Cart load failed:",
        error,
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  function saveCart(
    nextCart: CartItem[],
  ) {
    setCart(nextCart);

    localStorage.setItem(
      "ar-fashions-cart",
      JSON.stringify(
        nextCart,
      ),
    );
  }

  function increase(
    itemId: string,
  ) {
    const current =
      cart.find(
        (item) =>
          item.id === itemId,
      );

    if (
      current &&
      isSmartPackItem(
        current,
      )
    ) {
      notify(
        "ERROR",
        "Smart Pack Locked",
        "Change the number of Smart Packs from the product page.",
      );
      return;
    }

    const nextCart =
      cart.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity:
                item.quantity +
                1,
            }
          : item,
      );

    saveCart(
      nextCart,
    );
  }

  function decrease(
    itemId: string,
  ) {
    const current =
      cart.find(
        (item) =>
          item.id ===
          itemId,
      );

    if (
      current &&
      isSmartPackItem(
        current,
      )
    ) {
      notify(
        "ERROR",
        "Smart Pack Locked",
        "Smart Stock quantities cannot be changed individually.",
      );
      return;
    }

    const nextCart =
      cart
        .map((item) =>
          item.id ===
          itemId
            ? {
                ...item,
                quantity:
                  item.quantity -
                  1,
              }
            : item,
        )
        .filter(
          (item) =>
            item.quantity >
            0,
        );

    saveCart(
      nextCart,
    );

    if (
      current?.quantity ===
      1
    ) {
      notify(
        "SUCCESS",
        "Removed from Bag",
        `${current.productName} was removed.`,
      );
    }
  }

  function removeItem(
    itemId: string,
  ) {
    const current =
      cart.find(
        (item) =>
          item.id ===
          itemId,
      );

    if (
      current &&
      isSmartPackItem(
        current,
      )
    ) {
      notify(
        "ERROR",
        "Smart Pack Locked",
        "Remove the complete Smart Pack instead of one colour or size.",
      );
      return;
    }

    const nextCart =
      cart.filter(
        (item) =>
          item.id !==
          itemId,
      );

    saveCart(
      nextCart,
    );

    notify(
      "SUCCESS",
      "Removed from Bag",
      current
        ? `${current.productName} was removed.`
        : "Item removed from your bag.",
    );
  }

  function removeSmartPack(
    productId: string,
  ) {
    const packItems =
      cart.filter(
        (item) =>
          item.productId ===
            productId &&
          isSmartPackItem(
            item,
          ),
      );

    if (
      packItems.length === 0
    ) {
      return;
    }

    const nextCart =
      cart.filter(
        (item) =>
          !(
            item.productId ===
              productId &&
            isSmartPackItem(
              item,
            )
          ),
      );

    saveCart(
      nextCart,
    );

    notify(
      "SUCCESS",
      "Smart Pack Removed",
      `${packItems[0].productName} Smart Pack was removed from your bag.`,
    );
  }

  function clearCart() {
    setCart([]);

    localStorage.removeItem(
      "ar-fashions-cart",
    );

    setClearConfirm(
      false,
    );

    notify(
      "SUCCESS",
      "Bag Cleared",
      "All items were removed from your shopping bag.",
    );
  }

  const totalItems =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.quantity,
          0,
        ),
      [cart],
    );

  const rawSubtotal =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.price *
              item.quantity,
          0,
        ),
      [cart],
    );

  const hasCuratedSetItems =
    cart.some(
      (item) =>
        Boolean(
          item.resellerSetId,
        ),
    );

  const curatedSet =
    useMemo(() => {
      if (
        cart.length === 0
      ) {
        return null;
      }

      const first =
        cart[0];

      if (
        first.mode !==
          "RESELLER" ||
        !first.resellerSetId
      ) {
        return null;
      }

      const setId =
        first.resellerSetId;

      const setCount =
        Number(
          first.resellerSetCount,
        );

      const setPrice =
        Number(
          first.resellerSetPrice,
        );

      if (
        !Number.isInteger(
          setCount,
        ) ||
        setCount <= 0 ||
        !Number.isFinite(
          setPrice,
        ) ||
        setPrice <= 0
      ) {
        return null;
      }

      const valid =
        cart.every(
          (item) =>
            item.mode ===
              "RESELLER" &&
            item.resellerSetId ===
              setId &&
            Number(
              item.resellerSetCount,
            ) ===
              setCount &&
            Number(
              item.resellerSetPrice,
            ) ===
              setPrice,
        );

      if (!valid) {
        return null;
      }

      return {
        id: setId,
        slug:
          first.resellerSetSlug ??
          "",
        name:
          first.resellerSetName ??
          "Reseller Set",
        count:
          setCount,
        price:
          setPrice,
      };
    }, [cart]);

  const invalidCuratedCart =
    hasCuratedSetItems &&
    !curatedSet;

  const subtotal =
    curatedSet
      ? curatedSet.price *
        curatedSet.count
      : rawSubtotal;

  const curatedSetSaving =
    curatedSet
      ? Math.max(
          0,
          rawSubtotal -
            subtotal,
        )
      : 0;

  const resellerGroups =
    useMemo(() => {
      const groups =
        new Map<
          string,
          {
            productId: string;
            productName: string;
            quantity: number;
            moq: number;
          }
        >();

      for (
        const item of cart
      ) {
        if (
          item.mode !==
          "RESELLER"
        ) {
          continue;
        }

        if (
          item.resellerSetId
        ) {
          continue;
        }

        const existing =
          groups.get(
            item.productId,
          );

        if (existing) {
          existing.quantity +=
            item.quantity;

          existing.moq =
            Math.max(
              existing.moq,
              item.resellerMOQ ??
                1,
            );
        } else {
          groups.set(
            item.productId,
            {
              productId:
                item.productId,
              productName:
                item.productName,
              quantity:
                item.quantity,
              moq: Math.max(
                1,
                item.resellerMOQ ??
                  1,
              ),
            },
          );
        }
      }

      return Array.from(
        groups.values(),
      );
    }, [cart]);

  const invalidResellerGroups =
    useMemo(
      () =>
        resellerGroups.filter(
          (group) =>
            group.quantity <
            group.moq,
        ),
      [resellerGroups],
    );

  const hasRetailItems =
    cart.some(
      (item) =>
        (
          item.mode ??
          "RETAIL"
        ) === "RETAIL",
    );

  const hasResellerItems =
    cart.some(
      (item) =>
        item.mode ===
        "RESELLER",
    );

  const isMixedCart =
    hasRetailItems &&
    hasResellerItems;

  const isResellerOrder =
    hasResellerItems &&
    !hasRetailItems;

  const canCheckout =
    !isMixedCart &&
    !invalidCuratedCart &&
    invalidResellerGroups.length ===
      0;

  /*
   * Cart shows a quick delivery estimate.
   * Checkout performs the final server
   * validated delivery calculation.
   */
  const delivery =
    subtotal >= 999 ||
    subtotal === 0
      ? 0
      : 79;

  const total =
    subtotal +
    delivery;

  const freeDeliveryLeft =
    subtotal > 0 &&
    subtotal < 999
      ? 999 - subtotal
      : 0;

  function openProduct(
    item: CartItem,
  ) {
    router.push(
      `/products/${item.productId}?mode=${
        item.mode ===
        "RESELLER"
          ? "reseller"
          : "retail"
      }`,
    );
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-28 pt-6 text-[#211C18]">
        <div className="mx-auto max-w-6xl">
          <div className="ar-skeleton h-10 w-36 rounded-full" />
          <div className="mt-6 ar-skeleton h-36 w-full rounded-[1.8rem]" />
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-3">
              {[0, 1].map((item) => (
                <div key={item} className="flex gap-3 rounded-[1.3rem] border border-[#E4D7C4] bg-[#FFFDF9] p-3">
                  <div className="ar-skeleton h-32 w-24 shrink-0 rounded-[1rem]" />
                  <div className="flex-1 py-2">
                    <div className="ar-skeleton h-3 w-3/4 rounded-full" />
                    <div className="mt-3 ar-skeleton h-3 w-1/2 rounded-full" />
                    <div className="mt-6 ar-skeleton h-9 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
            <div className="ar-skeleton h-64 rounded-[1.5rem]" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f5f1] pb-28 text-zinc-950 sm:pb-10">
      {/* AR TOAST */}
      {toast && (
        <div className="fixed left-1/2 top-[78px] z-[120] w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div
            className={`flex items-center gap-3 rounded-[1.35rem] border p-3.5 text-white shadow-[0_20px_55px_rgba(0,0,0,0.3)] backdrop-blur-xl ${
              toast.type ===
              "SUCCESS"
                ? "border-emerald-300/25 bg-[#063326]/95"
                : "border-red-300/25 bg-[#4a1111]/95"
            }`}
          >
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-black ${
                toast.type ===
                "SUCCESS"
                  ? "bg-emerald-400 text-[#032017]"
                  : "bg-red-400 text-white"
              }`}
            >
              {toast.type ===
              "SUCCESS"
                ? "✓"
                : "!"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                AR Fashions
              </p>

              <p className="mt-1 text-[13px] font-black">
                {
                  toast.title
                }
              </p>

              <p className="mt-0.5 text-[9px] font-semibold text-white/55">
                {
                  toast.message
                }
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setToast(null)
              }
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-[#fffefa]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/[0.06] bg-white text-sm font-black"
          >
            ←
          </button>

          <BrandLogo
            compact
            onClick={() =>
              router.push("/")
            }
          />

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="ml-auto rounded-full border border-black/[0.07] bg-white px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.08em] text-zinc-600"
          >
            Keep Shopping
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[1.9rem] bg-gradient-to-br from-[#03140e] via-[#06261c] to-black p-5 text-white shadow-[0_24px_65px_rgba(0,0,0,0.2)] sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative flex items-end justify-between gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-300">
                AR Shopping Bag
              </p>

              <h1 className="mt-3 font-serif text-[2.8rem] leading-[0.86] tracking-[-0.045em] sm:text-5xl">
                Your
                <br />
                Selection.
              </h1>

              <p className="mt-4 text-[10px] leading-5 text-white/45 sm:text-sm">
                Review your pieces, quantities and order value before checkout.
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-serif text-5xl text-emerald-300">
                {
                  totalItems
                }
              </p>

              <p className="mt-1 text-[7px] font-black uppercase tracking-[0.18em] text-white/35">
                {totalItems ===
                1
                  ? "Item"
                  : "Items"}
              </p>
            </div>
          </div>

          {cart.length >
            0 && (
            <div className="relative mt-6 grid grid-cols-3 gap-2">
              <div className="rounded-[1rem] border border-white/[0.08] bg-white/[0.05] p-3">
                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/35">
                  Mode
                </p>

                <p className="mt-2 text-[10px] font-black">
                  {isMixedCart
                    ? "Mixed"
                    : isResellerOrder
                      ? "Reseller"
                      : "Retail"}
                </p>
              </div>

              <div className="rounded-[1rem] border border-white/[0.08] bg-white/[0.05] p-3">
                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/35">
                  Subtotal
                </p>

                <p className="mt-2 text-[10px] font-black">
                  {money(
                    subtotal,
                  )}
                </p>
              </div>

              <div className="rounded-[1rem] border border-white/[0.08] bg-white/[0.05] p-3">
                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/35">
                  Checkout
                </p>

                <p
                  className={`mt-2 text-[10px] font-black ${
                    canCheckout
                      ? "text-emerald-300"
                      : "text-amber-300"
                  }`}
                >
                  {canCheckout
                    ? "Ready"
                    : "Action Needed"}
                </p>
              </div>
            </div>
          )}
        </section>

        {cart.length ===
        0 ? (
          <section className="mt-5 overflow-hidden rounded-[1.8rem] border border-black/[0.05] bg-white shadow-sm">
            <div className="px-6 py-14 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 font-serif text-xl text-emerald-700">
                AR
              </div>

              <p className="mt-5 text-[8px] font-black uppercase tracking-[0.25em] text-emerald-700">
                Your Bag
              </p>

              <h2 className="mt-2 font-serif text-[2rem] leading-none">
                Nothing selected yet.
              </h2>

              <p className="mx-auto mt-3 max-w-sm text-[11px] leading-5 text-zinc-500">
                Explore the latest AR Fashions collection and add the pieces you love.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/",
                  )
                }
                className="mt-6 rounded-full bg-[#06261c] px-6 py-3 text-[9px] font-black uppercase tracking-[0.08em] text-white"
              >
                Explore Collection →
              </button>
            </div>
          </section>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
            {/* BAG ITEMS */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700">
                    Selected Pieces
                  </p>

                  <h2 className="mt-1 text-[1.45rem] font-black tracking-[-0.03em]">
                    Shopping Bag
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setClearConfirm(
                      true,
                    )
                  }
                  className="rounded-full bg-red-50 px-3.5 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-red-600"
                >
                  Clear Bag
                </button>
              </div>

              <div className="space-y-3">
                {cart.map(
                  (item) => {
                    const lineTotal =
                      item.price *
                      item.quantity;

                    return (
                      <article
                        key={
                          item.id
                        }
                        className="overflow-hidden rounded-[1.45rem] border border-black/[0.05] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.035)]"
                      >
                        <div className="p-3.5 sm:p-4">
                          <div className="flex gap-3.5">
                            <button
                              type="button"
                              onClick={() =>
                                openProduct(
                                  item,
                                )
                              }
                              className="h-[132px] w-[98px] shrink-0 overflow-hidden rounded-[1.05rem] bg-[#eeede9] sm:h-36 sm:w-28"
                            >
                              {item.image ? (
                                <img
                                  src={
                                    item.image
                                  }
                                  alt={
                                    item.productName
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="grid h-full place-items-center font-serif text-lg text-zinc-300">
                                  AR
                                </div>
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap gap-1.5">
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.12em] ${
                                        item.mode ===
                                        "RESELLER"
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-zinc-100 text-zinc-500"
                                      }`}
                                    >
                                      {item.mode ===
                                      "RESELLER"
                                        ? "Reseller"
                                        : "Retail"}
                                    </span>

                                    {item.resellerSetId && (
                                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.12em] text-violet-700">
                                        Set Item
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openProduct(
                                        item,
                                      )
                                    }
                                    className="mt-2 line-clamp-2 text-left text-[13px] font-black leading-5 sm:text-sm"
                                  >
                                    {
                                      item.productName
                                    }
                                  </button>

                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span className="rounded-lg bg-[#f7f6f2] px-2.5 py-1.5 text-[8px] font-bold text-zinc-500">
                                      Color ·{" "}
                                      {
                                        item.colorName
                                      }
                                    </span>

                                    <span className="rounded-lg bg-[#f7f6f2] px-2.5 py-1.5 text-[8px] font-bold text-zinc-500">
                                      Size ·{" "}
                                      {
                                        item.sizeName
                                      }
                                    </span>

                                    {item.smartStockBalance ? (
                                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[8px] font-black text-emerald-700">
                                        SMART PACK · QTY FIXED
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                {!item.resellerSetId &&
                                  !item.smartStockBalance && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeItem(
                                        item.id,
                                      )
                                    }
                                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-sm font-black text-red-500"
                                    aria-label="Remove item"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>

                              <div className="mt-4 flex items-end justify-between gap-3">
                                <div>
                                  {item.resellerSetId ? (
                                    <>
                                      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-emerald-700">
                                        Included In Set
                                      </p>

                                      <p className="mt-1 text-[10px] font-bold text-zinc-500">
                                        Qty{" "}
                                        {
                                          item.quantity
                                        }
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                                        Unit Price
                                      </p>

                                      <p className="mt-1 text-[14px] font-black">
                                        {money(
                                          item.price,
                                        )}
                                      </p>
                                    </>
                                  )}
                                </div>

                                {item.resellerSetId ? (
                                  <div className="rounded-xl bg-[#f7f6f2] px-3 py-2 text-[9px] font-black">
                                    Qty{" "}
                                    {
                                      item.quantity
                                    }
                                  </div>
                                ) : item.smartStockBalance ? (
                                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-center">
                                    <p className="text-[8px] font-black uppercase tracking-wider text-emerald-600">
                                      Locked Qty
                                    </p>

                                    <p className="mt-0.5 text-sm font-black text-emerald-900">
                                      {
                                        item.quantity
                                      }
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex items-center overflow-hidden rounded-xl border border-black/[0.08] bg-[#faf9f6]">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        decrease(
                                          item.id,
                                        )
                                      }
                                      className="grid h-9 w-9 place-items-center text-sm font-black"
                                    >
                                      −
                                    </button>

                                    <span className="min-w-8 text-center text-[10px] font-black">
                                      {
                                        item.quantity
                                      }
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        increase(
                                          item.id,
                                        )
                                      }
                                      className="grid h-9 w-9 place-items-center text-sm font-black"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {!item.resellerSetId && (
                            <>
                              <div className="mt-3 flex items-center justify-between border-t border-black/[0.05] pt-3">
                                <span className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">
                                  Line Total
                                </span>

                                <span className="text-[15px] font-black">
                                  {money(
                                    lineTotal,
                                  )}
                                </span>
                              </div>

                              {item.smartStockBalance &&
                              cart.find(
                                (candidate) =>
                                  candidate.productId ===
                                    item.productId &&
                                  isSmartPackItem(
                                    candidate,
                                  ),
                              )?.id ===
                                item.id ? (
                                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-700">
                                        Smart Stock Pack
                                      </p>

                                      <p className="mt-1 text-[9px] font-semibold text-zinc-500">
                                        Quantities are fixed as one balanced assortment.
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeSmartPack(
                                          item.productId,
                                        )
                                      }
                                      className="shrink-0 rounded-xl border border-red-200 bg-white px-3 py-2 text-[9px] font-black text-red-600"
                                    >
                                      Remove Pack
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </section>

            {/* SUMMARY */}
            <aside className="overflow-hidden rounded-[1.6rem] border border-black/[0.05] bg-white shadow-[0_12px_35px_rgba(0,0,0,0.045)] lg:sticky lg:top-24">
              <div className="bg-[#06261c] p-5 text-white">
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Order Summary
                </p>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-[1.9rem] leading-none">
                      Bag Total
                    </h2>

                    <p className="mt-2 text-[9px] text-white/45">
                      {
                        totalItems
                      }{" "}
                      {totalItems ===
                      1
                        ? "item"
                        : "items"}
                    </p>
                  </div>

                  <p className="text-[1.65rem] font-black">
                    {money(
                      total,
                    )}
                  </p>
                </div>
              </div>

              <div className="p-5">
                {curatedSet && (
                  <div className="rounded-[1.15rem] border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.16em] text-emerald-700">
                          Curated Reseller Set
                        </p>

                        <p className="mt-1 text-[12px] font-black">
                          {
                            curatedSet.name
                          }
                        </p>

                        <p className="mt-1 text-[9px] text-zinc-500">
                          {
                            curatedSet.count
                          }{" "}
                          set
                          {curatedSet.count ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            curatedSet.slug
                              ? `/reseller-sets/${curatedSet.slug}`
                              : "/reseller-sets",
                          )
                        }
                        className="rounded-full bg-white px-3 py-2 text-[7px] font-black uppercase tracking-[0.08em] text-emerald-700"
                      >
                        Edit Set
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-5 space-y-3 text-[11px]">
                  {curatedSet &&
                    curatedSetSaving >
                      0 && (
                      <>
                        <div className="flex justify-between gap-4">
                          <span className="text-zinc-500">
                            Normal reseller value
                          </span>

                          <span className="font-black">
                            {money(
                              rawSubtotal,
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between gap-4 text-emerald-700">
                          <span>
                            Curated set saving
                          </span>

                          <span className="font-black">
                            -
                            {money(
                              curatedSetSaving,
                            )}
                          </span>
                        </div>
                      </>
                    )}

                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">
                      Subtotal
                    </span>

                    <span className="font-black">
                      {money(
                        subtotal,
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <div>
                      <span className="text-zinc-500">
                        Delivery estimate
                      </span>

                      <p className="mt-1 text-[7px] text-zinc-400">
                        Final charge confirmed at checkout
                      </p>
                    </div>

                    <span
                      className={`font-black ${
                        delivery ===
                        0
                          ? "text-emerald-700"
                          : ""
                      }`}
                    >
                      {delivery ===
                      0
                        ? "FREE"
                        : money(
                            delivery,
                          )}
                    </span>
                  </div>

                  <div className="border-t border-black/[0.07] pt-4">
                    <div className="flex items-end justify-between gap-3">
                      <span className="font-black">
                        Estimated Total
                      </span>

                      <span className="text-[1.35rem] font-black">
                        {money(
                          total,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {freeDeliveryLeft >
                  0 && (
                  <div className="mt-5 rounded-[1.1rem] bg-emerald-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[9px] font-black text-emerald-800">
                        Add{" "}
                        {money(
                          freeDeliveryLeft,
                        )}{" "}
                        more
                      </p>

                      <span className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-700">
                        Free Delivery
                      </span>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{
                          width: `${Math.min(
                            100,
                            (subtotal /
                              999) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {isMixedCart && (
                  <div className="mt-5 rounded-[1.1rem] border border-red-200 bg-red-50 p-4">
                    <p className="text-[10px] font-black text-red-800">
                      Retail + Reseller items cannot be checked out together.
                    </p>

                    <p className="mt-1 text-[8px] leading-4 text-red-600">
                      Place retail and reseller orders separately.
                    </p>
                  </div>
                )}

                {invalidCuratedCart && (
                  <div className="mt-5 rounded-[1.1rem] border border-red-200 bg-red-50 p-4">
                    <p className="text-[10px] font-black text-red-800">
                      Reseller set needs attention
                    </p>

                    <p className="mt-1 text-[8px] leading-4 text-red-600">
                      Rebuild the curated set before checkout.
                    </p>
                  </div>
                )}

                {invalidResellerGroups.length >
                  0 && (
                  <div className="mt-5 rounded-[1.1rem] border border-amber-200 bg-amber-50 p-4">
                    <p className="text-[10px] font-black text-amber-900">
                      Reseller MOQ not reached
                    </p>

                    <div className="mt-3 space-y-2">
                      {invalidResellerGroups.map(
                        (
                          group,
                        ) => (
                          <div
                            key={
                              group.productId
                            }
                            className="rounded-xl bg-white/70 px-3 py-2.5"
                          >
                            <p className="text-[9px] font-black text-amber-900">
                              {
                                group.productName
                              }
                            </p>

                            <p className="mt-1 text-[8px] text-amber-700">
                              {
                                group.quantity
                              }
                              /
                              {
                                group.moq
                              }{" "}
                              pcs · Add{" "}
                              {group.moq -
                                group.quantity}{" "}
                              more
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {canCheckout && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/checkout",
                      )
                    }
                    className="mt-5 hidden min-h-[52px] w-full rounded-[1rem] bg-emerald-600 px-5 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-emerald-600/15 transition active:scale-[0.98] sm:block"
                  >
                    Proceed to Checkout →
                  </button>
                )}

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    [
                      "✓",
                      "Secure",
                    ],
                    [
                      "₹",
                      "COD",
                    ],
                    [
                      "◎",
                      "Protected",
                    ],
                  ].map(
                    ([
                      icon,
                      label,
                    ]) => (
                      <div
                        key={
                          label
                        }
                        className="rounded-xl bg-[#f7f6f2] px-2 py-3 text-center"
                      >
                        <p className="text-sm font-black text-emerald-700">
                          {icon}
                        </p>

                        <p className="mt-1 text-[7px] font-black uppercase tracking-[0.08em] text-zinc-500">
                          {
                            label
                          }
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* CLEAR BAG CONFIRMATION */}
      {clearConfirm && (
        <div className="fixed inset-0 z-[130] grid place-items-end bg-black/55 p-3 backdrop-blur-sm sm:place-items-center">
          <div className="w-full max-w-md overflow-hidden rounded-[1.7rem] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.3)]">
            <div className="bg-[#06261c] p-5 text-white">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                AR Shopping Bag
              </p>

              <h2 className="mt-2 font-serif text-[1.8rem]">
                Clear your bag?
              </h2>

              <p className="mt-2 text-[10px] leading-5 text-white/45">
                All selected items will be removed from this shopping bag.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-4">
              <button
                type="button"
                onClick={() =>
                  setClearConfirm(
                    false,
                  )
                }
                className="min-h-[48px] rounded-[1rem] border border-black/[0.08] bg-white text-[9px] font-black uppercase tracking-[0.08em]"
              >
                Keep Items
              </button>

              <button
                type="button"
                onClick={
                  clearCart
                }
                className="min-h-[48px] rounded-[1rem] bg-red-600 text-[9px] font-black uppercase tracking-[0.08em] text-white"
              >
                Clear Bag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE CHECKOUT BAR */}
      {cart.length >
        0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/[0.07] bg-[#fffefa]/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.09)] backdrop-blur-xl sm:hidden">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                Estimated Total
              </p>

              <p className="mt-0.5 text-[18px] font-black leading-none">
                {money(
                  total,
                )}
              </p>

              <p className="mt-1 text-[7px] font-semibold text-zinc-400">
                {
                  totalItems
                }{" "}
                {totalItems ===
                1
                  ? "item"
                  : "items"}
              </p>
            </div>

            <button
              type="button"
              disabled={
                !canCheckout
              }
              onClick={() =>
                router.push(
                  "/checkout",
                )
              }
              className="min-h-[50px] min-w-[175px] rounded-[1rem] bg-emerald-600 px-5 text-[9px] font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-emerald-600/15 transition active:scale-[0.98] disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
            >
              {canCheckout
                ? "Checkout →"
                : isMixedCart
                  ? "Separate Orders"
                  : invalidCuratedCart
                    ? "Fix Set"
                    : "MOQ Required"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

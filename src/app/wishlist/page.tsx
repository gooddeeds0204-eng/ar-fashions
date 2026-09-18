"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ensureUserSession } from "@/lib/user-session-init";
import BrandLogo from "@/components/BrandLogo";

type WishlistProduct = {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    retailPrice: string | number;
    resellerPrice: string | number | null;
    mrp: string | number | null;
    category?: {
      name: string;
    } | null;
    media?: {
      url: string;
      type: "IMAGE" | "VIDEO";
      altText?: string | null;
    }[];
  };
};

type ToastState = {
  type: "SUCCESS" | "ERROR";
  title: string;
  message: string;
} | null;

function money(
  value: string | number | null,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "₹0";
  }

  return `₹${Number(
    value,
  ).toLocaleString("en-IN")}`;
}

function discountPercent(
  mrp: string | number | null,
  price: string | number,
) {
  if (
    !mrp ||
    Number(mrp) <= Number(price)
  ) {
    return 0;
  }

  return Math.round(
    ((Number(mrp) -
      Number(price)) /
      Number(mrp)) *
      100,
  );
}

export default function WishlistPage() {
  const router = useRouter();

  const [
    items,
    setItems,
  ] = useState<
    WishlistProduct[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    toast,
    setToast,
  ] =
    useState<ToastState>(
      null,
    );

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
    async function loadWishlist() {
      try {
        const userId =
          await ensureUserSession();

        if (!userId) {
          setItems([]);
          return;
        }

        const response =
          await fetch(
            "/api/wishlist",
            {
              cache:
                "no-store",
              credentials:
                "same-origin",
            },
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load wishlist",
          );
        }

        const data =
          await response.json();

        setItems(
          Array.isArray(
            data?.wishlist,
          )
            ? data.wishlist
            : [],
        );
      } catch (error) {
        console.error(
          "Wishlist page failed:",
          error,
        );

        notify(
          "ERROR",
          "Wishlist unavailable",
          "Please try again shortly.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadWishlist();
  }, []);

  async function removeWishlist(
    productId: string,
  ) {
    const userId =
      await ensureUserSession();

    if (!userId) {
      notify(
        "ERROR",
        "Sign in required",
        "Please sign in to manage your wishlist.",
      );

      return;
    }

    try {
      const response =
        await fetch(
          "/api/wishlist",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body:
              JSON.stringify({
                userId,
                productId,
              }),
          },
        );

      if (!response.ok) {
        throw new Error(
          "Failed to remove wishlist item.",
        );
      }

      setItems(
        (current) =>
          current.filter(
            (item) =>
              item.productId !==
              productId,
          ),
      );

      notify(
        "SUCCESS",
        "Removed from Saved Looks",
        "The product has been removed from your wishlist.",
      );
    } catch (error) {
      console.error(
        "Remove wishlist failed:",
        error,
      );

      notify(
        "ERROR",
        "Could not remove",
        "Please try again.",
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] px-4 pb-24 pt-6 text-[#211C18]">
        <div className="mx-auto max-w-6xl">
          <div className="ar-skeleton h-10 w-40 rounded-full" />
          <div className="mt-6 ar-skeleton h-20 w-full rounded-[1.5rem]" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item}>
                <div className="ar-skeleton aspect-[3/4] rounded-[1.2rem]" />
                <div className="mt-3 ar-skeleton h-3 w-4/5 rounded-full" />
                <div className="mt-2 ar-skeleton h-3 w-1/2 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#211C18] sm:pb-12">
      {/* TOP CENTER TOAST */}
      {toast && (
        <div className="fixed left-1/2 top-[78px] z-[100] w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div
            className={`flex items-center gap-3 rounded-[1.35rem] border p-3.5 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl ${
              toast.type ===
              "SUCCESS"
                ? "border-emerald-300/25 bg-[#031B14]/95"
                : "border-red-300/25 bg-[#7C3A45]/95"
            }`}
          >
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-black ${
                toast.type ===
                "SUCCESS"
                  ? "bg-emerald-400 text-[#031B14]"
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

              <p className="mt-1 text-[13px] font-black text-white">
                {toast.title}
              </p>

              <p className="mt-0.5 text-[9px] font-semibold text-white/55">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setToast(null)
              }
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#E4D7C4] bg-[#FFFDF9]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E4D7C4] bg-[#F1E8DA] text-sm font-black text-[#211C18]"
          >
            ←
          </button>

          <BrandLogo
            light
            compact
            onClick={() =>
              router.push("/")
            }
          />

          <button
            type="button"
            onClick={() =>
              router.push(
                "/cart",
              )
            }
            className="ml-auto rounded-full border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#211C18]"
          >
            Bag →
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#E4D7C4]">
        <div className="pointer-events-none absolute -right-24 top-[-80px] h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
          <div className="relative">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-300">
              AR Saved Edit
            </p>

            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <h1 className="font-serif text-[2.8rem] leading-[0.86] tracking-[-0.045em] text-[#211C18] sm:text-6xl">
                  Saved
                  <br />
                  Looks.
                </h1>

                <p className="mt-4 max-w-sm text-[10px] leading-5 text-[#7B7066] sm:text-sm">
                  Your personal fashion edit — keep the pieces you love and return whenever you are ready.
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-serif text-4xl text-emerald-300 sm:text-5xl">
                  {items.length}
                </p>

                <p className="mt-1 text-[7px] font-black uppercase tracking-[0.18em] text-white/35">
                  Saved
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        {items.length === 0 ? (
          <div className="relative overflow-hidden rounded-[1.8rem] border border-[#D9C29A] bg-[#F1E8DA] shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative p-6 sm:p-10">
              <div className="grid gap-7 md:grid-cols-[1fr_0.9fr] md:items-center">
                <div>
                  <div className="grid h-14 w-14 place-items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 text-3xl text-emerald-300">
                    ♡
                  </div>

                  <p className="mt-6 text-[8px] font-black uppercase tracking-[0.28em] text-emerald-300">
                    Your Personal Edit
                  </p>

                  <h2 className="mt-3 max-w-sm font-serif text-[2.25rem] leading-[0.92] text-[#211C18] sm:text-4xl">
                    Your saved runway starts here.
                  </h2>

                  <p className="mt-4 max-w-md text-[10px] leading-5 text-white/45 sm:text-sm">
                    Tap the heart on any product you love. We will keep it here so your favourites are always one tap away.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          "/",
                        )
                      }
                      className="rounded-full bg-emerald-400 px-5 py-3 text-[9px] font-black uppercase tracking-[0.08em] text-[#031B14]"
                    >
                      Explore Collection →
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          "/reels?mode=retail",
                        )
                      }
                      className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-[9px] font-black uppercase tracking-[0.08em] text-white"
                    >
                      Watch Reels
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    [
                      "01",
                      "Discover",
                      "Browse the AR collection",
                    ],
                    [
                      "02",
                      "Save",
                      "Tap ♡ on your favourites",
                    ],
                    [
                      "03",
                      "Return",
                      "Find them here anytime",
                    ],
                    [
                      "04",
                      "Shop",
                      "Open and buy when ready",
                    ],
                  ].map(
                    ([
                      number,
                      title,
                      subtitle,
                    ]) => (
                      <div
                        key={
                          number
                        }
                        className="rounded-[1.2rem] border border-[#E4D7C4] bg-[#FFFDF9] p-4"
                      >
                        <p className="font-serif text-xl text-emerald-300">
                          {number}
                        </p>

                        <p className="mt-4 text-[9px] font-black text-white">
                          {title}
                        </p>

                        <p className="mt-1 text-[7px] leading-4 text-white/35">
                          {subtitle}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.28em] text-emerald-300">
                  Your Edit
                </p>

                <h2 className="mt-2 font-serif text-[1.8rem] leading-none text-white">
                  Pieces you saved
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/")
                }
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-white/70"
              >
                Add More →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {items.map(
                (item) => {
                  const product =
                    item.product;

                  if (!product) {
                    return null;
                  }

                  const media =
                    product.media?.find(
                      (entry) =>
                        entry.type ===
                        "IMAGE",
                    ) ??
                    product.media?.[0];

                  const discount =
                    discountPercent(
                      product.mrp,
                      product.retailPrice,
                    );

                  return (
                    <article
                      key={item.id}
                      className="group overflow-hidden rounded-[1.25rem] border border-[#E4D7C4] bg-[#FFFDF9] shadow-[0_16px_40px_rgba(0,0,0,0.2)]"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-[#0A382B]">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/products/${product.id}?mode=retail`,
                            )
                          }
                          className="block h-full w-full"
                        >
                          {media?.type ===
                          "VIDEO" ? (
                            <video
                              src={
                                media.url
                              }
                              muted
                              playsInline
                              className="h-full w-full object-cover"
                            />
                          ) : media ? (
                            <img
                              src={
                                media.url
                              }
                              alt={
                                media.altText ??
                                product.name
                              }
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="grid h-full place-items-center font-serif text-xl text-white/20">
                              AR
                            </div>
                          )}
                        </button>

                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

                        <span className="absolute left-2.5 top-2.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] text-emerald-200 backdrop-blur">
                          Saved Look
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeWishlist(
                              product.id,
                            )
                          }
                          aria-label="Remove from Wishlist"
                          className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/55 text-base text-red-300 backdrop-blur transition active:scale-90"
                        >
                          ♥
                        </button>

                        {discount >
                          0 && (
                          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-emerald-400 px-2.5 py-1 text-[7px] font-black text-[#031B14]">
                            {discount}% OFF
                          </span>
                        )}
                      </div>

                      <div className="p-3.5">
                        {product.category && (
                          <p className="text-[7px] font-black uppercase tracking-[0.18em] text-emerald-300">
                            {
                              product
                                .category
                                .name
                            }
                          </p>
                        )}

                        <h3 className="mt-1.5 line-clamp-2 min-h-[2.25rem] text-[12px] font-black leading-[1.1rem] text-[#211C18]">
                          {
                            product.name
                          }
                        </h3>

                        <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
                          <span className="text-[15px] font-black text-[#211C18]">
                            {money(
                              product.retailPrice,
                            )}
                          </span>

                          {product.mrp &&
                            Number(
                              product.mrp,
                            ) >
                              Number(
                                product.retailPrice,
                              ) && (
                              <span className="text-[9px] text-white/30 line-through">
                                {money(
                                  product.mrp,
                                )}
                              </span>
                            )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/products/${product.id}?mode=retail`,
                            )
                          }
                          className="mt-3.5 min-h-[42px] w-full rounded-xl bg-emerald-400 px-3 text-[9px] font-black uppercase tracking-[0.08em] text-[#031B14] transition active:scale-[0.98]"
                        >
                          View Product →
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </>
        )}
      </section>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-2 left-3 right-3 z-50 rounded-[1.35rem] border border-[#E4D7C4] bg-[#FFFDF9]/95 px-1 pb-1.5 pt-1 shadow-[0_18px_55px_rgba(61,48,37,0.14)] backdrop-blur-2xl sm:hidden">
        <div className="grid grid-cols-4">
          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="flex min-h-[50px] flex-col items-center justify-center gap-1 text-[#7B7066]"
          >
            <span className="text-lg">
              ⌂
            </span>

            <span className="text-[7px] font-black">
              Home
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/reels?mode=retail",
              )
            }
            className="flex min-h-[50px] flex-col items-center justify-center gap-1 text-[#7B7066]"
          >
            <span className="text-lg">
              ▶
            </span>

            <span className="text-[7px] font-black">
              Reels
            </span>
          </button>

          <button
            type="button"
            className="flex min-h-[50px] flex-col items-center justify-center gap-1 text-emerald-300"
          >
            <span className="text-lg">
              ♥
            </span>

            <span className="text-[7px] font-black">
              Wishlist
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/account",
              )
            }
            className="flex min-h-[50px] flex-col items-center justify-center gap-1 text-[#7B7066]"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-[7px]">
              A
            </span>

            <span className="text-[7px] font-black">
              Account
            </span>
          </button>
        </div>
      </nav>
    </main>
  );
}

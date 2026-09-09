"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserSession } from "@/lib/user-session-init";

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

function money(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "₹0";
  }

  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export default function WishlistPage() {
  const router = useRouter();

  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWishlist() {
      try {
        const userId =
          await ensureUserSession();

        if (!userId) {
          setItems([]);
          return;
        }

        const response = await fetch(
          "/api/wishlist",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to load wishlist");
        }

        const data = await response.json();

        setItems(
          Array.isArray(data?.wishlist)
            ? data.wishlist
            : [],
        );
      } catch (error) {
        console.error(
          "Wishlist page failed:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }

    loadWishlist();
  }, []);

  async function removeWishlist(productId: string) {
    const userId =
      await ensureUserSession();

    if (!userId) {
      alert(
        "Please sign in to use Wishlist.",
      );
      return;
    }

    try {
      const response = await fetch(
        "/api/wishlist",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
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

      setItems((current) =>
        current.filter(
          (item) =>
            item.productId !== productId,
        ),
      );
    } catch (error) {
      console.error(
        "Remove wishlist failed:",
        error,
      );

      alert("Could not remove wishlist item.");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm font-semibold text-zinc-500">
          Loading wishlist...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm font-bold"
          >
            ← AR FASHIONS
          </button>

          <h1 className="ml-auto text-sm font-black">
            Wishlist
          </h1>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">
            AR Fashions
          </p>

          <h2 className="mt-1 text-3xl font-black tracking-tight">
            My Wishlist
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            {items.length} saved{" "}
            {items.length === 1
              ? "product"
              : "products"}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-black/5 bg-white px-6 py-20 text-center shadow-sm">
            <div className="text-5xl">♡</div>

            <h3 className="mt-5 text-xl font-black">
              Your wishlist is empty
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              Save products you love and come back
              to them anytime.
            </p>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 rounded-xl bg-zinc-950 px-6 py-3 text-xs font-bold text-white transition hover:bg-emerald-600"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => {
              const product = item.product;

              if (!product) return null;

              const media =
                product.media?.find(
                  (entry) =>
                    entry.type === "IMAGE",
                ) ??
                product.media?.[0];

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/products/${product.id}`,
                      )
                    }
                    className="block w-full text-left"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
                      {media ? (
                        <img
                          src={media.url}
                          alt={
                            media.altText ??
                            product.name
                          }
                          className="h-full w-full object-cover transition duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                          No image
                        </div>
                      )}

                      <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-red-500 shadow-sm">
                        ♥
                      </span>
                    </div>
                  </button>

                  <div className="p-4">
                    {product.category && (
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                        {product.category.name}
                      </p>
                    )}

                    <h3 className="line-clamp-1 text-sm font-bold">
                      {product.name}
                    </h3>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="font-extrabold">
                        {money(
                          product.retailPrice,
                        )}
                      </span>

                      {product.mrp &&
                        Number(product.mrp) >
                          Number(
                            product.retailPrice,
                          ) && (
                          <span className="text-xs text-zinc-400 line-through">
                            {money(product.mrp)}
                          </span>
                        )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/products/${product.id}`,
                          )
                        }
                        className="flex-1 rounded-xl bg-zinc-950 py-3 text-[11px] font-bold text-white"
                      >
                        View Product
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeWishlist(
                            product.id,
                          )
                        }
                        className="rounded-xl border border-black/10 px-3 text-lg"
                        aria-label="Remove from Wishlist"
                      >
                        ♡
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

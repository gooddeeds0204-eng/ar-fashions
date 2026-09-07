"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function CartPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ar-fashions-cart");

      if (raw) {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch (error) {
      console.error("Cart load failed:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  function saveCart(nextCart: CartItem[]) {
    setCart(nextCart);
    localStorage.setItem(
      "ar-fashions-cart",
      JSON.stringify(nextCart),
    );
  }

  function increase(itemId: string) {
    const nextCart = cart.map((item) =>
      item.id === itemId
        ? {
            ...item,
            quantity: item.quantity + 1,
          }
        : item,
    );

    saveCart(nextCart);
  }

  function decrease(itemId: string) {
    const nextCart = cart
      .map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: item.quantity - 1,
            }
          : item,
      )
      .filter((item) => item.quantity > 0);

    saveCart(nextCart);
  }

  function removeItem(itemId: string) {
    const nextCart = cart.filter(
      (item) => item.id !== itemId,
    );

    saveCart(nextCart);
  }

  function clearCart() {
    setCart([]);
    localStorage.removeItem("ar-fashions-cart");
  }

  const totalItems = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    [cart],
  );

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + item.price * item.quantity,
        0,
      ),
    [cart],
  );

  const delivery = subtotal >= 999 || subtotal === 0 ? 0 : 79;

  const total = subtotal + delivery;

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm font-semibold text-zinc-500">
          Loading cart...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push("/")}
            className="text-xl font-black tracking-[-0.05em]"
          >
            AR
            <span className="text-emerald-600">
              FASHIONS
            </span>
          </button>

          <button
            onClick={() => router.push("/")}
            className="ml-auto rounded-full border border-black/10 px-4 py-2 text-xs font-bold"
          >
            ← Continue Shopping
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">
              AR Fashions
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
              Shopping Cart
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              {totalItems}{" "}
              {totalItems === 1 ? "item" : "items"} in
              your cart
            </p>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-bold text-red-500"
            >
              Clear Cart
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <section className="rounded-3xl border border-black/5 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 text-3xl">
              🛒
            </div>

            <h2 className="mt-6 text-xl font-black">
              Your cart is empty
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Add some products to continue shopping.
            </p>

            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded-2xl bg-zinc-950 px-8 py-4 text-sm font-black text-white transition hover:bg-emerald-600"
            >
              Start Shopping
            </button>
          </section>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <section className="space-y-4">
              {cart.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-4">
                    <div className="h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <div>
                          <h2 className="line-clamp-2 text-sm font-black">
                            {item.productName}
                          </h2>

                          <p className="mt-1 text-xs text-zinc-500">
                            Color: {item.colorName}
                          </p>

                          <p className="text-xs text-zinc-500">
                            Size: {item.sizeName}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            removeItem(item.id)
                          }
                          className="text-xs font-bold text-red-500"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-base font-black">
                          {money(item.price)}
                        </p>

                        <div className="flex items-center overflow-hidden rounded-xl border border-black/10">
                          <button
                            onClick={() =>
                              decrease(item.id)
                            }
                            className="px-3 py-2 font-bold"
                          >
                            −
                          </button>

                          <span className="min-w-9 text-center text-sm font-bold">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              increase(item.id)
                            }
                            className="px-3 py-2 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-right text-sm font-black">
                        {money(
                          item.price * item.quantity,
                        )}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-3xl border border-black/5 bg-white p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-lg font-black">
                Order Summary
              </h2>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    Subtotal
                  </span>

                  <span className="font-bold">
                    {money(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    Delivery
                  </span>

                  <span className="font-bold">
                    {delivery === 0
                      ? "FREE"
                      : money(delivery)}
                  </span>
                </div>

                <div className="border-t border-black/10 pt-4">
                  <div className="flex justify-between">
                    <span className="font-black">
                      Total
                    </span>

                    <span className="text-xl font-black">
                      {money(total)}
                    </span>
                  </div>
                </div>
              </div>

              {subtotal > 0 && subtotal < 999 && (
                <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                  Add {money(999 - subtotal)} more for
                  FREE delivery.
                </p>
              )}

              <button
                onClick={() => router.push("/checkout")}
                className="mt-6 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white transition hover:bg-emerald-600"
              >
                Proceed to Checkout
              </button>

              <div className="mt-4 text-center text-[11px] text-zinc-400">
                Secure checkout • AR Fashions
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

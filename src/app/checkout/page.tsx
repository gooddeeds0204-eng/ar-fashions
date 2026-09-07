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

function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem("ar-fashions-cart");
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Andhra Pradesh");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");

  useEffect(() => {
    const items = getCart();
    setCart(items);

    if (items.length === 0) {
      router.replace("/cart");
    }
  }, [router]);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + item.price * item.quantity,
        0,
      ),
    [cart],
  );

  const deliveryCharge = subtotal >= 999 ? 0 : 79;

  const total = subtotal + deliveryCharge;

  async function placeOrder() {
    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!addressLine1.trim()) {
      alert("Please enter your address.");
      return;
    }

    if (!city.trim()) {
      alert("Please enter your city.");
      return;
    }

    if (!state.trim()) {
      alert("Please enter your state.");
      return;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      alert("Please enter a valid 6-digit pincode.");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      router.push("/cart");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "RETAIL",
          paymentMethod: "COD",
          customer: {
            name: name.trim(),
            phone: phone.trim(),
            addressLine1: addressLine1.trim(),
            addressLine2:
              addressLine2.trim() || null,
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            landmark:
              landmark.trim() || null,
          },
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            colorName: item.colorName,
            sizeName: item.sizeName,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to place order.",
        );
      }

      localStorage.removeItem("ar-fashions-cart");

      router.replace(
        `/order-success?orderNumber=${encodeURIComponent(
          data.orderNumber,
        )}`,
      );
    } catch (error) {
      console.error("Checkout failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to place order.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (cart.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm font-semibold text-zinc-500">
          Redirecting to cart...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="rounded-full px-3 py-2 text-sm font-bold hover:bg-zinc-100"
          >
            ←
          </button>

          <button
            onClick={() => router.push("/")}
            className="ml-3 text-xl font-black tracking-[-0.05em]"
          >
            AR
            <span className="text-emerald-600">
              FASHIONS
            </span>
          </button>

          <span className="ml-auto text-xs font-bold text-zinc-500">
            Secure Checkout
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        {/* CUSTOMER DETAILS */}
        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <h1 className="text-2xl font-black">
            Delivery Details
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Enter your delivery information.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold">
                Full Name
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Enter your full name"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold">
                Mobile Number
              </label>

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10),
                  )
                }
                inputMode="numeric"
                placeholder="10-digit mobile number"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold">
                Address
              </label>

              <input
                value={addressLine1}
                onChange={(event) =>
                  setAddressLine1(event.target.value)
                }
                placeholder="House / Flat / Street"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold">
                Address Line 2
              </label>

              <input
                value={addressLine2}
                onChange={(event) =>
                  setAddressLine2(event.target.value)
                }
                placeholder="Area / Colony / Apartment (optional)"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold">
                City
              </label>

              <input
                value={city}
                onChange={(event) =>
                  setCity(event.target.value)
                }
                placeholder="City"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold">
                State
              </label>

              <input
                value={state}
                onChange={(event) =>
                  setState(event.target.value)
                }
                placeholder="State"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold">
                Pincode
              </label>

              <input
                value={pincode}
                onChange={(event) =>
                  setPincode(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6),
                  )
                }
                inputMode="numeric"
                placeholder="6-digit pincode"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold">
                Landmark
              </label>

              <input
                value={landmark}
                onChange={(event) =>
                  setLandmark(event.target.value)
                }
                placeholder="Nearby landmark (optional)"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </section>

        {/* ORDER SUMMARY */}
        <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-24">
          <h2 className="text-lg font-black">
            Order Summary
          </h2>

          <div className="mt-5 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex gap-3"
              >
                <div className="h-16 w-14 overflow-hidden rounded-xl bg-zinc-100">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold">
                    {item.productName}
                  </p>

                  <p className="mt-1 text-[11px] text-zinc-500">
                    {item.colorName} · {item.sizeName} · Qty{" "}
                    {item.quantity}
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {money(
                      item.price * item.quantity,
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="my-6 border-t border-black/10" />

          <div className="space-y-3 text-sm">
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
                {deliveryCharge === 0
                  ? "FREE"
                  : money(deliveryCharge)}
              </span>
            </div>
          </div>

          <div className="my-5 border-t border-black/10" />

          <div className="flex items-center justify-between">
            <span className="text-base font-black">
              Total
            </span>

            <span className="text-2xl font-black">
              {money(total)}
            </span>
          </div>

          <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-black text-emerald-700">
              CASH ON DELIVERY
            </p>

            <p className="mt-1 text-[11px] leading-5 text-emerald-700/80">
              Pay when your order is delivered.
            </p>
          </div>

          <button
            onClick={placeOrder}
            disabled={loading}
            className="mt-5 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {loading
              ? "Placing Order..."
              : `Place Order · ${money(total)}`}
          </button>
        </aside>
      </div>
    </main>
  );
}

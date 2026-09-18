"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

type Address = {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  isDefault: boolean;
};

type ToastState = {
  type: "SUCCESS" | "ERROR";
  title: string;
  message: string;
} | null;

export default function AddressesPage() {
  const router = useRouter();

  const [addresses, setAddresses] =
    useState<Address[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [toast, setToast] =
    useState<ToastState>(null);

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [
    addressLine1,
    setAddressLine1,
  ] = useState("");

  const [
    addressLine2,
    setAddressLine2,
  ] = useState("");

  const [city, setCity] =
    useState("");

  const [state, setState] =
    useState("Andhra Pradesh");

  const [pincode, setPincode] =
    useState("");

  const [landmark, setLandmark] =
    useState("");

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
      3000,
    );
  }

  const loadAddresses =
    useCallback(async () => {
      try {
        setError("");

        const response =
          await fetch(
            "/api/addresses",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Failed to load addresses.",
          );
        }

        setAddresses(
          Array.isArray(
            data.addresses,
          )
            ? data.addresses
            : [],
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load addresses.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  function resetForm() {
    setName("");
    setPhone("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setState(
      "Andhra Pradesh",
    );
    setPincode("");
    setLandmark("");
  }

  async function saveAddress(
    event: FormEvent,
  ) {
    event.preventDefault();

    setSaving(true);

    try {
      const response =
        await fetch(
          "/api/addresses",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              name: name.trim(),
              phone: phone.trim(),
              addressLine1:
                addressLine1.trim(),
              addressLine2:
                addressLine2.trim() ||
                null,
              city: city.trim(),
              state: state.trim(),
              pincode:
                pincode.trim(),
              landmark:
                landmark.trim() ||
                null,
              isDefault:
                addresses.length ===
                0,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to save address.",
        );
      }

      resetForm();
      setShowForm(false);

      await loadAddresses();

      notify(
        "SUCCESS",
        "Address Saved",
        addresses.length === 0
          ? "Your first address is ready for checkout."
          : "Delivery address added successfully.",
      );
    } catch (error) {
      notify(
        "ERROR",
        "Could Not Save",
        error instanceof Error
          ? error.message
          : "Failed to save address.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(
    addressId: string,
    goToCheckout = false,
  ) {
    try {
      const response =
        await fetch(
          "/api/addresses",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              addressId,
              makeDefault: true,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update address.",
        );
      }

      await loadAddresses();

      notify(
        "SUCCESS",
        "Default Address Updated",
        goToCheckout
          ? "Using this address for your checkout."
          : "This is now your preferred delivery address.",
      );

      if (goToCheckout) {
        window.setTimeout(
          () => {
            router.push(
              "/checkout",
            );
          },
          350,
        );
      }

      return true;
    } catch (error) {
      notify(
        "ERROR",
        "Update Failed",
        error instanceof Error
          ? error.message
          : "Failed to update address.",
      );

      return false;
    }
  }

  function useAtCheckout(
    address: Address,
  ) {
    if (address.isDefault) {
      router.push(
        "/checkout",
      );

      return;
    }

    void makeDefault(
      address.id,
      true,
    );
  }

  const defaultAddress =
    addresses.find(
      (address) =>
        address.isDefault,
    );

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-12 text-zinc-950">
      {/* TOP-CENTER AR TOAST */}
      {toast && (
        <div className="fixed left-1/2 top-[78px] z-[120] w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div
            className={`flex items-center gap-3 rounded-[1.35rem] border p-3.5 text-white shadow-[0_20px_55px_rgba(0,0,0,0.28)] backdrop-blur-xl ${
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
              <p
                className={`text-[8px] font-black uppercase tracking-[0.2em] ${
                  toast.type ===
                  "SUCCESS"
                    ? "text-emerald-300"
                    : "text-red-200"
                }`}
              >
                AR Fashions
              </p>

              <p className="mt-1 text-[13px] font-black">
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
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#FFFDF9]/95 shadow-[0_1px_12px_rgba(0,0,0,0.03)] backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-100 text-sm font-black transition active:scale-95"
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
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="ml-auto rounded-full bg-zinc-950 px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.08em] text-white shadow-sm transition active:scale-[0.98]"
          >
            + Add Address
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* TITLE */}
        <section>
          <p className="text-[8px] font-black uppercase tracking-[0.28em] text-emerald-700">
            AR Fashions · Account
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-[2.35rem] leading-none tracking-[-0.04em] sm:text-5xl">
                Saved Addresses
              </h1>

              <p className="mt-3 max-w-lg text-[11px] leading-5 text-zinc-500 sm:text-sm">
                Manage your preferred delivery locations and choose the address you want to use at checkout.
              </p>
            </div>

            {!loading &&
              !error &&
              addresses.length >
                0 && (
                <span className="shrink-0 rounded-full bg-zinc-950 px-3 py-2 text-[9px] font-black text-white">
                  {
                    addresses.length
                  }{" "}
                  Saved
                </span>
              )}
          </div>
        </section>

        {/* ACCOUNT DELIVERY STATUS */}
        {!loading &&
          !error &&
          addresses.length >
            0 && (
            <section className="mt-6 grid grid-cols-3 gap-2">
              <div className="rounded-[1.2rem] border border-black/[0.05] bg-white p-3 text-center shadow-sm">
                <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-[11px] font-black text-emerald-700">
                  ✓
                </span>

                <p className="mt-2 text-[8px] font-black">
                  Checkout Ready
                </p>

                <p className="mt-1 text-[6px] text-zinc-400">
                  Address saved
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-black/[0.05] bg-white p-3 text-center shadow-sm">
                <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-[11px] font-black text-emerald-700">
                  ₹
                </span>

                <p className="mt-2 text-[8px] font-black">
                  COD Ready
                </p>

                <p className="mt-1 text-[6px] text-zinc-400">
                  Pay on delivery
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-black/[0.05] bg-white p-3 text-center shadow-sm">
                <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-[11px] font-black text-emerald-700">
                  ◎
                </span>

                <p className="mt-2 text-[8px] font-black">
                  Secure
                </p>

                <p className="mt-1 text-[6px] text-zinc-400">
                  Account protected
                </p>
              </div>
            </section>
          )}

        {loading ? (
          <div className="mt-6 rounded-[1.7rem] border border-black/[0.05] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-500" />

            <p className="mt-4 text-[11px] font-bold text-zinc-500">
              Loading addresses...
            </p>
          </div>
        ) : error ? (
          <div className="mt-6 rounded-[1.7rem] border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-xl font-black text-red-500">
              !
            </div>

            <h2 className="mt-4 text-lg font-black">
              Unable to load addresses
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadAddresses();
              }}
              className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white"
            >
              Try Again
            </button>
          </div>
        ) : addresses.length ===
          0 ? (
          <div className="mt-6 rounded-[1.8rem] border border-black/[0.05] bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-700">
              ⌂
            </div>

            <p className="mt-5 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700">
              Delivery Address
            </p>

            <h2 className="mt-2 text-xl font-black">
              No saved addresses
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
              Add your first delivery address to make checkout faster.
            </p>

            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mt-6 rounded-2xl bg-emerald-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/15"
            >
              Add First Address →
            </button>
          </div>
        ) : (
          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  Delivery Book
                </p>

                <h2 className="mt-1 text-lg font-black">
                  Your saved locations
                </h2>
              </div>

              {defaultAddress && (
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-emerald-700">
                  Default Ready
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {addresses.map(
                (
                  address,
                  index,
                ) => (
                  <article
                    key={address.id}
                    className={`relative overflow-hidden rounded-[1.6rem] border bg-white shadow-[0_12px_35px_rgba(0,0,0,0.04)] ${
                      address.isDefault
                        ? "border-emerald-400/70"
                        : "border-black/[0.06]"
                    }`}
                  >
                    {address.isDefault && (
                      <div className="h-1 w-full bg-emerald-500" />
                    )}

                    <div className="p-4 sm:p-5">
                      {/* ADDRESS HEADER */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-black ${
                              address.isDefault
                                ? "bg-emerald-600 text-white"
                                : "bg-[#FAF7F0] text-zinc-600"
                            }`}
                          >
                            ⌂
                          </span>

                          <div className="min-w-0">
                            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-zinc-400">
                              Address{" "}
                              {index + 1}
                            </p>

                            <h3 className="mt-1 truncate text-[15px] font-black">
                              {
                                address.name
                              }
                            </h3>

                            <p className="mt-1 text-[10px] font-semibold text-zinc-500">
                              +91{" "}
                              {
                                address.phone
                              }
                            </p>
                          </div>
                        </div>

                        {address.isDefault ? (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-emerald-700">
                            ✓ Default
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-zinc-400">
                            Saved
                          </span>
                        )}
                      </div>

                      {/* FULL ADDRESS */}
                      <div className="mt-5 rounded-[1.2rem] bg-[#FAF7F0] p-4">
                        <p className="text-[7px] font-black uppercase tracking-[0.18em] text-emerald-700">
                          Full Delivery Address
                        </p>

                        <p className="mt-2 text-[11px] leading-5 text-zinc-700">
                          {
                            address.addressLine1
                          }
                          {address.addressLine2
                            ? `, ${address.addressLine2}`
                            : ""}
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-white px-3 py-2.5">
                            <p className="text-[6px] font-black uppercase tracking-[0.12em] text-zinc-400">
                              City
                            </p>

                            <p className="mt-1 text-[9px] font-black">
                              {
                                address.city
                              }
                            </p>
                          </div>

                          <div className="rounded-xl bg-white px-3 py-2.5">
                            <p className="text-[6px] font-black uppercase tracking-[0.12em] text-zinc-400">
                              Pincode
                            </p>

                            <p className="mt-1 text-[9px] font-black">
                              {
                                address.pincode
                              }
                            </p>
                          </div>

                          <div className="col-span-2 rounded-xl bg-white px-3 py-2.5">
                            <p className="text-[6px] font-black uppercase tracking-[0.12em] text-zinc-400">
                              State
                            </p>

                            <p className="mt-1 text-[9px] font-black">
                              {
                                address.state
                              }
                            </p>
                          </div>
                        </div>

                        {address.landmark && (
                          <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
                            <p className="text-[6px] font-black uppercase tracking-[0.12em] text-amber-700">
                              Landmark
                            </p>

                            <p className="mt-1 text-[9px] font-semibold text-amber-900">
                              Near{" "}
                              {
                                address.landmark
                              }
                            </p>
                          </div>
                        )}
                      </div>

                      {/* DELIVERY READY INFO */}
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-[9px] font-black text-white">
                          ✓
                        </span>

                        <div>
                          <p className="text-[8px] font-black text-emerald-800">
                            Ready for Checkout
                          </p>

                          <p className="mt-0.5 text-[7px] text-emerald-700/65">
                            This address can be used for your next order.
                          </p>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="mt-4 grid gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            useAtCheckout(
                              address,
                            )
                          }
                          className="min-h-[48px] w-full rounded-[1rem] bg-emerald-600 px-4 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_25px_rgba(5,150,105,0.16)] transition active:scale-[0.98]"
                        >
                          Use at Checkout →
                        </button>

                        {!address.isDefault && (
                          <button
                            type="button"
                            onClick={() =>
                              void makeDefault(
                                address.id,
                              )
                            }
                            className="min-h-[44px] w-full rounded-[1rem] border border-black/[0.08] bg-white px-4 text-[9px] font-black uppercase tracking-[0.08em] text-zinc-700 transition active:scale-[0.98]"
                          >
                            Set as Default Address
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        )}
      </div>

      {/* ADD ADDRESS MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4">
          <div className="mx-auto my-4 max-w-xl overflow-hidden rounded-[1.8rem] bg-[#FFFDF9] shadow-[0_30px_90px_rgba(0,0,0,0.3)] sm:my-8">
            <div className="border-b border-black/[0.06] bg-[#031B14] p-5 text-white sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[7px] font-black uppercase tracking-[0.22em] text-emerald-300">
                    AR Fashions · Delivery
                  </p>

                  <h2 className="mt-2 font-serif text-[2rem] leading-none">
                    Add Address
                  </h2>

                  <p className="mt-2 text-[10px] leading-5 text-white/45">
                    Save a delivery location for faster checkout.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black"
                >
                  ✕
                </button>
              </div>
            </div>

            <form
              onSubmit={
                saveAddress
              }
              className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
            >
              <div className="sm:col-span-2">
                <p className="mb-2 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  Recipient Name
                </p>

                <input
                  required
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value,
                    )
                  }
                  placeholder="Full name"
                  className="w-full rounded-[1rem] border border-black/[0.08] bg-white px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <p className="mb-2 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  Mobile Number
                </p>

                <input
                  required
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                        .replace(
                          /\D/g,
                          "",
                        )
                        .slice(
                          0,
                          10,
                        ),
                    )
                  }
                  inputMode="numeric"
                  placeholder="10 digit mobile number"
                  className="w-full rounded-[1rem] border border-black/[0.08] bg-white px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <p className="mb-2 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  House / Flat / Street
                </p>

                <input
                  required
                  value={
                    addressLine1
                  }
                  onChange={(e) =>
                    setAddressLine1(
                      e.target.value,
                    )
                  }
                  placeholder="House no, building, street"
                  className="w-full rounded-[1rem] border border-black/[0.08] bg-white px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <p className="mb-2 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  Area / Colony
                </p>

                <input
                  value={
                    addressLine2
                  }
                  onChange={(e) =>
                    setAddressLine2(
                      e.target.value,
                    )
                  }
                  placeholder="Area, colony, locality"
                  className="w-full rounded-[1rem] border border-black/[0.08] bg-white px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <p className="mb-2 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  City
                </p>

                <input
                  required
                  value={city}
                  onChange={(e) =>
                    setCity(
                      e.target.value,
                    )
                  }
                  placeholder="City"
                  className="w-full rounded-[1rem] border border-black/[0.08] bg-white px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <p className="mb-2 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  State
                </p>

                <input
                  required
                  value={state}
                  onChange={(e) =>
                    setState(
                      e.target.value,
                    )
                  }
                  placeholder="State"
                  className="w-full rounded-[1rem] border border-black/[0.08] bg-white px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <p className="mb-2 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  Pincode
                </p>

                <input
                  required
                  value={pincode}
                  onChange={(e) =>
                    setPincode(
                      e.target.value
                        .replace(
                          /\D/g,
                          "",
                        )
                        .slice(
                          0,
                          6,
                        ),
                    )
                  }
                  inputMode="numeric"
                  placeholder="6 digit pincode"
                  className="w-full rounded-[1rem] border border-black/[0.08] bg-white px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <p className="mb-2 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  Landmark
                </p>

                <input
                  value={
                    landmark
                  }
                  onChange={(e) =>
                    setLandmark(
                      e.target.value,
                    )
                  }
                  placeholder="Nearby landmark"
                  className="w-full rounded-[1rem] border border-black/[0.08] bg-white px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="rounded-[1rem] border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="text-[9px] font-black text-emerald-800">
                    ✓ Secure Address Storage
                  </p>

                  <p className="mt-1 text-[8px] leading-4 text-emerald-700/65">
                    Your saved address is connected to your customer session and used only for checkout and order delivery.
                  </p>
                </div>
              </div>

              <button
                disabled={saving}
                className="min-h-[52px] rounded-[1rem] bg-emerald-600 px-5 text-[11px] font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-emerald-600/15 transition active:scale-[0.98] sm:col-span-2 disabled:bg-zinc-300"
              >
                {saving
                  ? "Saving Address..."
                  : "Save Delivery Address →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

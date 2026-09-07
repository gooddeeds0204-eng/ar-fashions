"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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
    } catch (error) {
      alert(
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
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update address.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="rounded-full px-3 py-2 text-sm font-bold"
          >
            ←
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="ml-3 text-xl font-black tracking-[-0.05em]"
          >
            AR
            <span className="text-emerald-600">
              FASHIONS
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="ml-auto rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white"
          >
            + Add Address
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
            Account
          </p>

          <h1 className="mt-1 text-2xl font-black">
            Saved Addresses
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Choose your preferred
            delivery address at
            checkout.
          </p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
            Loading addresses...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="font-bold">
              {error}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Place an order first
              to create your secure
              customer session.
            </p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
            <h2 className="font-black">
              No saved addresses
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Add your first delivery
              address.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowForm(true)
              }
              className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white"
            >
              Add Address
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {addresses.map(
              (address) => (
                <section
                  key={address.id}
                  className={`rounded-3xl border bg-white p-5 shadow-sm ${
                    address.isDefault
                      ? "border-emerald-500"
                      : "border-black/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">
                        {address.name}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-zinc-600">
                        {address.phone}
                      </p>
                    </div>

                    {address.isDefault && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        Default
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm leading-6 text-zinc-600">
                    {
                      address.addressLine1
                    }
                    {address.addressLine2
                      ? `, ${address.addressLine2}`
                      : ""}
                    , {address.city},{" "}
                    {address.state} -{" "}
                    {address.pincode}
                  </p>

                  {address.landmark && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Landmark:{" "}
                      {address.landmark}
                    </p>
                  )}

                  {!address.isDefault && (
                    <button
                      type="button"
                      onClick={() =>
                        makeDefault(
                          address.id,
                        )
                      }
                      className="mt-5 rounded-xl border border-black/10 px-4 py-2 text-xs font-bold"
                    >
                      Set as Default
                    </button>
                  )}
                </section>
              ),
            )}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 p-4">
            <div className="mx-auto my-6 max-w-xl rounded-3xl bg-white p-5 shadow-xl sm:p-7">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">
                  Add Address
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="rounded-full bg-zinc-100 px-3 py-2 font-bold"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={saveAddress}
                className="mt-6 grid gap-4 sm:grid-cols-2"
              >
                <input
                  required
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value,
                    )
                  }
                  placeholder="Full Name"
                  className="rounded-xl border border-black/10 px-4 py-3 text-sm sm:col-span-2"
                />

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
                        .slice(0, 10),
                    )
                  }
                  inputMode="numeric"
                  placeholder="Mobile Number"
                  className="rounded-xl border border-black/10 px-4 py-3 text-sm sm:col-span-2"
                />

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
                  placeholder="House / Flat / Street"
                  className="rounded-xl border border-black/10 px-4 py-3 text-sm sm:col-span-2"
                />

                <input
                  value={
                    addressLine2
                  }
                  onChange={(e) =>
                    setAddressLine2(
                      e.target.value,
                    )
                  }
                  placeholder="Area / Colony"
                  className="rounded-xl border border-black/10 px-4 py-3 text-sm sm:col-span-2"
                />

                <input
                  required
                  value={city}
                  onChange={(e) =>
                    setCity(
                      e.target.value,
                    )
                  }
                  placeholder="City"
                  className="rounded-xl border border-black/10 px-4 py-3 text-sm"
                />

                <input
                  required
                  value={state}
                  onChange={(e) =>
                    setState(
                      e.target.value,
                    )
                  }
                  placeholder="State"
                  className="rounded-xl border border-black/10 px-4 py-3 text-sm"
                />

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
                        .slice(0, 6),
                    )
                  }
                  inputMode="numeric"
                  placeholder="Pincode"
                  className="rounded-xl border border-black/10 px-4 py-3 text-sm"
                />

                <input
                  value={landmark}
                  onChange={(e) =>
                    setLandmark(
                      e.target.value,
                    )
                  }
                  placeholder="Landmark"
                  className="rounded-xl border border-black/10 px-4 py-3 text-sm"
                />

                <button
                  disabled={saving}
                  className="rounded-xl bg-zinc-950 px-5 py-4 text-sm font-black text-white sm:col-span-2 disabled:bg-zinc-300"
                >
                  {saving
                    ? "Saving..."
                    : "Save Address"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

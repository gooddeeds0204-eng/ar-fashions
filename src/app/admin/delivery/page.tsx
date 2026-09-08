"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Form = {
  retailDeliveryCharge: number;
  retailFreeDeliveryThreshold: number;

  resellerDeliveryMode:
    | "ACTUAL_FREIGHT"
    | "FLAT";

  resellerFlatDeliveryCharge: number;

  estimatedMinDays: number;
  estimatedMaxDays: number;

  bulkFreightMessage: string;

  restrictServiceability: boolean;
  allowedStates: string[];
  allowedPincodes: string[];
};

const initial: Form = {
  retailDeliveryCharge: 79,
  retailFreeDeliveryThreshold: 999,

  resellerDeliveryMode:
    "ACTUAL_FREIGHT",

  resellerFlatDeliveryCharge: 0,

  estimatedMinDays: 3,
  estimatedMaxDays: 7,

  bulkFreightMessage:
    "Bulk shipping charge will be calculated after packing based on parcel weight and destination.",

  restrictServiceability: false,
  allowedStates: [],
  allowedPincodes: [],
};

export default function DeliveryPage() {
  const router = useRouter();

  const [form, setForm] =
    useState<Form>(initial);

  const [states, setStates] =
    useState("");

  const [pincodes, setPincodes] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    (async () => {
      try {
        const response =
          await fetch(
            "/api/admin/delivery-settings",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        if (
          response.status === 401
        ) {
          router.replace(
            "/admin/login",
          );
          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error,
          );
        }

        setForm(data.settings);

        setStates(
          data.settings.allowedStates.join(
            "\n",
          ),
        );

        setPincodes(
          data.settings.allowedPincodes.join(
            "\n",
          ),
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to load settings.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function lines(
    value: string,
  ) {
    return value
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function save() {
    try {
      setSaving(true);
      setMessage("");

      const response =
        await fetch(
          "/api/admin/delivery-settings",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body:
              JSON.stringify({
                ...form,
                allowedStates:
                  lines(states),
                allowedPincodes:
                  lines(pincodes),
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error,
        );
      }

      setForm(data.settings);

      setMessage(
        data.message,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Save failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        Loading delivery settings...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
          AR FASHIONS
        </p>

        <h1 className="mt-1 text-3xl font-black">
          Delivery Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Retail courier charges and bulk freight rules.
        </p>

        {message ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase text-emerald-600">
              Retail
            </p>

            <h2 className="mt-1 text-xl font-black">
              Small Parcel Delivery
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">

              <label className="text-xs font-black">
                Delivery Charge ₹

                <input
                  type="number"
                  min="0"
                  value={
                    form.retailDeliveryCharge
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      retailDeliveryCharge:
                        Number(
                          e.target.value,
                        ),
                    })
                  }
                  className="mt-2 w-full rounded-2xl border p-3"
                />
              </label>

              <label className="text-xs font-black">
                Free Above ₹

                <input
                  type="number"
                  min="0"
                  value={
                    form.retailFreeDeliveryThreshold
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      retailFreeDeliveryThreshold:
                        Number(
                          e.target.value,
                        ),
                    })
                  }
                  className="mt-2 w-full rounded-2xl border p-3"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase text-violet-600">
              Reseller / Bulk
            </p>

            <h2 className="mt-1 text-xl font-black">
              Heavy Parcel Freight
            </h2>

            <label className="mt-5 block text-xs font-black">
              Shipping Mode

              <select
                value={
                  form.resellerDeliveryMode
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    resellerDeliveryMode:
                      e.target
                        .value as Form["resellerDeliveryMode"],
                  })
                }
                className="mt-2 w-full rounded-2xl border p-3"
              >
                <option value="ACTUAL_FREIGHT">
                  Actual Freight After Packing
                </option>

                <option value="FLAT">
                  Flat Delivery Charge
                </option>
              </select>
            </label>

            {form.resellerDeliveryMode ===
            "FLAT" ? (
              <label className="mt-4 block text-xs font-black">
                Flat Charge ₹

                <input
                  type="number"
                  min="0"
                  value={
                    form.resellerFlatDeliveryCharge
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      resellerFlatDeliveryCharge:
                        Number(
                          e.target.value,
                        ),
                    })
                  }
                  className="mt-2 w-full rounded-2xl border p-3"
                />
              </label>
            ) : (
              <div className="mt-4 rounded-2xl bg-violet-50 p-4">
                <p className="text-sm font-black text-violet-800">
                  Actual Freight
                </p>

                <p className="mt-1 text-xs leading-5 text-violet-700">
                  Parcel pack ayyaka weight + destination batti admin final courier/transport charge enter chestaru.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-black">
              Bulk Checkout Message
            </h2>

            <textarea
              rows={4}
              value={
                form.bulkFreightMessage
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  bulkFreightMessage:
                    e.target.value,
                })
              }
              className="mt-4 w-full rounded-2xl border p-4 text-sm"
            />
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-black">
              Estimated Delivery
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <input
                type="number"
                min="0"
                value={
                  form.estimatedMinDays
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    estimatedMinDays:
                      Number(
                        e.target.value,
                      ),
                  })
                }
                className="rounded-2xl border p-3"
                placeholder="Min days"
              />

              <input
                type="number"
                min="0"
                value={
                  form.estimatedMaxDays
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    estimatedMaxDays:
                      Number(
                        e.target.value,
                      ),
                  })
                }
                className="rounded-2xl border p-3"
                placeholder="Max days"
              />
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
            <label className="flex items-center gap-3 font-black">
              <input
                type="checkbox"
                checked={
                  form.restrictServiceability
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    restrictServiceability:
                      e.target.checked,
                  })
                }
                className="h-5 w-5"
              />

              Restrict serviceable areas
            </label>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <textarea
                rows={6}
                value={states}
                onChange={(e) =>
                  setStates(
                    e.target.value,
                  )
                }
                placeholder={"Allowed states\nAndhra Pradesh\nTelangana"}
                className="rounded-2xl border p-4"
              />

              <textarea
                rows={6}
                value={pincodes}
                onChange={(e) =>
                  setPincodes(
                    e.target.value,
                  )
                }
                placeholder={"Allowed pincodes\n522001\n522002"}
                className="rounded-2xl border p-4"
              />
            </div>
          </section>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-6 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Delivery Settings"}
        </button>
      </div>
    </main>
  );
}

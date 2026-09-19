"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type BulkDeliveryService = {
  id: string;
  type:
    | "PARCEL"
    | "TRANSPORT";
  name: string;
  phone: string;
  branch: string;
  serviceArea: string;
  notes: string;
  isActive: boolean;
};

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

  const [
    bulkServices,
    setBulkServices,
  ] =
    useState<
      BulkDeliveryService[]
    >([]);

  const [
    bulkSaving,
    setBulkSaving,
  ] = useState(false);

  const [
    bulkDraft,
    setBulkDraft,
  ] =
    useState<
      BulkDeliveryService
    >({
      id: "",
      type: "PARCEL",
      name: "",
      phone: "",
      branch: "",
      serviceArea: "",
      notes: "",
      isActive: true,
    });

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

        const bulkResponse =
          await fetch(
            "/api/admin/bulk-delivery-services",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        if (bulkResponse.ok) {
          const bulkData =
            await bulkResponse.json();

          setBulkServices(
            Array.isArray(
              bulkData.services,
            )
              ? bulkData.services
              : [],
          );
        }

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

  async function saveBulkServices(
    services:
      BulkDeliveryService[],
    successMessage:
      string,
  ) {
    try {
      setBulkSaving(true);
      setMessage("");

      const response =
        await fetch(
          "/api/admin/bulk-delivery-services",
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
                services,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Bulk delivery save failed.",
        );
      }

      setBulkServices(
        Array.isArray(
          data.services,
        )
          ? data.services
          : [],
      );

      setMessage(
        successMessage,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Bulk delivery save failed.",
      );
    } finally {
      setBulkSaving(false);
    }
  }

  async function addBulkService() {
    const name =
      bulkDraft.name.trim();

    if (!name) {
      setMessage(
        "Enter parcel service / transport agency name.",
      );
      return;
    }

    const service = {
      ...bulkDraft,
      id:
        bulkDraft.id ||
        crypto.randomUUID(),
      name,
      phone:
        bulkDraft.phone.trim(),
      branch:
        bulkDraft.branch.trim(),
      serviceArea:
        bulkDraft.serviceArea.trim(),
      notes:
        bulkDraft.notes.trim(),
    };

    await saveBulkServices(
      [
        ...bulkServices,
        service,
      ],
      "Bulk delivery service added.",
    );

    setBulkDraft({
      id: "",
      type: "PARCEL",
      name: "",
      phone: "",
      branch: "",
      serviceArea: "",
      notes: "",
      isActive: true,
    });
  }

  async function toggleBulkService(
    id: string,
  ) {
    await saveBulkServices(
      bulkServices.map(
        (service) =>
          service.id === id
            ? {
                ...service,
                isActive:
                  !service.isActive,
              }
            : service,
      ),
      "Bulk delivery service updated.",
    );
  }

  async function removeBulkService(
    id: string,
  ) {
    await saveBulkServices(
      bulkServices.filter(
        (service) =>
          service.id !== id,
      ),
      "Bulk delivery service removed.",
    );
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
          AS FASHIONS
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

          <section className="rounded-3xl border border-[#E4D7C4] bg-[#FFFDF9] p-6 shadow-sm lg:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-[#6B5435]">
                  Reseller / Bulk Logistics
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Parcel Services & Transport Agencies
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#7B7066]">
                  Bulk orders ki parcel service ledha transport agency ni manual ga add cheyyandi. Packing ayyaka order screen lo service select chesi LR / tracking number enter cheyochu.
                </p>
              </div>

              <span className="rounded-full bg-[#031B14] px-3 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-[#FFFDF9]">
                {bulkServices.filter(
                  (item) =>
                    item.isActive,
                ).length} Active
              </span>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <label className="text-xs font-black">
                Service Type

                <select
                  value={bulkDraft.type}
                  onChange={(e) =>
                    setBulkDraft({
                      ...bulkDraft,
                      type:
                        e.target.value as BulkDeliveryService["type"],
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-[#E4D7C4] bg-white p-3 outline-none focus:border-[#D4AF37]"
                >
                  <option value="PARCEL">
                    Parcel / Courier Service
                  </option>

                  <option value="TRANSPORT">
                    Transport Agency
                  </option>
                </select>
              </label>

              <label className="text-xs font-black">
                Service / Agency Name

                <input
                  value={bulkDraft.name}
                  onChange={(e) =>
                    setBulkDraft({
                      ...bulkDraft,
                      name:
                        e.target.value,
                    })
                  }
                  placeholder="Ex: VRL Logistics / Local Parcel Service"
                  className="mt-2 w-full rounded-2xl border border-[#E4D7C4] bg-white p-3 outline-none focus:border-[#D4AF37]"
                />
              </label>

              <label className="text-xs font-black">
                Contact Number

                <input
                  value={bulkDraft.phone}
                  onChange={(e) =>
                    setBulkDraft({
                      ...bulkDraft,
                      phone:
                        e.target.value,
                    })
                  }
                  placeholder="Optional"
                  className="mt-2 w-full rounded-2xl border border-[#E4D7C4] bg-white p-3 outline-none focus:border-[#D4AF37]"
                />
              </label>

              <label className="text-xs font-black">
                Branch / Booking Point

                <input
                  value={bulkDraft.branch}
                  onChange={(e) =>
                    setBulkDraft({
                      ...bulkDraft,
                      branch:
                        e.target.value,
                    })
                  }
                  placeholder="Ex: Guntur Main Branch"
                  className="mt-2 w-full rounded-2xl border border-[#E4D7C4] bg-white p-3 outline-none focus:border-[#D4AF37]"
                />
              </label>

              <label className="text-xs font-black lg:col-span-2">
                Service Area / Route

                <input
                  value={bulkDraft.serviceArea}
                  onChange={(e) =>
                    setBulkDraft({
                      ...bulkDraft,
                      serviceArea:
                        e.target.value,
                    })
                  }
                  placeholder="Ex: AP & Telangana / Hyderabad route"
                  className="mt-2 w-full rounded-2xl border border-[#E4D7C4] bg-white p-3 outline-none focus:border-[#D4AF37]"
                />
              </label>

              <label className="text-xs font-black lg:col-span-2">
                Notes

                <textarea
                  rows={3}
                  value={bulkDraft.notes}
                  onChange={(e) =>
                    setBulkDraft({
                      ...bulkDraft,
                      notes:
                        e.target.value,
                    })
                  }
                  placeholder="Booking timings, contact person, special instructions..."
                  className="mt-2 w-full rounded-2xl border border-[#E4D7C4] bg-white p-3 outline-none focus:border-[#D4AF37]"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={addBulkService}
              disabled={bulkSaving}
              className="mt-4 rounded-2xl bg-[#031B14] px-5 py-3 text-xs font-black text-[#FFFDF9] disabled:opacity-50"
            >
              {bulkSaving
                ? "Saving..."
                : bulkDraft.type ===
                    "TRANSPORT"
                  ? "+ Add Transport Agency"
                  : "+ Add Parcel Service"}
            </button>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {bulkServices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D9C29A] bg-[#FAF7F0] p-5 text-sm text-[#7B7066] lg:col-span-2">
                  No bulk parcel / transport services added yet.
                </div>
              ) : (
                bulkServices.map(
                  (service) => (
                    <article
                      key={service.id}
                      className="rounded-2xl border border-[#E4D7C4] bg-[#FAF7F0] p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#031B14] px-2.5 py-1 text-[8px] font-black uppercase text-[#FFFDF9]">
                          {service.type ===
                          "TRANSPORT"
                            ? "Transport"
                            : "Parcel"}
                        </span>

                        <span
                          className={
                            "rounded-full px-2.5 py-1 text-[8px] font-black uppercase " +
                            (service.isActive
                              ? "bg-[#F4EBDD] text-[#6B5435]"
                              : "bg-zinc-200 text-zinc-500")
                          }
                        >
                          {service.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>

                      <h3 className="mt-3 text-sm font-black">
                        {service.name}
                      </h3>

                      {service.branch && (
                        <p className="mt-1 text-xs text-[#7B7066]">
                          Branch: {service.branch}
                        </p>
                      )}

                      {service.phone && (
                        <p className="mt-1 text-xs text-[#7B7066]">
                          Contact: {service.phone}
                        </p>
                      )}

                      {service.serviceArea && (
                        <p className="mt-1 text-xs text-[#7B7066]">
                          Route: {service.serviceArea}
                        </p>
                      )}

                      {service.notes && (
                        <p className="mt-2 text-[11px] leading-5 text-[#9A9188]">
                          {service.notes}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            toggleBulkService(
                              service.id,
                            )
                          }
                          disabled={bulkSaving}
                          className="rounded-xl border border-[#D9C29A] bg-white px-3 py-2 text-[9px] font-black"
                        >
                          {service.isActive
                            ? "Disable"
                            : "Enable"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeBulkService(
                              service.id,
                            )
                          }
                          disabled={bulkSaving}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[9px] font-black text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  ),
                )
              )}
            </div>
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

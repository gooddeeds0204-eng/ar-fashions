"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  gstNumber: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  notes: string | null;

  leadTimeDays: number;
  minimumOrderQty: number;
  minimumOrderValue: number;

  isActive: boolean;
  purchaseOrderCount: number;
  totalPurchaseValue: number;
  orderedPieces: number;
  receivedPieces: number;
  pendingPieces: number;
  activeIncomingPOCount: number;
  draftPOCount: number;
  receivedPOCount: number;
  cancelledPOCount: number;
  lastPurchaseAt: string | null;

  purchaseHistory: Array<{
    id: string;
    poNumber: string;
    status: string;
    subtotal: number;
    orderedPieces: number;
    receivedPieces: number;
    pendingPieces: number;
    expectedAt: string | null;
    orderedAt: string | null;
    receivedAt: string | null;
    createdAt: string;
  }>;

  createdAt: string;
  updatedAt: string;
};

const emptyForm = {
  name: "",
  contactName: "",
  phone: "",
  whatsapp: "",
  email: "",
  gstNumber: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  notes: "",

  leadTimeDays: "7",
  minimumOrderQty: "1",
  minimumOrderValue: "0",
};

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(value || 0);
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "No purchases yet";
  }

  return new Date(
    value,
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function poStatusClass(
  status: string,
) {
  if (status === "RECEIVED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status === "ORDERED" ||
    status === "PARTIALLY_RECEIVED"
  ) {
    return "bg-sky-50 text-sky-700";
  }

  if (status === "CANCELLED") {
    return "bg-red-50 text-red-600";
  }

  return "bg-slate-100 text-slate-600";
}

export default function SuppliersPage() {
  const router =
    useRouter();

  const [
    suppliers,
    setSuppliers,
  ] =
    useState<Supplier[]>(
      [],
    );

  const [
    form,
    setForm,
  ] = useState(
    emptyForm,
  );

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    expandedSupplierId,
    setExpandedSupplierId,
  ] = useState<
    string | null
  >(null);

  async function loadSuppliers() {
    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/admin/suppliers",
          {
            cache:
              "no-store",
            credentials:
              "same-origin",
          },
        );

      if (
        response.status ===
        401
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
          data.error ??
            "Failed to load suppliers.",
        );
      }

      setSuppliers(
        Array.isArray(
          data.suppliers,
        )
          ? data.suppliers
          : [],
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load suppliers.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSuppliers();
  }, []);

  const visibleSuppliers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return suppliers;
      }

      return suppliers.filter(
        (supplier) =>
          [
            supplier.name,
            supplier.contactName,
            supplier.phone,
            supplier.whatsapp,
            supplier.email,
            supplier.gstNumber,
            supplier.city,
            supplier.state,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
      );
    }, [
      search,
      suppliers,
    ]);

  const activeCount =
    suppliers.filter(
      (supplier) =>
        supplier.isActive,
    ).length;

  const totalPOs =
    suppliers.reduce(
      (total, supplier) =>
        total +
        supplier.purchaseOrderCount,
      0,
    );

  const totalPurchaseValue =
    suppliers.reduce(
      (total, supplier) =>
        total +
        supplier.totalPurchaseValue,
      0,
    );

  function resetForm() {
    setForm(
      emptyForm,
    );

    setEditingId(
      null,
    );
  }

  function editSupplier(
    supplier: Supplier,
  ) {
    setEditingId(
      supplier.id,
    );

    setForm({
      name:
        supplier.name,
      contactName:
        supplier.contactName ??
        "",
      phone:
        supplier.phone ??
        "",
      whatsapp:
        supplier.whatsapp ??
        "",
      email:
        supplier.email ??
        "",
      gstNumber:
        supplier.gstNumber ??
        "",
      addressLine:
        supplier.addressLine ??
        "",
      city:
        supplier.city ??
        "",
      state:
        supplier.state ??
        "",
      pincode:
        supplier.pincode ??
        "",
      notes:
        supplier.notes ??
        "",

      leadTimeDays:
        String(
          supplier.leadTimeDays,
        ),

      minimumOrderQty:
        String(
          supplier.minimumOrderQty,
        ),

      minimumOrderValue:
        String(
          supplier.minimumOrderValue,
        ),
    });

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  async function saveSupplier(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      form.name
        .trim()
        .length < 2
    ) {
      setMessage(
        "Supplier name is required.",
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response =
        await fetch(
          "/api/admin/suppliers",
          {
            method:
              editingId
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                ...(editingId
                  ? {
                      id:
                        editingId,
                    }
                  : {}),
                ...form,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to save supplier.",
        );
      }

      setMessage(
        editingId
          ? "Supplier updated successfully."
          : "Supplier created successfully.",
      );

      resetForm();

      await loadSuppliers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save supplier.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSupplier(
    supplier: Supplier,
  ) {
    try {
      const response =
        await fetch(
          "/api/admin/suppliers",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                id:
                  supplier.id,

                isActive:
                  !supplier.isActive,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update supplier status.",
        );
      }

      setMessage(
        supplier.isActive
          ? "Supplier deactivated."
          : "Supplier activated.",
      );

      await loadSuppliers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update supplier.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/admin",
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
        >
          ← Dashboard
        </button>

        <div className="mt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
            AR FASHIONS
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Suppliers
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage vendors used for purchase orders and inventory restocking.
          </p>
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Suppliers"
            value={
              suppliers.length
            }
          />

          <SummaryCard
            label="Active"
            value={
              activeCount
            }
          />

          <SummaryCard
            label="Purchase Orders"
            value={
              totalPOs
            }
          />

          <SummaryCard
            label="Purchase Value"
            value={
              money(
                totalPurchaseValue,
              )
            }
          />
        </section>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
            {message}
          </div>
        ) : null}

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Supplier Profile
              </p>

              <h2 className="mt-1 text-xl font-black">
                {editingId
                  ? "Edit Supplier"
                  : "Add Supplier"}
              </h2>
            </div>

            {editingId ? (
              <button
                type="button"
                onClick={
                  resetForm
                }
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <form
            onSubmit={
              saveSupplier
            }
            className="mt-5 grid gap-4 md:grid-cols-2"
          >
            <Field
              label="Supplier / Business Name *"
              value={
                form.name
              }
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  name: value,
                })
              }
            />

            <Field
              label="Contact Person"
              value={
                form.contactName
              }
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  contactName:
                    value,
                })
              }
            />

            <Field
              label="Phone"
              value={
                form.phone
              }
              inputMode="tel"
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  phone: value,
                })
              }
            />

            <Field
              label="WhatsApp"
              value={
                form.whatsapp
              }
              inputMode="tel"
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  whatsapp:
                    value,
                })
              }
            />

            <Field
              label="Email"
              value={
                form.email
              }
              inputMode="email"
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  email: value,
                })
              }
            />

            <Field
              label="GSTIN"
              value={
                form.gstNumber
              }
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  gstNumber:
                    value.toUpperCase(),
                })
              }
            />

            <div className="md:col-span-2">
              <Field
                label="Address"
                value={
                  form.addressLine
                }
                onChange={(
                  value,
                ) =>
                  setForm({
                    ...form,
                    addressLine:
                      value,
                  })
                }
              />
            </div>

            <Field
              label="City"
              value={
                form.city
              }
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  city: value,
                })
              }
            />

            <Field
              label="State"
              value={
                form.state
              }
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  state: value,
                })
              }
            />

            <Field
              label="Pincode"
              value={
                form.pincode
              }
              inputMode="numeric"
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  pincode: value,
                })
              }
            />

            <Field
              label="Lead Time (Days)"
              value={
                form.leadTimeDays
              }
              inputMode="numeric"
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  leadTimeDays:
                    value,
                })
              }
            />

            <Field
              label="Minimum Order Qty (pcs)"
              value={
                form.minimumOrderQty
              }
              inputMode="numeric"
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  minimumOrderQty:
                    value,
                })
              }
            />

            <Field
              label="Minimum Order Value (₹)"
              value={
                form.minimumOrderValue
              }
              inputMode="decimal"
              onChange={(
                value,
              ) =>
                setForm({
                  ...form,
                  minimumOrderValue:
                    value,
                })
              }
            />

            <div className="md:col-span-2">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Notes
                </span>

                <textarea
                  value={
                    form.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      notes:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:bg-white"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={
                saving
              }
              className="md:col-span-2 rounded-2xl bg-[#06261c] px-5 py-4 text-xs font-black uppercase tracking-[0.1em] text-white disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Supplier Changes"
                  : "Add Supplier"}
            </button>
          </form>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            value={
              search
            }
            onChange={(
              event,
            ) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search supplier, phone, GST, city..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:bg-white"
          />
        </section>

        <section className="mt-5">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-black text-slate-500">
              Loading suppliers...
            </div>
          ) : visibleSuppliers.length ===
            0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-lg font-black">
                No suppliers found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Add your first supplier above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleSuppliers.map(
                (supplier) => (
                  <article
                    key={
                      supplier.id
                    }
                    className={`rounded-[1.75rem] border bg-white p-5 shadow-sm ${
                      supplier.isActive
                        ? "border-slate-200"
                        : "border-slate-200 opacity-65"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${
                            supplier.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {supplier.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>

                        <h2 className="mt-3 text-lg font-black">
                          {
                            supplier.name
                          }
                        </h2>

                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                          {supplier.contactName ||
                            "No contact person"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-black">
                          {
                            supplier.purchaseOrderCount
                          }
                        </p>

                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                          POs
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Info
                        label="Phone"
                        value={
                          supplier.phone ||
                          "—"
                        }
                      />

                      <Info
                        label="WhatsApp"
                        value={
                          supplier.whatsapp ||
                          "—"
                        }
                      />

                      <Info
                        label="GSTIN"
                        value={
                          supplier.gstNumber ||
                          "—"
                        }
                      />

                      <Info
                        label="Location"
                        value={
                          [
                            supplier.city,
                            supplier.state,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(", ") ||
                          "—"
                        }
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Info
                        label="Purchase Value"
                        value={
                          money(
                            supplier.totalPurchaseValue,
                          )
                        }
                      />

                      <Info
                        label="Received"
                        value={`${supplier.receivedPieces} pcs`}
                      />

                      <Info
                        label="Pending"
                        value={`${supplier.pendingPieces} pcs`}
                      />

                      <Info
                        label="Incoming POs"
                        value={String(
                          supplier.activeIncomingPOCount,
                        )}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Info
                        label="Lead Time"
                        value={`${supplier.leadTimeDays} days`}
                      />

                      <Info
                        label="MOQ"
                        value={`${supplier.minimumOrderQty} pcs`}
                      />

                      <Info
                        label="Min PO"
                        value={
                          money(
                            supplier.minimumOrderValue,
                          )
                        }
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Info
                        label="Last Purchase"
                        value={
                          formatDate(
                            supplier.lastPurchaseAt,
                          )
                        }
                      />

                      <Info
                        label="PO Status"
                        value={`Draft ${supplier.draftPOCount} · Received ${supplier.receivedPOCount} · Cancelled ${supplier.cancelledPOCount}`}
                      />
                    </div>

                    {supplier.addressLine ? (
                      <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                          Address
                        </p>

                        <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-600">
                          {
                            supplier.addressLine
                          }
                          {supplier.pincode
                            ? ` · ${supplier.pincode}`
                            : ""}
                        </p>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSupplierId(
                          expandedSupplierId ===
                            supplier.id
                            ? null
                            : supplier.id,
                        )
                      }
                      className="mt-4 w-full rounded-xl bg-[#06261c] px-4 py-3 text-[10px] font-black uppercase tracking-[0.08em] text-white"
                    >
                      {expandedSupplierId ===
                      supplier.id
                        ? "Hide Purchase History"
                        : "View Purchase History"}
                    </button>

                    {expandedSupplierId ===
                      supplier.id ? (
                      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                            Purchase History
                          </p>

                          <p className="mt-1 text-[10px] font-semibold text-slate-400">
                            Latest purchase orders from this supplier
                          </p>
                        </div>

                        {supplier.purchaseHistory.length ===
                        0 ? (
                          <div className="p-5 text-center text-xs font-bold text-slate-400">
                            No purchase orders yet.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {supplier.purchaseHistory.map(
                              (po) => (
                                <div
                                  key={
                                    po.id
                                  }
                                  className="p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-[11px] font-black text-slate-900">
                                          {
                                            po.poNumber
                                          }
                                        </p>

                                        <span
                                          className={`rounded-full px-2 py-1 text-[7px] font-black uppercase ${poStatusClass(
                                            po.status,
                                          )}`}
                                        >
                                          {po.status.replaceAll(
                                            "_",
                                            " ",
                                          )}
                                        </span>
                                      </div>

                                      <p className="mt-1 text-[9px] font-semibold text-slate-400">
                                        {formatDate(
                                          po.createdAt,
                                        )}
                                      </p>
                                    </div>

                                    <p className="shrink-0 text-sm font-black">
                                      {money(
                                        po.subtotal,
                                      )}
                                    </p>
                                  </div>

                                  <div className="mt-3 grid grid-cols-3 gap-2">
                                    <Info
                                      label="Ordered"
                                      value={`${po.orderedPieces}`}
                                    />

                                    <Info
                                      label="Received"
                                      value={`${po.receivedPieces}`}
                                    />

                                    <Info
                                      label="Pending"
                                      value={`${po.pendingPieces}`}
                                    />
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              "/admin/purchase-orders",
                            )
                          }
                          className="w-full border-t border-slate-100 bg-slate-50 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-emerald-700"
                        >
                          Open All Purchase Orders →
                        </button>
                      </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          editSupplier(
                            supplier,
                          )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-[10px] font-black"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleSupplier(
                            supplier,
                          )
                        }
                        className={`rounded-xl px-3 py-3 text-[10px] font-black ${
                          supplier.isActive
                            ? "bg-red-50 text-red-600"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {supplier.isActive
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  inputMode?:
    | "text"
    | "tel"
    | "email"
    | "numeric"
    | "decimal";
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <input
        value={
          value
        }
        inputMode={
          inputMode
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:bg-white"
      />
    </label>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value:
    number | string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-[10px] font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}

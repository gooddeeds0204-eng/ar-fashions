"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  resellerOnly: boolean;
};

type FormState = {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minOrderValue: string;
  maxDiscount: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  resellerOnly: boolean;
};

const emptyForm: FormState = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minOrderValue: "",
  maxDiscount: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
  resellerOnly: false,
};

function dateInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000,
  );

  return local
    .toISOString()
    .slice(0, 16);
}

function money(value: number | null) {
  if (value === null) return "—";

  return `₹${value.toLocaleString("en-IN")}`;
}

export default function AdminCouponsPage() {
  const router = useRouter();

  const [coupons, setCoupons] =
    useState<Coupon[]>([]);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  async function loadCoupons() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/coupons",
        {
          cache: "no-store",
          credentials: "same-origin",
        },
      );

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to load coupons.",
        );
      }

      setCoupons(
        Array.isArray(data.coupons)
          ? data.coupons.map(
              (coupon: Coupon) => ({
                ...coupon,
                discountValue: Number(
                  coupon.discountValue,
                ),
                minOrderValue:
                  coupon.minOrderValue === null
                    ? null
                    : Number(
                        coupon.minOrderValue,
                      ),
                maxDiscount:
                  coupon.maxDiscount === null
                    ? null
                    : Number(
                        coupon.maxDiscount,
                      ),
              }),
            )
          : [],
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load coupons.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  function editCoupon(coupon: Coupon) {
    setEditingId(coupon.id);

    setForm({
      code: coupon.code,
      discountType:
        coupon.discountType,
      discountValue: String(
        coupon.discountValue,
      ),
      minOrderValue:
        coupon.minOrderValue === null
          ? ""
          : String(
              coupon.minOrderValue,
            ),
      maxDiscount:
        coupon.maxDiscount === null
          ? ""
          : String(
              coupon.maxDiscount,
            ),
      startsAt:
        dateInput(coupon.startsAt),
      expiresAt:
        dateInput(coupon.expiresAt),
      isActive: coupon.isActive,
      resellerOnly:
        coupon.resellerOnly,
    });

    requestAnimationFrame(() => {
      document
        .getElementById("coupon-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveCoupon(
    event: FormEvent,
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      const response = await fetch(
        "/api/admin/coupons",
        {
          method: editingId
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            ...(editingId
              ? { id: editingId }
              : {}),
            ...form,
          }),
        },
      );

      const data =
        await response.json();

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to save coupon.",
        );
      }

      resetForm();
      await loadCoupons();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save coupon.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(
    coupon: Coupon,
  ) {
    try {
      const response = await fetch(
        "/api/admin/coupons",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            id: coupon.id,
            isActive:
              !coupon.isActive,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update coupon.",
        );
      }

      await loadCoupons();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update coupon.",
      );
    }
  }

  async function deleteCoupon(
    coupon: Coupon,
  ) {
    if (
      !confirm(
        `Delete coupon ${coupon.code}?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        "/api/admin/coupons",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            id: coupon.id,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to delete coupon.",
        );
      }

      await loadCoupons();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete coupon.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-zinc-900">
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <button
            onClick={() =>
              router.push("/admin")
            }
            className="rounded-xl px-3 py-2 font-bold"
          >
            ←
          </button>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-400">
              AR Fashions Admin
            </p>
            <h1 className="text-lg font-black">
              Coupons & Offers
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <form
          id="coupon-form"
          onSubmit={saveCoupon}
          className="rounded-3xl bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">
              {editingId
                ? "Edit Coupon"
                : "Create Coupon"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-zinc-500"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <input
              required
              value={form.code}
              onChange={(e) =>
                setForm({
                  ...form,
                  code:
                    e.target.value.toUpperCase(),
                })
              }
              placeholder="Coupon code — SAVE20"
              className="rounded-xl border px-4 py-3 text-sm font-bold"
            />

            <select
              value={form.discountType}
              onChange={(e) =>
                setForm({
                  ...form,
                  discountType:
                    e.target.value as
                      | "PERCENTAGE"
                      | "FIXED",
                })
              }
              className="rounded-xl border px-4 py-3 text-sm font-bold"
            >
              <option value="PERCENTAGE">
                Percentage %
              </option>
              <option value="FIXED">
                Fixed ₹
              </option>
            </select>

            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.discountValue}
              onChange={(e) =>
                setForm({
                  ...form,
                  discountValue:
                    e.target.value,
                })
              }
              placeholder="Discount value"
              className="rounded-xl border px-4 py-3 text-sm"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.minOrderValue}
              onChange={(e) =>
                setForm({
                  ...form,
                  minOrderValue:
                    e.target.value,
                })
              }
              placeholder="Minimum order value"
              className="rounded-xl border px-4 py-3 text-sm"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.maxDiscount}
              onChange={(e) =>
                setForm({
                  ...form,
                  maxDiscount:
                    e.target.value,
                })
              }
              placeholder="Maximum discount"
              className="rounded-xl border px-4 py-3 text-sm"
            />

            <div />

            <label className="text-xs font-bold text-zinc-500">
              Starts At
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) =>
                  setForm({
                    ...form,
                    startsAt:
                      e.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl border px-4 py-3 text-sm text-zinc-900"
              />
            </label>

            <label className="text-xs font-bold text-zinc-500">
              Expires At
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm({
                    ...form,
                    expiresAt:
                      e.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl border px-4 py-3 text-sm text-zinc-900"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isActive:
                      e.target.checked,
                  })
                }
              />
              Active
            </label>

            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={
                  form.resellerOnly
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    resellerOnly:
                      e.target.checked,
                  })
                }
              />
              Reseller Only
            </label>
          </div>

          <button
            disabled={saving}
            className="mt-6 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Coupon"
                : "Create Coupon"}
          </button>
        </form>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">
              Existing Coupons
            </h2>

            <span className="text-xs text-zinc-500">
              {coupons.length} total
            </span>
          </div>

          {loading ? (
            <div className="mt-4 rounded-3xl bg-white p-8 text-center">
              Loading coupons...
            </div>
          ) : coupons.length === 0 ? (
            <div className="mt-4 rounded-3xl bg-white p-8 text-center text-sm text-zinc-500">
              No coupons created yet.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {coupons.map(
                (coupon) => (
                  <article
                    key={coupon.id}
                    className="rounded-3xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black">
                          {coupon.code}
                        </h3>

                        <p className="mt-1 text-sm font-bold text-emerald-700">
                          {coupon.discountType ===
                          "PERCENTAGE"
                            ? `${coupon.discountValue}% OFF`
                            : `${money(
                                coupon.discountValue,
                              )} OFF`}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black ${
                          coupon.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {coupon.isActive
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-2xl bg-zinc-50 p-3">
                        <p className="text-zinc-400">
                          Min Order
                        </p>
                        <p className="mt-1 font-black">
                          {money(
                            coupon.minOrderValue,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-zinc-50 p-3">
                        <p className="text-zinc-400">
                          Max Discount
                        </p>
                        <p className="mt-1 font-black">
                          {money(
                            coupon.maxDiscount,
                          )}
                        </p>
                      </div>
                    </div>

                    {coupon.resellerOnly && (
                      <p className="mt-3 text-xs font-bold text-blue-700">
                        Reseller orders only
                      </p>
                    )}

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          editCoupon(coupon);
                        }}
                        className="touch-manipulation rounded-xl bg-zinc-100 px-3 py-3 text-xs font-black"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleActive(
                            coupon,
                          )
                        }
                        className="rounded-xl bg-amber-50 px-3 py-3 text-xs font-black text-amber-700"
                      >
                        {coupon.isActive
                          ? "Disable"
                          : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteCoupon(
                            coupon,
                          )
                        }
                        className="rounded-xl bg-red-50 px-3 py-3 text-xs font-black text-red-700"
                      >
                        Delete
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

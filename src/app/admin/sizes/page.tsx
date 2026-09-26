"use client";

import { useEffect, useMemo, useState } from "react";

type Size = {
  id: string;
  name: string;
  category: string | null;
  sizeType: string | null;
  inches: string | null;
  ageGuide?: string | null;
  heightCm?: string | null;
  chestIn?: string | null;
  waistIn?: string | null;
  hipIn?: string | null;
  garmentLengthIn?: string | null;
  fitNote?: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: {
    variants: number;
  };
};

const emptyForm = {
  name: "",
  category: "Kids",
  sizeType: "AGE",
  inches: "",
  ageGuide: "",
  heightCm: "",
  chestIn: "",
  waistIn: "",
  hipIn: "",
  garmentLengthIn: "",
  fitNote: "",
  sortOrder: "0",
  isActive: true,
};

export default function SizesPage() {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSizes() {
    setLoading(true);

    try {
      const response = await fetch("/api/sizes", {
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to load sizes",
        );
      }

      setSizes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("Sizes load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSizes();
  }, []);

  const filteredSizes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return sizes;

    return sizes.filter((size) =>
      [
        size.name,
        size.category ?? "",
        size.sizeType ?? "",
        size.inches ?? "",
        size.ageGuide ?? "",
        size.heightCm ?? "",
        size.chestIn ?? "",
        size.waistIn ?? "",
        size.hipIn ?? "",
        size.garmentLengthIn ?? "",
        size.fitNote ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [sizes, search]);

  const kidsSizes = useMemo(
    () =>
      sizes
        .filter(
          (size) =>
            size.category?.toLowerCase() === "kids",
        )
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder ||
            a.name.localeCompare(b.name),
        ),
    [sizes],
  );

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(size: Size) {
    setEditingId(size.id);

    setForm({
      name: size.name,
      category: size.category ?? "",
      sizeType: size.sizeType ?? "",
      inches: size.inches ?? "",
      ageGuide: size.ageGuide ?? "",
      heightCm: size.heightCm ?? "",
      chestIn: size.chestIn ?? "",
      waistIn: size.waistIn ?? "",
      hipIn: size.hipIn ?? "",
      garmentLengthIn:
        size.garmentLengthIn ?? "",
      fitNote: size.fitNote ?? "",
      sortOrder: String(size.sortOrder),
      isActive: size.isActive,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveSize(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Size name required");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/sizes", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...(editingId
            ? { id: editingId }
            : {}),
          name: form.name.trim(),
          category:
            form.category.trim() || null,
          sizeType:
            form.sizeType.trim() || null,
          inches:
            form.inches.trim() || null,
          ageGuide:
            form.ageGuide.trim() || null,
          heightCm:
            form.heightCm.trim() || null,
          chestIn:
            form.chestIn.trim() || null,
          waistIn:
            form.waistIn.trim() || null,
          hipIn:
            form.hipIn.trim() || null,
          garmentLengthIn:
            form.garmentLengthIn.trim() || null,
          fitNote:
            form.fitNote.trim() || null,
          sortOrder: Number(
            form.sortOrder || 0,
          ),
          isActive: form.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ?? "Size save failed",
        );
        return;
      }

      resetForm();
      await loadSizes();

      alert(
        editingId
          ? "Size updated successfully"
          : "Size added successfully",
      );
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(size: Size) {
    try {
      const response = await fetch("/api/sizes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: size.id,
          isActive: !size.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ?? "Update failed",
        );
        return;
      }

      await loadSizes();
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  }

  async function deleteSize(size: Size) {
    const confirmed = window.confirm(
      `Delete "${size.name}"?`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/sizes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: size.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ?? "Delete failed",
        );
        return;
      }

      await loadSizes();

      alert(
        data.message ?? "Size deleted",
      );
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  }

  const isKids =
    form.category.trim().toLowerCase() ===
    "kids";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Catalog Management
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Sizes & Kids Fit Guide
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Kids ki age ni reference ga maatrame use cheyyandi.
            Correct fit kosam height, chest, waist and other body
            measurements maintain cheyyandi.
          </p>
        </div>

        <form
          onSubmit={saveSize}
          className="mb-8 rounded-3xl border border-white/10 bg-white/[0.05] p-5 sm:p-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                {editingId
                  ? "Edit Size"
                  : "Add New Size"}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Reusable size + optional kids measurement guide.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Field
              label="Size Label *"
              value={form.name}
              onChange={(value) =>
                setForm({
                  ...form,
                  name: value,
                })
              }
              placeholder="28 / 15-16Y / XL"
            />

            <div>
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={(event) => {
                  const category =
                    event.target.value;

                  setForm({
                    ...form,
                    category,
                    sizeType:
                      category === "Kids"
                        ? "AGE"
                        : form.sizeType ===
                            "AGE"
                          ? "LETTER"
                          : form.sizeType,
                  });
                }}
                className={inputClass}
              >
                <option value="Kids">
                  Kids
                </option>
                <option value="Adult">
                  Adult
                </option>
                <option value="Clothing">
                  Clothing / Free Size
                </option>
              </select>
            </div>

            <div>
              <Label>Size Type</Label>
              <select
                value={form.sizeType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    sizeType:
                      event.target.value,
                  })
                }
                className={inputClass}
              >
                <option value="AGE">
                  Age
                </option>
                <option value="NUMERIC">
                  Numeric
                </option>
                <option value="LETTER">
                  Letter
                </option>
                <option value="GENERAL">
                  General / Free
                </option>
              </select>
            </div>

            <Field
              label="Legacy Height / Inches"
              value={form.inches}
              onChange={(value) =>
                setForm({
                  ...form,
                  inches: value,
                })
              }
              placeholder="Optional"
            />

            <Field
              label="Sort Order"
              value={form.sortOrder}
              onChange={(value) =>
                setForm({
                  ...form,
                  sortOrder: value,
                })
              }
              placeholder="0"
              type="number"
            />
          </div>

          {isKids && (
            <section className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4 sm:p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  Kids Fit Measurements
                </p>

                <h3 className="mt-1 text-lg font-bold">
                  Measurement-based sizing
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Age is only a guide. Customer actual body
                  measurements tho compare chesi size select chestaru.
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field
                  label="Age Guide"
                  value={form.ageGuide}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      ageGuide: value,
                    })
                  }
                  placeholder="Example: 7-8Y"
                />

                <Field
                  label="Child Height (cm)"
                  value={form.heightCm}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      heightCm: value,
                    })
                  }
                  placeholder="Example: 122-128"
                />

                <Field
                  label="Chest (in)"
                  value={form.chestIn}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      chestIn: value,
                    })
                  }
                  placeholder="Example: 26-27"
                />

                <Field
                  label="Waist (in)"
                  value={form.waistIn}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      waistIn: value,
                    })
                  }
                  placeholder="Example: 23-24"
                />

                <Field
                  label="Hip (in)"
                  value={form.hipIn}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      hipIn: value,
                    })
                  }
                  placeholder="Optional"
                />

                <Field
                  label="Garment Length (in)"
                  value={
                    form.garmentLengthIn
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      garmentLengthIn:
                        value,
                    })
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="mt-4">
                <Label>Fit Note</Label>
                <textarea
                  value={form.fitNote}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      fitNote:
                        event.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Example: Regular fit. For a relaxed fit, choose one size up."
                  className={`${inputClass} resize-none`}
                />
              </div>
            </section>
          )}

          <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm({
                  ...form,
                  isActive:
                    event.target.checked,
                })
              }
              className="h-4 w-4 accent-emerald-500"
            />
            Active size
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-xl bg-emerald-400 px-6 py-3 font-black text-slate-950 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Size"
                : "Add Size"}
          </button>
        </form>

        <section className="mb-8 overflow-hidden rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04]">
          <div className="border-b border-white/10 p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-400">
              Kids Size Guide
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Age + Body Measurements
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Age reference maatrame. Height, chest and waist
              customer ki correct fit choose cheyyadaniki main guide.
            </p>
          </div>

          {kidsSizes.length === 0 ? (
            <div className="p-8 text-sm text-slate-500">
              No Kids sizes found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Size
                    </th>
                    <th className="px-4 py-3">
                      Age Guide
                    </th>
                    <th className="px-4 py-3">
                      Height cm
                    </th>
                    <th className="px-4 py-3">
                      Chest in
                    </th>
                    <th className="px-4 py-3">
                      Waist in
                    </th>
                    <th className="px-4 py-3">
                      Hip in
                    </th>
                    <th className="px-4 py-3">
                      Garment Length
                    </th>
                    <th className="px-4 py-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {kidsSizes.map((size) => (
                    <tr key={size.id}>
                      <td className="px-5 py-4">
                        <div className="font-black text-white">
                          {size.name}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500">
                          {size.sizeType ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {size.ageGuide ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        {size.heightCm ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        {size.chestIn ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        {size.waistIn ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        {size.hipIn ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        {size.garmentLengthIn ??
                          "—"}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            startEdit(size)
                          }
                          className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 font-bold text-emerald-300"
                        >
                          Edit Guide
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  All Sizes
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {sizes.length} total sizes
                </p>
              </div>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search size, age, measurements..."
                className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Loading sizes...
            </div>
          ) : filteredSizes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No sizes found.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredSizes.map((size) => (
                <div
                  key={size.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black">
                        {size.name}
                      </p>

                      <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase text-slate-400">
                        {size.category ??
                          "General"}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          size.isActive
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-red-400/10 text-red-300"
                        }`}
                      >
                        {size.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {size.sizeType ?? "—"} ·{" "}
                      {size._count?.variants ?? 0} variants
                      {size.ageGuide
                        ? ` · Age ${size.ageGuide}`
                        : ""}
                      {size.heightCm
                        ? ` · Height ${size.heightCm} cm`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        startEdit(size)
                      }
                      className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void toggleActive(size)
                      }
                      className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300"
                    >
                      {size.isActive
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void deleteSize(size)
                      }
                      className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-xs font-bold text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-emerald-400";

function Label({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <label className="mb-2 block text-sm font-medium text-slate-300">
      {children}
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

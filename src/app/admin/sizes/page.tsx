"use client";

import { useEffect, useMemo, useState } from "react";

type Size = {
  id: string;
  name: string;
  category: string | null;
  sizeType: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: {
    variants: number;
  };
};

const emptyForm = {
  name: "",
  category: "Clothing",
  sizeType: "",
  sortOrder: "0",
  isActive: true,
};

export default function SizesPage() {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSizes() {
    setLoading(true);

    try {
      const response = await fetch("/api/sizes", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load sizes");
      }

      setSizes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("Sizes load కాలేదు");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSizes();
  }, []);

  const filteredSizes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return sizes;

    return sizes.filter((size) =>
      [
        size.name,
        size.category ?? "",
        size.sizeType ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [sizes, search]);

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
      sortOrder: String(size.sortOrder),
      isActive: size.isActive,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveSize(event: React.FormEvent) {
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
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name.trim(),
          category: form.category.trim() || null,
          sizeType: form.sizeType.trim() || null,
          sortOrder: Number(form.sortOrder || 0),
          isActive: form.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Size save failed");
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
        body: JSON.stringify({
          id: size.id,
          isActive: !size.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Update failed");
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
        body: JSON.stringify({
          id: size.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Delete failed");
        return;
      }

      await loadSizes();

      alert(data.message ?? "Size deleted");
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">

        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
            Catalog Management
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Sizes
          </h1>

          <p className="mt-2 text-slate-400">
            Manage clothing, kids, footwear and custom sizes.
          </p>
        </div>

        <form
          onSubmit={saveSize}
          className="mb-8 rounded-2xl border border-white/10 bg-white/[0.05] p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {editingId ? "Edit Size" : "Add New Size"}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Create reusable sizes for product variants.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Size Name
              </label>

              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                placeholder="XL / Free Size / 32"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Category
              </label>

              <input
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value,
                  })
                }
                placeholder="Clothing"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Size Type
              </label>

              <input
                value={form.sizeType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sizeType: e.target.value,
                  })
                }
                placeholder="Letter / Numeric / Free"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Sort Order
              </label>

              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sortOrder: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm({
                  ...form,
                  isActive: e.target.checked,
                })
              }
              className="h-4 w-4 accent-emerald-500"
            />

            Active size
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Size"
                : "Add Size"}
          </button>
        </form>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">

          <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="font-semibold">
                Size Master ({sizes.length})
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Active: {sizes.filter((size) => size.isActive).length}
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sizes..."
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-400 md:w-72"
            />
          </div>

          {loading ? (
            <div className="p-6 text-slate-400">
              Loading sizes...
            </div>
          ) : filteredSizes.length === 0 ? (
            <div className="p-6 text-slate-400">
              No sizes found.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredSizes.map((size) => (
                <div
                  key={size.id}
                  className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-emerald-400/10 px-3 font-bold text-emerald-400">
                        {size.name}
                      </div>

                      <div>
                        <h3 className="font-semibold">
                          {size.name}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {size.category ?? "No category"} ·{" "}
                          {size.sizeType ?? "No type"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Order {size.sortOrder} ·{" "}
                          {size._count?.variants ?? 0} variants
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">

                    <button
                      type="button"
                      onClick={() => toggleActive(size)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        size.isActive
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-red-400/10 text-red-400"
                      }`}
                    >
                      {size.isActive ? "ACTIVE" : "INACTIVE"}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEdit(size)}
                      className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteSize(size)}
                      className="rounded-xl border border-red-400/20 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10"
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

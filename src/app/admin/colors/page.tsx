"use client";

import { useEffect, useMemo, useState } from "react";

type Color = {
  id: string;
  name: string;
  hexCode: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: {
    variants: number;
  };
};

const emptyForm = {
  name: "",
  hexCode: "#000000",
  imageUrl: "",
  sortOrder: "0",
  isActive: true,
};

export default function ColorsPage() {
  const [colors, setColors] = useState<Color[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadColors() {
    setLoading(true);

    try {
      const response = await fetch("/api/colors", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load colors");
      }

      setColors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("Colors load కాలేదు");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadColors();
  }, []);

  const filteredColors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return colors;

    return colors.filter((color) =>
      color.name.toLowerCase().includes(query),
    );
  }, [colors, search]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(color: Color) {
    setEditingId(color.id);

    setForm({
      name: color.name,
      hexCode: color.hexCode ?? "#000000",
      imageUrl: color.imageUrl ?? "",
      sortOrder: String(color.sortOrder),
      isActive: color.isActive,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveColor(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Color name required");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/colors", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name.trim(),
          hexCode: form.hexCode.trim() || null,
          imageUrl: form.imageUrl.trim() || null,
          sortOrder: Number(form.sortOrder || 0),
          isActive: form.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Color save failed");
        return;
      }

      resetForm();
      await loadColors();

      alert(editingId ? "Color updated successfully" : "Color added successfully");
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(color: Color) {
    try {
      const response = await fetch("/api/colors", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: color.id,
          isActive: !color.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Update failed");
        return;
      }

      await loadColors();
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  }

  async function deleteColor(color: Color) {
    const confirmed = window.confirm(
      `Delete "${color.name}"?`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/colors", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: color.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Delete failed");
        return;
      }

      await loadColors();

      alert(data.message ?? "Color deleted");
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
            Colors
          </h1>

          <p className="mt-2 text-slate-400">
            Manage the complete AR Fashions color master.
          </p>
        </div>

        <form
          onSubmit={saveColor}
          className="mb-8 rounded-2xl border border-white/10 bg-white/[0.05] p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {editingId ? "Edit Color" : "Add New Color"}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Add color name, HEX code and display order.
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
                Color Name
              </label>

              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                placeholder="Wine"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                HEX Code
              </label>

              <div className="flex gap-2">
                <input
                  type="color"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(form.hexCode)
                      ? form.hexCode
                      : "#000000"
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hexCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="h-12 w-14 cursor-pointer rounded-lg border border-white/10 bg-slate-900 p-1"
                />

                <input
                  value={form.hexCode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hexCode: e.target.value,
                    })
                  }
                  placeholder="#722F37"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 uppercase outline-none placeholder:text-slate-500 focus:border-emerald-400"
                />
              </div>
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

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Image URL
              </label>

              <input
                value={form.imageUrl}
                onChange={(e) =>
                  setForm({
                    ...form,
                    imageUrl: e.target.value,
                  })
                }
                placeholder="Optional"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-emerald-400"
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

            Active color
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Color"
                : "Add Color"}
          </button>
        </form>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">

          <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="font-semibold">
                Color Master ({colors.length})
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Active: {colors.filter((color) => color.isActive).length}
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search colors..."
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-400 md:w-72"
            />
          </div>

          {loading ? (
            <div className="p-6 text-slate-400">
              Loading colors...
            </div>
          ) : filteredColors.length === 0 ? (
            <div className="p-6 text-slate-400">
              No colors found.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredColors.map((color) => (
                <div
                  key={color.id}
                  className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">

                    <div
                      className="h-12 w-12 shrink-0 rounded-xl border border-white/20 shadow-inner"
                      style={{
                        backgroundColor:
                          color.hexCode ?? "#000000",
                      }}
                    />

                    <div>
                      <h3 className="font-semibold">
                        {color.name}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {color.hexCode ?? "No HEX"} · Order{" "}
                        {color.sortOrder}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {color._count?.variants ?? 0} variants
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">

                    <button
                      type="button"
                      onClick={() => toggleActive(color)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        color.isActive
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-red-400/10 text-red-400"
                      }`}
                    >
                      {color.isActive ? "ACTIVE" : "INACTIVE"}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEdit(color)}
                      className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteColor(color)}
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

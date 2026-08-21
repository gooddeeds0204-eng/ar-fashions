"use client";

import { useEffect, useState } from "react";

type ChildCategory = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count?: {
    products: number;
  };
};

type Category = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  children: ChildCategory[];
  _count?: {
    products: number;
  };
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadCategories() {
    setLoading(true);
    try {
      const response = await fetch("/api/categories", { cache: "no-store" });
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function createCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        parentId: parentId || null,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      alert("Failed to create category");
      return;
    }

    setName("");
    setParentId("");
    await loadCategories();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
            Catalog Management
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Categories & Subcategories
          </h1>
          <p className="mt-2 text-slate-400">
            Add any future category or subcategory without changing code.
          </p>
        </div>

        <form
          onSubmit={createCategory}
          className="mb-8 rounded-2xl border border-white/10 bg-white/[0.05] p-6"
        >
          <h2 className="text-lg font-semibold">Add Category</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Category / Subcategory name"
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-emerald-400"
            />

            <select
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            >
              <option value="">No parent — Main Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Add Category"}
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="font-semibold">All Categories</h2>
          </div>

          {loading ? (
            <div className="p-6 text-slate-400">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="p-6 text-slate-400">No categories found.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {categories.map((category) => (
                <div key={category.id} className="px-6 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{category.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {category.slug} · {category._count?.products ?? 0} products
                      </p>
                    </div>

                    <span
                      className={
                        category.isActive
                          ? "rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-400"
                          : "rounded-full bg-red-400/10 px-3 py-1 text-xs text-red-400"
                      }
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {category.children && category.children.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {category.children.map((child) => (
                        <div
                          key={child.id}
                          className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3"
                        >
                          <p className="font-medium">{child.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {child._count?.products ?? 0} products
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import {
  useEffect,
  useState,
} from "react";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  parentId?: string | null;
  sortOrder?: number;

  _count?: {
    products: number;
  };

  children?: CategoryItem[];
};

type Category =
  CategoryItem & {
    children: CategoryItem[];
  };

export default function CategoriesPage() {
  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    name,
    setName,
  ] = useState("");

  const [
    parentId,
    setParentId,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    busyId,
    setBusyId,
  ] = useState<string | null>(
    null,
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  );

  const [
    editName,
    setEditName,
  ] = useState("");

  const [
    editParentId,
    setEditParentId,
  ] = useState("");

  const [
    editSortOrder,
    setEditSortOrder,
  ] = useState("0");

  async function loadCategories() {
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/categories",
          {
            cache: "no-store",
            credentials:
              "same-origin",
          },
        );

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/admin/login";
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to load categories",
        );
      }

      setCategories(
        Array.isArray(data)
          ? data
          : [],
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load categories",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function createCategory(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage(
        "Category name is required.",
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/categories",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                name,
                parentId:
                  parentId ||
                  null,
              }),
          },
        );

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/admin/login";
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to create category",
        );
      }

      setName("");
      setParentId("");

      setMessage(
        "Category created successfully.",
      );

      await loadCategories();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to create category",
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(
    category: CategoryItem,
  ) {
    setEditingId(
      category.id,
    );

    setEditName(
      category.name,
    );

    setEditParentId(
      category.parentId ??
        "",
    );

    setEditSortOrder(
      String(
        category.sortOrder ??
          0,
      ),
    );

    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditParentId("");
    setEditSortOrder("0");
  }

  async function saveEdit(
    category: CategoryItem,
  ) {
    const cleanName =
      editName.trim();

    if (!cleanName) {
      setMessage(
        "Category name is required.",
      );
      return;
    }

    const sortOrder =
      Number(
        editSortOrder,
      );

    if (
      !Number.isFinite(
        sortOrder,
      )
    ) {
      setMessage(
        "Sort order must be a number.",
      );
      return;
    }

    setBusyId(
      category.id,
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/categories",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                id:
                  category.id,

                name:
                  cleanName,

                parentId:
                  editParentId ||
                  null,

                sortOrder,
              }),
          },
        );

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/admin/login";
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update category",
        );
      }

      cancelEdit();

      setMessage(
        "Category updated successfully.",
      );

      await loadCategories();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update category",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function toggleCategory(
    category: CategoryItem,
  ) {
    setBusyId(
      category.id,
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/categories",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                id:
                  category.id,

                isActive:
                  !category.isActive,
              }),
          },
        );

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/admin/login";
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update category",
        );
      }

      setMessage(
        category.isActive
          ? "Category deactivated."
          : "Category activated.",
      );

      await loadCategories();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update category",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCategory(
    category: CategoryItem,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${category.name}"?\n\nEmpty categories will be permanently deleted. Categories containing products or subcategories will be safely deactivated instead.`,
      );

    if (!confirmed) {
      return;
    }

    setBusyId(
      category.id,
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/categories",
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                id:
                  category.id,
              }),
          },
        );

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/admin/login";
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to delete category",
        );
      }

      if (
        editingId ===
        category.id
      ) {
        cancelEdit();
      }

      setMessage(
        data.message ??
          "Category updated.",
      );

      await loadCategories();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete category",
      );
    } finally {
      setBusyId(null);
    }
  }

  function editPanel(
    category: CategoryItem,
  ) {
    if (
      editingId !==
      category.id
    ) {
      return null;
    }

    const hasChildren =
      Boolean(
        category.children
          ?.length,
      );

    return (
      <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Name
            </label>

            <input
              value={editName}
              onChange={(
                event,
              ) =>
                setEditName(
                  event.target
                    .value,
                )
              }
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Parent
            </label>

            <select
              value={
                editParentId
              }
              disabled={
                hasChildren
              }
              onChange={(
                event,
              ) =>
                setEditParentId(
                  event.target
                    .value,
                )
              }
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                No parent — Main Category
              </option>

              {categories
                .filter(
                  (main) =>
                    main.id !==
                    category.id,
                )
                .map(
                  (main) => (
                    <option
                      key={
                        main.id
                      }
                      value={
                        main.id
                      }
                    >
                      {
                        main.name
                      }
                    </option>
                  ),
                )}
            </select>

            {hasChildren && (
              <p className="mt-1 text-[11px] text-slate-500">
                Main categories with subcategories cannot be moved.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Sort order
            </label>

            <input
              type="number"
              value={
                editSortOrder
              }
              onChange={(
                event,
              ) =>
                setEditSortOrder(
                  event.target
                    .value,
                )
              }
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              busyId ===
              category.id
            }
            onClick={() =>
              saveEdit(
                category,
              )
            }
            className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
          >
            {busyId ===
            category.id
              ? "Saving..."
              : "Save changes"}
          </button>

          <button
            type="button"
            onClick={
              cancelEdit
            }
            className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  function actionButtons(
    category: CategoryItem,
  ) {
    const busy =
      busyId ===
      category.id;

    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            startEdit(
              category,
            )
          }
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
        >
          Edit
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            toggleCategory(
              category,
            )
          }
          className={
            category.isActive
              ? "rounded-lg border border-amber-400/20 px-3 py-1.5 text-xs text-amber-300 transition hover:bg-amber-400/10 disabled:opacity-50"
              : "rounded-lg border border-emerald-400/20 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-50"
          }
        >
          {busy
            ? "Working..."
            : category.isActive
              ? "Deactivate"
              : "Activate"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            deleteCategory(
              category,
            )
          }
          className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
            Catalog Management
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Categories & Subcategories
          </h1>

          <p className="mt-2 text-slate-400">
            Create, edit, organize and safely deactivate catalog categories.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-200">
            {message}
          </div>
        )}

        <form
          onSubmit={
            createCategory
          }
          className="mb-8 rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold">
            Add Category
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <input
              value={name}
              onChange={(
                event,
              ) =>
                setName(
                  event.target
                    .value,
                )
              }
              placeholder="Category / Subcategory name"
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-emerald-400"
            />

            <select
              value={
                parentId
              }
              onChange={(
                event,
              ) =>
                setParentId(
                  event.target
                    .value,
                )
              }
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            >
              <option value="">
                No parent — Main Category
              </option>

              {categories
                .filter(
                  (category) =>
                    category.isActive,
                )
                .map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  ),
                )}
            </select>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving
                ? "Creating..."
                : "Add Category"}
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
            <h2 className="font-semibold">
              All Categories
            </h2>

            <span className="text-xs text-slate-500">
              {categories.length} main
            </span>
          </div>

          {loading ? (
            <div className="p-6 text-slate-400">
              Loading categories...
            </div>
          ) : categories.length ===
            0 ? (
            <div className="p-6 text-slate-400">
              No categories found.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {categories.map(
                (category) => (
                  <div
                    key={
                      category.id
                    }
                    className="px-5 py-5 sm:px-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {
                              category.name
                            }
                          </h3>

                          <span
                            className={
                              category.isActive
                                ? "rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-400"
                                : "rounded-full bg-red-400/10 px-2.5 py-1 text-[11px] text-red-400"
                            }
                          >
                            {category.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {
                            category.slug
                          }{" "}
                          ·{" "}
                          {category
                            ._count
                            ?.products ??
                            0}{" "}
                          products ·{" "}
                          {category
                            .children
                            ?.length ??
                            0}{" "}
                          subcategories
                        </p>
                      </div>

                      {actionButtons(
                        category,
                      )}
                    </div>

                    {editPanel(
                      category,
                    )}

                    {category.children &&
                      category.children
                        .length >
                        0 && (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {category.children.map(
                            (
                              child,
                            ) => (
                              <div
                                key={
                                  child.id
                                }
                                className="rounded-xl border border-white/10 bg-slate-900/70 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium">
                                        {
                                          child.name
                                        }
                                      </p>

                                      <span
                                        className={
                                          child.isActive
                                            ? "rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-400"
                                            : "rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] text-red-400"
                                        }
                                      >
                                        {child.isActive
                                          ? "Active"
                                          : "Inactive"}
                                      </span>
                                    </div>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {child
                                        ._count
                                        ?.products ??
                                        0}{" "}
                                      products
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  {actionButtons(
                                    child,
                                  )}
                                </div>

                                {editPanel(
                                  child,
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SetType = "FIXED" | "MIXED" | "ASSORTED";

type SetStatus =
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE"
  | "SOLD_OUT";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  status: string;
  retailPrice: number;
  resellerPrice: number | null;
  image: string | null;
};

type SetItem = {
  id?: string;
  productId: string;
  quantity: number;
  unitPrice?: number;
  product?: Product | null;
};

type ResellerSet = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: SetType;
  pieces: number;
  setPrice: number;
  perPiecePrice: number;
  moq: number;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  status: SetStatus;
  isFeatured: boolean;
  sortOrder: number;
  items: SetItem[];
  contentCount: number;
};

type FormState = {
  name: string;
  description: string;
  type: SetType;
  setPrice: string;
  moq: string;
  thumbnailUrl: string;
  videoUrl: string;
  status: SetStatus;
  isFeatured: boolean;
  sortOrder: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  type: "MIXED",
  setPrice: "",
  moq: "1",
  thumbnailUrl: "",
  videoUrl: "",
  status: "DRAFT",
  isFeatured: false,
  sortOrder: "0",
};

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

export default function AdminResellerSetsPage() {
  const router = useRouter();

  const [sets, setSets] = useState<ResellerSet[]>(
    [],
  );

  const [products, setProducts] = useState<
    Product[]
  >([]);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const [quantities, setQuantities] = useState<
    Record<string, number>
  >({});

  const [editingId, setEditingId] = useState<
    string | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] =
    useState<string>("");

  const [search, setSearch] =
    useState<string>("");

  async function loadData() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/reseller-sets",
        {
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to load reseller sets.",
        );
      }

      setSets(
        Array.isArray(data.sets)
          ? data.sets
          : [],
      );

      setProducts(
        Array.isArray(data.products)
          ? data.products
          : [],
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load reseller sets.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedItems = useMemo(() => {
    return Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity,
      }));
  }, [quantities]);

  const totalPieces = useMemo(() => {
    return selectedItems.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    );
  }, [selectedItems]);

  const setPrice = Number(form.setPrice) || 0;

  const calculatedPerPiece =
    totalPieces > 0
      ? setPrice / totalPieces
      : 0;

  const filteredProducts = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name
          .toLowerCase()
          .includes(query) ||
        String(product.sku ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [products, search]);

  function setField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function changeQuantity(
    productId: string,
    amount: number,
  ) {
    setQuantities((current) => {
      const next = Math.max(
        0,
        (current[productId] ?? 0) +
          amount,
      );

      return {
        ...current,
        [productId]: next,
      };
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setQuantities({});
    setEditingId(null);
    setSearch("");
    setMessage("");
  }

  function startEdit(set: ResellerSet) {
    setEditingId(set.id);

    setForm({
      name: set.name,
      description:
        set.description ?? "",
      type: set.type,
      setPrice: String(set.setPrice),
      moq: String(set.moq),
      thumbnailUrl:
        set.thumbnailUrl ?? "",
      videoUrl: set.videoUrl ?? "",
      status: set.status,
      isFeatured: set.isFeatured,
      sortOrder: String(
        set.sortOrder,
      ),
    });

    const nextQuantities: Record<
      string,
      number
    > = {};

    for (const item of set.items) {
      nextQuantities[item.productId] =
        item.quantity;
    }

    setQuantities(nextQuantities);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveSet() {
    if (!form.name.trim()) {
      setMessage(
        "Set name is required.",
      );
      return;
    }

    if (totalPieces <= 0) {
      setMessage(
        "Select at least one product.",
      );
      return;
    }

    if (setPrice <= 0) {
      setMessage(
        "Set price must be greater than 0.",
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        "/api/admin/reseller-sets",
        {
          method: editingId
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ...(editingId
              ? { id: editingId }
              : {}),
            name: form.name,
            description:
              form.description,
            type: form.type,
            setPrice:
              Number(form.setPrice),
            moq: Number(form.moq),
            thumbnailUrl:
              form.thumbnailUrl,
            videoUrl: form.videoUrl,
            status: form.status,
            isFeatured:
              form.isFeatured,
            sortOrder: Number(
              form.sortOrder,
            ),
            items: selectedItems,
          }),
        },
      );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to save reseller set.",
        );
      }

      resetForm();

      setMessage(
        editingId
          ? "Reseller set updated."
          : "Reseller set created.",
      );

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save reseller set.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(
    set: ResellerSet,
    status: SetStatus,
  ) {
    try {
      const response = await fetch(
        "/api/admin/reseller-sets",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: set.id,
            status,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update status.",
        );
      }

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update status.",
      );
    }
  }

  async function deleteSet(
    set: ResellerSet,
  ) {
    const confirmed = window.confirm(
      `Delete "${set.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        "/api/admin/reseller-sets",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: set.id,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to delete reseller set.",
        );
      }

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete reseller set.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              router.push("/admin")
            }
            className="rounded-xl border bg-white px-3 py-2 text-sm font-bold"
          >
            ←
          </button>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              AR Fashions Admin
            </p>

            <h1 className="text-xl font-black">
              Reseller Sets
            </h1>
          </div>
        </div>

        {message ? (
          <div className="mb-5 rounded-2xl border bg-white p-4 text-sm font-semibold">
            {message}
          </div>
        ) : null}

        <section className="rounded-3xl border bg-white p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-black">
              {editingId
                ? "Edit Reseller Set"
                : "Create Reseller Set"}
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Build curated wholesale product
              combinations for resellers.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-bold">
                Set Name
              </span>

              <input
                value={form.name}
                onChange={(event) =>
                  setField(
                    "name",
                    event.target.value,
                  )
                }
                placeholder="Premium Kurti Set"
                className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-black"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold">
                Type
              </span>

              <select
                value={form.type}
                onChange={(event) =>
                  setField(
                    "type",
                    event.target
                      .value as SetType,
                  )
                }
                className="w-full rounded-xl border px-3 py-3 text-sm"
              >
                <option value="FIXED">
                  Fixed
                </option>

                <option value="MIXED">
                  Mixed
                </option>

                <option value="ASSORTED">
                  Assorted
                </option>
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-bold">
                Description
              </span>

              <textarea
                value={
                  form.description
                }
                onChange={(event) =>
                  setField(
                    "description",
                    event.target.value,
                  )
                }
                placeholder="Set details..."
                rows={3}
                className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-black"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold">
                Set Price
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.setPrice
                }
                onChange={(event) =>
                  setField(
                    "setPrice",
                    event.target.value,
                  )
                }
                placeholder="4999"
                className="w-full rounded-xl border px-3 py-3 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold">
                MOQ (Sets)
              </span>

              <input
                type="number"
                min="1"
                value={form.moq}
                onChange={(event) =>
                  setField(
                    "moq",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border px-3 py-3 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold">
                Status
              </span>

              <select
                value={
                  form.status
                }
                onChange={(event) =>
                  setField(
                    "status",
                    event.target
                      .value as SetStatus,
                  )
                }
                className="w-full rounded-xl border px-3 py-3 text-sm"
              >
                <option value="DRAFT">
                  Draft
                </option>

                <option value="ACTIVE">
                  Active
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>

                <option value="SOLD_OUT">
                  Sold Out
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold">
                Sort Order
              </span>

              <input
                type="number"
                min="0"
                value={
                  form.sortOrder
                }
                onChange={(event) =>
                  setField(
                    "sortOrder",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border px-3 py-3 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold">
                Thumbnail URL
              </span>

              <input
                value={
                  form.thumbnailUrl
                }
                onChange={(event) =>
                  setField(
                    "thumbnailUrl",
                    event.target.value,
                  )
                }
                placeholder="https://..."
                className="w-full rounded-xl border px-3 py-3 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold">
                Video URL
              </span>

              <input
                value={
                  form.videoUrl
                }
                onChange={(event) =>
                  setField(
                    "videoUrl",
                    event.target.value,
                  )
                }
                placeholder="https://..."
                className="w-full rounded-xl border px-3 py-3 text-sm"
              />
            </label>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={
                form.isFeatured
              }
              onChange={(event) =>
                setField(
                  "isFeatured",
                  event.target.checked,
                )
              }
            />

            Featured Set
          </label>

          <div className="mt-7 border-t pt-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="font-black">
                  Products
                </h3>

                <p className="mt-1 text-xs text-zinc-500">
                  Select products and piece
                  quantity.
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-zinc-500">
                  Pieces
                </p>

                <p className="text-lg font-black">
                  {totalPieces}
                </p>
              </div>
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search product or SKU..."
              className="mt-4 w-full rounded-xl border px-3 py-3 text-sm"
            />

            <div className="mt-4 space-y-3">
              {filteredProducts.map(
                (product) => {
                  const quantity =
                    quantities[
                      product.id
                    ] ?? 0;

                  const price =
                    product.resellerPrice ??
                    product.retailPrice;

                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 rounded-2xl border p-3 ${
                        quantity > 0
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "bg-white"
                      }`}
                    >
                      <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                        {product.image ? (
                          <img
                            src={
                              product.image
                            }
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">
                          {product.name}
                        </p>

                        <p className="mt-1 text-[11px] text-zinc-500">
                          {product.sku ??
                            "No SKU"}{" "}
                          · {money(price)}
                        </p>
                      </div>

                      <div className="flex items-center overflow-hidden rounded-xl border bg-white">
                        <button
                          type="button"
                          disabled={
                            quantity <= 0
                          }
                          onClick={() =>
                            changeQuantity(
                              product.id,
                              -1,
                            )
                          }
                          className="px-3 py-2 font-black disabled:text-zinc-300"
                        >
                          −
                        </button>

                        <span className="min-w-8 text-center text-sm font-black">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(
                              product.id,
                              1,
                            )
                          }
                          className="px-3 py-2 font-black"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-950 p-4 text-white">
            <div>
              <p className="text-[10px] uppercase text-zinc-400">
                Pieces
              </p>

              <p className="mt-1 font-black">
                {totalPieces}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase text-zinc-400">
                Set Price
              </p>

              <p className="mt-1 font-black">
                {money(setPrice)}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase text-zinc-400">
                Per Piece
              </p>

              <p className="mt-1 font-black">
                {money(
                  calculatedPerPiece,
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 rounded-xl border px-4 py-3 text-sm font-black"
              >
                Cancel
              </button>
            ) : null}

            <button
              type="button"
              disabled={
                saving ||
                totalPieces <= 0
              }
              onClick={saveSet}
              className="flex-[2] rounded-xl bg-black px-4 py-3 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Set"
                  : "Create Set"}
            </button>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black">
              Existing Sets
            </h2>

            <span className="text-xs text-zinc-500">
              {sets.length} total
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-center text-sm text-zinc-500">
              Loading sets...
            </div>
          ) : sets.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 text-center text-sm text-zinc-500">
              No reseller sets yet.
            </div>
          ) : (
            <div className="space-y-4">
              {sets.map((set) => (
                <article
                  key={set.id}
                  className="rounded-3xl border bg-white p-4"
                >
                  <div className="flex gap-3">
                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                      {set.thumbnailUrl ? (
                        <img
                          src={
                            set.thumbnailUrl
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : set.items[0]
                          ?.product?.image ? (
                        <img
                          src={
                            set.items[0]
                              .product!
                              .image!
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-black">
                          {set.type}
                        </span>

                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">
                          {set.status}
                        </span>

                        {set.isFeatured ? (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-700">
                            FEATURED
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-2 font-black">
                        {set.name}
                      </h3>

                      <p className="mt-1 text-xs text-zinc-500">
                        {set.pieces} pcs ·{" "}
                        {money(
                          set.setPrice,
                        )}{" "}
                        ·{" "}
                        {money(
                          set.perPiecePrice,
                        )}{" "}
                        each
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        MOQ {set.moq} set
                        {set.moq === 1
                          ? ""
                          : "s"}{" "}
                        · Sort{" "}
                        {set.sortOrder}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {set.items.map(
                      (item) => (
                        <span
                          key={item.productId}
                          className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold"
                        >
                          {item.product
                            ?.name ??
                            "Product"}{" "}
                          × {item.quantity}
                        </span>
                      ),
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() =>
                        startEdit(set)
                      }
                      className="rounded-xl bg-zinc-100 px-3 py-3 text-xs font-black"
                    >
                      Edit
                    </button>

                    {set.status ===
                    "ACTIVE" ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateStatus(
                            set,
                            "INACTIVE",
                          )
                        }
                        className="rounded-xl bg-amber-50 px-3 py-3 text-xs font-black text-amber-700"
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          updateStatus(
                            set,
                            "ACTIVE",
                          )
                        }
                        className="rounded-xl bg-emerald-50 px-3 py-3 text-xs font-black text-emerald-700"
                      >
                        Activate
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        updateStatus(
                          set,
                          "SOLD_OUT",
                        )
                      }
                      className="rounded-xl bg-zinc-100 px-3 py-3 text-xs font-black"
                    >
                      Sold Out
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteSet(set)
                      }
                      className="rounded-xl bg-red-50 px-3 py-3 text-xs font-black text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

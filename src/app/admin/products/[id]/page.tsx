"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
  id: string;
  name: string;
};

type Color = {
  id: string;
  name: string;
  family?: string | null;
  hexCode?: string | null;
};

type Size = {
  id: string;
  name: string;
  category?: string | null;
};

type Variant = {
  id?: string;
  colorId: string;
  sizeId: string;
  stock: number;
  costPrice: string;
  retailPrice: string;
  resellerPrice: string;
  sku?: string | null;
  isActive: boolean;
};

type Media = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  thumbnailUrl?: string | null;
  altText?: string | null;
  sortOrder: number;
  isActive: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  gender: "WOMEN" | "MEN" | "KIDS" | "UNISEX";
  description?: string | null;
  fabric?: string | null;
  retailPrice: number | string;
  resellerPrice?: number | string | null;
  mrp?: number | string | null;
  resellerMOQ?: number | null;
  salesMode: "RETAIL" | "BULK" | "BOTH";
  status:
    | "DRAFT"
    | "ACTIVE"
    | "INACTIVE"
    | "OUT_OF_STOCK";
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  categoryId: string;
  variants: Array<{
    id: string;
    colorId: string;
    sizeId: string;
    stock: number;
    reservedStock: number;
    costPrice?: number | string | null;
    retailPrice?: number | string | null;
    resellerPrice?: number | string | null;
    sku?: string | null;
    isActive: boolean;
  }>;
  media: Media[];
};

export default function EditProductPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [addingMedia, setAddingMedia] = useState(false);
  const [mediaActionId, setMediaActionId] = useState<string | null>(null);
  const [replacingMediaId, setReplacingMediaId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);

  const [selectedColors, setSelectedColors] = useState<string[]>(
    [],
  );

  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    [],
  );

  const [variants, setVariants] = useState<Variant[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [colorSearch, setColorSearch] = useState("");
  const [sizeSearch, setSizeSearch] = useState("");

  const productId =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").filter(Boolean).pop() ?? ""
      : "";

  useEffect(() => {
    if (!productId) return;

    loadProduct();
  }, [productId]);

  async function loadProduct() {
    try {
      setLoading(true);
      setError("");

      const [
        productResponse,
        categoriesResponse,
        colorsResponse,
        sizesResponse,
      ] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch("/api/categories"),
        fetch("/api/colors"),
        fetch("/api/sizes"),
      ]);

      if (!productResponse.ok) {
        throw new Error("Product not found");
      }

      const productData = await productResponse.json();

      const categoriesData: Category[] | { categories?: Category[] } =
        await categoriesResponse.json();

      const colorsData: Color[] | { colors?: Color[] } =
        await colorsResponse.json();

      const sizesData: Size[] | { sizes?: Size[] } =
        await sizesResponse.json();

      setProduct(productData);

      const rawCategories = Array.isArray(categoriesData)
        ? categoriesData
        : categoriesData.categories ?? [];

      const flatCategories = rawCategories.flatMap((category) => {
        const children =
          (category as Category & { children?: Category[] }).children ?? [];

        return [
          category,
          ...children.map((child) => ({
            ...child,
            name: `${category.name} → ${child.name}`,
          })),
        ];
      });

      setCategories(flatCategories);

      setColors(
        Array.isArray(colorsData)
          ? colorsData
          : colorsData.colors ?? [],
      );

      setSizes(
        Array.isArray(sizesData)
          ? sizesData
          : sizesData.sizes ?? [],
      );

      const loadedColorIds: string[] = Array.from(
        new Set<string>(
          productData.variants.map(
            (variant: Product["variants"][number]) =>
              String(variant.colorId),
          ),
        ),
      );

      const loadedSizeIds: string[] = Array.from(
        new Set<string>(
          productData.variants.map(
            (variant: Product["variants"][number]) =>
              String(variant.sizeId),
          ),
        ),
      );

      setSelectedColors(loadedColorIds);
      setSelectedSizes(loadedSizeIds);

      setVariants(
        productData.variants.map(
          (variant: Product["variants"][number]) => ({
            id: variant.id,
            colorId: variant.colorId,
            sizeId: variant.sizeId,
            stock: variant.stock,
            costPrice:
              variant.costPrice != null
                ? String(variant.costPrice)
                : "",
            retailPrice:
              variant.retailPrice != null
                ? String(variant.retailPrice)
                : "",
            resellerPrice:
              variant.resellerPrice != null
                ? String(variant.resellerPrice)
                : "",
            sku: variant.sku,
            isActive: variant.isActive,
          }),
        ),
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load product",
      );
    } finally {
      setLoading(false);
    }
  }

  function getColorName(id: string) {
    return (
      colors.find((color) => color.id === id)?.name ??
      id
    );
  }

  function getSizeName(id: string) {
    return (
      sizes.find((size) => size.id === id)?.name ??
      id
    );
  }

  const filteredColors = useMemo(() => {
    const query = colorSearch.trim().toLowerCase();

    if (!query) return colors;

    return colors.filter((color) =>
      color.name.toLowerCase().includes(query),
    );
  }, [colors, colorSearch]);

  const filteredSizes = useMemo(() => {
    const query = sizeSearch.trim().toLowerCase();

    if (!query) return sizes;

    return sizes.filter((size) =>
      size.name.toLowerCase().includes(query),
    );
  }, [sizes, sizeSearch]);

  function toggleColor(colorId: string) {
    setSelectedColors((current) => {
      const exists = current.includes(colorId);

      const next = exists
        ? current.filter((id) => id !== colorId)
        : [...current, colorId];

      rebuildVariants(next, selectedSizes);

      return next;
    });
  }

  function toggleSize(sizeId: string) {
    setSelectedSizes((current) => {
      const exists = current.includes(sizeId);

      const next = exists
        ? current.filter((id) => id !== sizeId)
        : [...current, sizeId];

      rebuildVariants(selectedColors, next);

      return next;
    });
  }

  function rebuildVariants(
    colorIds: string[],
    sizeIds: string[],
  ) {
    setVariants((current) => {
      const map = new Map(
        current.map((variant) => [
          `${variant.colorId}:${variant.sizeId}`,
          variant,
        ]),
      );

      return colorIds.flatMap((colorId) =>
        sizeIds.map((sizeId) => {
          const key = `${colorId}:${sizeId}`;

          const existing = map.get(key);

          if (existing) {
            return existing;
          }

          return {
            colorId,
            sizeId,
            stock: 0,
            costPrice: "",
            retailPrice: "",
            resellerPrice: "",
            sku: null,
            isActive: true,
          };
        }),
      );
    });
  }

  function updateVariant(
    colorId: string,
    sizeId: string,
    field: keyof Variant,
    value: string | number | boolean,
  ) {
    setVariants((current) =>
      current.map((variant) => {
        if (
          variant.colorId !== colorId ||
          variant.sizeId !== sizeId
        ) {
          return variant;
        }

        return {
          ...variant,
          [field]: value,
        };
      }),
    );
  }

  function selectAllColors() {
    const ids = filteredColors.map((color) => color.id);

    setSelectedColors(ids);
    rebuildVariants(ids, selectedSizes);
  }

  function clearAllColors() {
    setSelectedColors([]);
    setVariants([]);
  }

  function selectAllSizes() {
    const ids = filteredSizes.map((size) => size.id);

    setSelectedSizes(ids);
    rebuildVariants(selectedColors, ids);
  }

  function clearAllSizes() {
    setSelectedSizes([]);
    setVariants([]);
  }

  async function deleteMedia(mediaId: string) {
    if (!product) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this media?"
    );

    if (!confirmed) return;

    try {
      setMediaActionId(mediaId);

      const response = await fetch("/api/media", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: mediaId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Failed to remove media");
        return;
      }

      setProduct({
        ...product,
        media: product.media.filter(
          (item) => item.id !== mediaId
        ),
      });
    } catch (error) {
      console.error("Delete media failed:", error);
      alert("Failed to remove media");
    } finally {
      setMediaActionId(null);
    }
  }

  async function moveMedia(mediaId: string, direction: "up" | "down") {
    if (!product) return;

    const currentIndex = product.media.findIndex(
      (item) => item.id === mediaId
    );

    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= product.media.length
    ) {
      return;
    }

    const currentMedia = product.media[currentIndex];
    const targetMedia = product.media[targetIndex];

    try {
      setMediaActionId(mediaId);

      const [firstResponse, secondResponse] =
        await Promise.all([
          fetch("/api/media", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: currentMedia.id,
              sortOrder: targetIndex,
            }),
          }),
          fetch("/api/media", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: targetMedia.id,
              sortOrder: currentIndex,
            }),
          }),
        ]);

      if (!firstResponse.ok || !secondResponse.ok) {
        alert("Failed to reorder media");
        return;
      }

      const updatedMedia = [...product.media];

      updatedMedia[currentIndex] = {
        ...targetMedia,
        sortOrder: currentIndex,
      };

      updatedMedia[targetIndex] = {
        ...currentMedia,
        sortOrder: targetIndex,
      };

      setProduct({
        ...product,
        media: updatedMedia,
      });
    } catch (error) {
      console.error("Reorder media failed:", error);
      alert("Failed to reorder media");
    } finally {
      setMediaActionId(null);
    }
  }

  async function replaceMedia(
    mediaId: string,
    file: File
  ) {
    if (!product) return;

    try {
      setReplacingMediaId(mediaId);

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(
        "/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        alert(
          uploadData.error ??
            "Replacement upload failed"
        );
        return;
      }

      const patchResponse = await fetch(
        "/api/media",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: mediaId,
            type: uploadData.type,
            url: uploadData.url,
            thumbnailUrl: null,
            altText: product.name,
          }),
        }
      );

      const patchData = await patchResponse.json();

      if (!patchResponse.ok) {
        alert(
          patchData.error ??
            "Failed to replace media"
        );
        return;
      }

      setProduct({
        ...product,
        media: product.media.map((item) =>
          item.id === mediaId
            ? {
                ...item,
                type: patchData.type,
                url: patchData.url,
                thumbnailUrl:
                  patchData.thumbnailUrl ?? null,
                altText:
                  patchData.altText ?? product.name,
              }
            : item
        ),
      });

      alert("Media replaced successfully");
    } catch (error) {
      console.error("Replace media failed:", error);
      alert("Failed to replace media");
    } finally {
      setReplacingMediaId(null);
    }
  }

  async function saveProduct() {
    if (!product) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/products/${product.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: product.name,
            categoryId: product.categoryId,
            gender: product.gender,
            description: product.description,
            fabric: product.fabric,
            retailPrice: product.retailPrice,
            resellerPrice: product.resellerPrice,
            mrp: product.mrp,
            resellerMOQ: product.resellerMOQ,
            salesMode: product.salesMode,
            status: product.status,
            isFeatured: product.isFeatured,
            isTrending: product.isTrending,
            isNewArrival: product.isNewArrival,
            variants,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to save product",
        );
      }

      setProduct(data);

      setSuccess(
        "Product updated successfully.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save product",
      );
    } finally {
      setSaving(false);
    }
  }

  const totalStock = variants.reduce(
    (total, variant) =>
      total + Number(variant.stock || 0),
    0,
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
            <p className="mt-4 text-sm text-slate-400">
              Loading product...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="rounded-3xl border border-red-400/20 bg-red-400/5 p-8 text-center">
            <p className="text-lg font-bold">
              Product not found
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {error || "Unable to load this product."}
            </p>

            <a
              href="/admin/products"
              className="mt-6 inline-flex rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950"
            >
              Back to Products
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <a
              href="/admin/products"
              className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
            >
              ← Back to Products
            </a>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
              AR FASHIONS · PRODUCT EDITOR
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Edit Product
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Update product details, pricing, variants and
              visibility.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">
              ID: {product.id.slice(0, 12)}
            </span>

            <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-400">
              {product.status}
            </span>
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-semibold text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm font-semibold text-emerald-300">
            ✓ {success}
          </div>
        )}

        {/* BASIC DETAILS */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              01
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Product Details
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Product Name"
              value={product.name}
              onChange={(value) =>
                setProduct({
                  ...product,
                  name: value,
                })
              }
              placeholder="Product name"
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Category
              </label>

              <select
                value={product.categoryId}
                onChange={(event) =>
                  setProduct({
                    ...product,
                    categoryId: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3.5 outline-none focus:border-emerald-400"
              >
                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Gender
              </label>

              <select
                value={product.gender}
                onChange={(event) =>
                  setProduct({
                    ...product,
                    gender:
                      event.target.value as Product["gender"],
                  })
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3.5 outline-none focus:border-emerald-400"
              >
                <option value="WOMEN">Women</option>
                <option value="MEN">Men</option>
                <option value="KIDS">Kids</option>
                <option value="UNISEX">Unisex</option>
              </select>
            </div>

            <Field
              label="Fabric"
              value={product.fabric ?? ""}
              onChange={(value) =>
                setProduct({
                  ...product,
                  fabric: value,
                })
              }
              placeholder="Cotton / Rayon / Denim..."
            />

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Description
              </label>

              <textarea
                value={product.description ?? ""}
                onChange={(event) =>
                  setProduct({
                    ...product,
                    description: event.target.value,
                  })
                }
                rows={5}
                placeholder="Product description..."
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3.5 outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="mb-6 rounded-3xl border border-amber-400/20 bg-amber-400/[0.03] p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              02
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Pricing & Reseller
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <PriceField
              label="MRP"
              value={String(product.mrp ?? "")}
              onChange={(value) =>
                setProduct({
                  ...product,
                  mrp: value,
                })
              }
            />

            <PriceField
              label="Retail Price"
              value={String(product.retailPrice ?? "")}
              onChange={(value) =>
                setProduct({
                  ...product,
                  retailPrice: value,
                })
              }
            />

            <PriceField
              label="Reseller Price"
              value={String(product.resellerPrice ?? "")}
              onChange={(value) =>
                setProduct({
                  ...product,
                  resellerPrice: value,
                })
              }
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Reseller MOQ
              </label>

              <input
                type="number"
                min="1"
                value={product.resellerMOQ ?? ""}
                onChange={(event) =>
                  setProduct({
                    ...product,
                    resellerMOQ:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3.5 outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Sales Mode
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["RETAIL", "Retail Only"],
                ["BULK", "Bulk / Reseller"],
                ["BOTH", "Retail + Reseller"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setProduct({
                      ...product,
                      salesMode:
                        value as Product["salesMode"],
                    })
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    product.salesMode === value
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/10 bg-slate-900"
                  }`}
                >
                  <p className="font-bold">{label}</p>

                  <p className="mt-1 text-xs text-slate-500">
                    {value}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* COLORS */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                03
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Product Colors
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {selectedColors.length} colors selected
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={colorSearch}
                onChange={(event) =>
                  setColorSearch(event.target.value)
                }
                placeholder="Search color..."
                className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
              />

              <button
                type="button"
                onClick={selectAllColors}
                className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-400"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={clearAllColors}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-400"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {filteredColors.map((color) => {
              const selected =
                selectedColors.includes(color.id);

              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() =>
                    toggleColor(color.id)
                  }
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    selected
                      ? "border-emerald-400 bg-emerald-400 text-slate-950"
                      : "border-white/10 bg-slate-900 text-slate-300"
                  }`}
                >
                  {color.hexCode && (
                    <span
                      className="h-4 w-4 rounded-full border border-black/20"
                      style={{
                        backgroundColor:
                          color.hexCode,
                      }}
                    />
                  )}

                  {color.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* SIZES */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                04
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Product Sizes
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {selectedSizes.length} sizes selected
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={sizeSearch}
                onChange={(event) =>
                  setSizeSearch(event.target.value)
                }
                placeholder="Search size..."
                className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
              />

              <button
                type="button"
                onClick={selectAllSizes}
                className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-400"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={clearAllSizes}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-400"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {filteredSizes.map((size) => {
              const selected =
                selectedSizes.includes(size.id);

              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() =>
                    toggleSize(size.id)
                  }
                  className={`min-w-16 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    selected
                      ? "border-emerald-400 bg-emerald-400 text-slate-950"
                      : "border-white/10 bg-slate-900 text-slate-300"
                  }`}
                >
                  {size.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* VARIANTS */}
        <section className="mb-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.03] p-5 sm:p-7">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                05
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Variant Matrix
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {variants.length} variants · {totalStock} total stock
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-400">
              {selectedColors.length} ×{" "}
              {selectedSizes.length} combinations
            </div>
          </div>

          {variants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <p className="font-semibold text-slate-300">
                Select colors and sizes
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Variants will be generated automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-4 py-4">Color</th>
                    <th className="px-4 py-4">Size</th>
                    <th className="px-4 py-4">Stock</th>
                    <th className="px-4 py-4">Cost</th>
                    <th className="px-4 py-4">Retail</th>
                    <th className="px-4 py-4">Reseller</th>
                    <th className="px-4 py-4">Active</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {variants.map((variant) => (
                    <tr
                      key={`${variant.colorId}-${variant.sizeId}`}
                    >
                      <td className="px-4 py-3 font-semibold">
                        {getColorName(
                          variant.colorId,
                        )}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {getSizeName(
                          variant.sizeId,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(event) =>
                            updateVariant(
                              variant.colorId,
                              variant.sizeId,
                              "stock",
                              Number(
                                event.target.value,
                              ),
                            )
                          }
                          className="w-24 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={variant.costPrice}
                          onChange={(event) =>
                            updateVariant(
                              variant.colorId,
                              variant.sizeId,
                              "costPrice",
                              event.target.value,
                            )
                          }
                          className="w-24 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={variant.retailPrice}
                          onChange={(event) =>
                            updateVariant(
                              variant.colorId,
                              variant.sizeId,
                              "retailPrice",
                              event.target.value,
                            )
                          }
                          className="w-24 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={
                            variant.resellerPrice
                          }
                          onChange={(event) =>
                            updateVariant(
                              variant.colorId,
                              variant.sizeId,
                              "resellerPrice",
                              event.target.value,
                            )
                          }
                          className="w-24 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            updateVariant(
                              variant.colorId,
                              variant.sizeId,
                              "isActive",
                              !variant.isActive,
                            )
                          }
                          className={`rounded-xl px-3 py-2 text-xs font-bold ${
                            variant.isActive
                              ? "bg-emerald-400 text-slate-950"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {variant.isActive
                            ? "ACTIVE"
                            : "OFF"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* MEDIA */}
        <section className="mb-6 rounded-3xl border border-purple-400/20 bg-purple-400/[0.03] p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
              06
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Product Media
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Existing product images and videos.
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900 p-5">
            <p className="mb-3 text-sm font-semibold">
              Add New Image / Video
            </p>

            <input
              type="file"
              accept="image/*,video/*"
              disabled={addingMedia}
              onChange={async (event) => {
                const file = event.target.files?.[0];

                if (!file) return;

                try {
                  setAddingMedia(true);

                  const formData = new FormData();
                  formData.append("file", file);

                  const uploadResponse = await fetch(
                    "/api/upload",
                    {
                      method: "POST",
                      body: formData,
                    },
                  );

                  const uploadData =
                    await uploadResponse.json();

                  if (!uploadResponse.ok) {
                    alert(
                      uploadData.error ??
                        "Upload failed",
                    );
                    return;
                  }

                  const mediaResponse = await fetch(
                    "/api/media",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type":
                          "application/json",
                      },
                      body: JSON.stringify({
                        productId: product.id,
                        type: uploadData.type,
                        url: uploadData.url,
                        thumbnailUrl: null,
                        altText: product.name,
                      }),
                    },
                  );

                  const mediaData =
                    await mediaResponse.json();

                  if (!mediaResponse.ok) {
                    alert(
                      mediaData.error ??
                        "Failed to save media",
                    );
                    return;
                  }

                  setProduct({
                    ...product,
                    media: [
                      ...product.media,
                      mediaData,
                    ],
                  });

                  event.target.value = "";

                  alert(
                    "Media uploaded successfully",
                  );
                } catch (error) {
                  console.error(
                    "Media upload failed:",
                    error,
                  );

                  alert(
                    "Something went wrong while uploading",
                  );
                } finally {
                  setAddingMedia(false);
                }
              }}
              className="block w-full cursor-pointer rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-purple-400 file:px-4 file:py-2 file:font-bold file:text-slate-950"
            />

            {addingMedia && (
              <p className="mt-3 text-sm font-semibold text-purple-400">
                Uploading...
              </p>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Images up to 10MB · Videos up to 50MB
            </p>
          </div>

          {product.media.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <p className="font-semibold text-slate-300">
                No media available
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Upload an image or video above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {product.media.map((item, index) => (
                <div
                  key={item.id}
                  className={`overflow-hidden rounded-2xl border bg-slate-900 ${
                    index === 0
                      ? "border-amber-400/60"
                      : "border-white/10"
                  }`}
                >
                  <div className="relative aspect-square bg-slate-950">
                    {item.type === "IMAGE" ? (
                      <img
                        src={item.url}
                        alt={item.altText ?? product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video
                        src={item.url}
                        controls
                        className="h-full w-full object-cover"
                      />
                    )}

                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-slate-950">
                        ⭐ PRIMARY
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="rounded-full bg-purple-400/10 px-2 py-1 text-[10px] font-bold text-purple-400">
                        {item.type}
                      </span>

                      <span className="text-[10px] text-slate-500">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={
                          index === 0 ||
                          mediaActionId === item.id
                        }
                        onClick={() =>
                          moveMedia(item.id, "up")
                        }
                        className="rounded-lg border border-white/10 bg-slate-950 py-2 text-xs font-bold text-slate-300 disabled:opacity-30"
                      >
                        ↑ Up
                      </button>

                      <button
                        type="button"
                        disabled={
                          index === product.media.length - 1 ||
                          mediaActionId === item.id
                        }
                        onClick={() =>
                          moveMedia(item.id, "down")
                        }
                        className="rounded-lg border border-white/10 bg-slate-950 py-2 text-xs font-bold text-slate-300 disabled:opacity-30"
                      >
                        ↓ Down
                      </button>
                    </div>

                    <label
                      className={`mt-2 block cursor-pointer rounded-lg border border-blue-400/20 bg-blue-400/5 py-2 text-center text-xs font-bold text-blue-400 ${
                        replacingMediaId === item.id
                          ? "pointer-events-none opacity-50"
                          : ""
                      }`}
                    >
                      {replacingMediaId === item.id
                        ? "Replacing..."
                        : "🔄 Replace"}

                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        disabled={
                          replacingMediaId === item.id
                        }
                        onChange={async (event) => {
                          const file =
                            event.target.files?.[0];

                          if (!file) return;

                          await replaceMedia(
                            item.id,
                            file
                          );

                          event.target.value = "";
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={
                        mediaActionId === item.id
                      }
                      onClick={() =>
                        deleteMedia(item.id)
                      }
                      className="mt-2 w-full rounded-lg border border-red-400/20 bg-red-400/5 py-2 text-xs font-bold text-red-400 transition hover:bg-red-400/10 disabled:opacity-50"
                    >
                      {mediaActionId === item.id
                        ? "Processing..."
                        : "🗑 Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SETTINGS */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              07
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Product Settings
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Toggle
              label="Featured"
              description="Show in featured products"
              enabled={product.isFeatured}
              onChange={(value) =>
                setProduct({
                  ...product,
                  isFeatured: value,
                })
              }
            />

            <Toggle
              label="Trending"
              description="Show as trending"
              enabled={product.isTrending}
              onChange={(value) =>
                setProduct({
                  ...product,
                  isTrending: value,
                })
              }
            />

            <Toggle
              label="New Arrival"
              description="Show as new arrival"
              enabled={product.isNewArrival}
              onChange={(value) =>
                setProduct({
                  ...product,
                  isNewArrival: value,
                })
              }
            />

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <p className="text-sm font-semibold">
                Status
              </p>

              <select
                value={product.status}
                onChange={(event) =>
                  setProduct({
                    ...product,
                    status:
                      event.target.value as Product["status"],
                  })
                }
                className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="OUT_OF_STOCK">
                  Out of Stock
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* SAVE BAR */}
        <div className="sticky bottom-4 z-20 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="px-2">
              <p className="text-sm font-semibold">
                Ready to update?
              </p>

              <p className="text-xs text-slate-500">
                {variants.length} variants ·{" "}
                {totalStock} stock units
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href="/admin/products"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </a>

              <button
                type="button"
                onClick={saveProduct}
                disabled={saving}
                className="rounded-xl bg-emerald-400 px-7 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
              >
                {saving
                  ? "Saving Changes..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3.5 outline-none transition focus:border-emerald-400"
      />
    </div>
  );
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <div className="flex items-center rounded-2xl border border-white/10 bg-slate-900 px-4 focus-within:border-emerald-400">
        <span className="text-slate-500">
          ₹
        </span>

        <input
          type="number"
          min="0"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="w-full bg-transparent px-2 py-3.5 outline-none"
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900 p-4 text-left"
    >
      <div>
        <p className="text-sm font-semibold">
          {label}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <span
        className={`relative ml-4 h-6 w-11 shrink-0 rounded-full transition ${
          enabled
            ? "bg-emerald-400"
            : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

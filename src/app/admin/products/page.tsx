"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
  id: string;
  name: string;
  parentId?: string | null;
};

type Color = {
  id: string;
  name: string;
  family?: string | null;
  hexCode?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
};

type Size = {
  id: string;
  name: string;
  category?: string | null;
  sizeType?: string | null;
  isActive: boolean;
};

type Variant = {
  colorId: string;
  sizeId: string;
  sku: string;
  stock: number;
  costPrice: string;
  retailPrice: string;
  resellerPrice: string;
  isActive: boolean;
};

type ProductMedia = {
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
  sku: string | null;
  retailPrice: string | number;
  resellerPrice: string | number | null;
  status: string;
  category: {
    id: string;
    name: string;
  };
  variants: {
    id: string;
    stock: number;
    color: {
      id: string;
      name: string;
    };
    size: {
      id: string;
      name: string;
    };
  }[];
  _count: {
    variants: number;
    media: number;
  };
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [gender, setGender] = useState<
    "WOMEN" | "MEN" | "KIDS" | "UNISEX"
  >("UNISEX");
  const [sku, setSku] = useState("");
  const [fabric, setFabric] = useState("");
  const [description, setDescription] = useState("");

  const [mrp, setMrp] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [resellerPrice, setResellerPrice] = useState("");
  const [resellerMOQ, setResellerMOQ] = useState("");

  const [salesMode, setSalesMode] = useState<
    "RETAIL" | "BULK" | "BOTH"
  >("BOTH");

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizeSearch, setSizeSearch] = useState("");
  const [expandedColorFamily, setExpandedColorFamily] = useState<string | null>(null);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [mediaAltText, setMediaAltText] = useState("");
  const [addingMedia, setAddingMedia] = useState(false);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaError, setMediaError] = useState("");



  const [isFeatured, setIsFeatured] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);

  const [status, setStatus] = useState("DRAFT");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const [
        productsResponse,
        categoriesResponse,
        colorsResponse,
        sizesResponse,
      ] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
        fetch("/api/colors", { cache: "no-store" }),
        fetch("/api/sizes", { cache: "no-store" }),
      ]);

      const productsData = await productsResponse.json();
      const categoriesData = await categoriesResponse.json();
      const colorsData = await colorsResponse.json();
      const sizesData = await sizesResponse.json();

      setProducts(
        Array.isArray(productsData) ? productsData : [],
      );

      const flattened: Category[] = [];

      if (Array.isArray(categoriesData)) {
        for (const category of categoriesData) {
          flattened.push({
            id: category.id,
            name: category.name,
            parentId: null,
          });

          if (Array.isArray(category.children)) {
            for (const child of category.children) {
              flattened.push({
                id: child.id,
                name: `${category.name} → ${child.name}`,
                parentId: category.id,
              });
            }
          }
        }
      }

      setCategories(flattened);

      setColors(
        Array.isArray(colorsData)
          ? colorsData.filter((color) => color.isActive !== false)
          : [],
      );

      setSizes(
        Array.isArray(sizesData)
          ? sizesData.filter((size) => size.isActive !== false)
          : [],
      );
    } catch (error) {
      console.error("Failed to load admin product data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function getApplicableSizeIds(categoryName: string) {
    const name = categoryName.toLowerCase();

    if (
      name.includes("kids") ||
      name.includes("boys") ||
      name.includes("girls") ||
      name.includes("baby")
    ) {
      return sizes
        .filter((size) => size.category === "Kids")
        .map((size) => size.id);
    }

    if (
      name.includes("saree") ||
      name.includes("dupatta") ||
      name.includes("scarf") ||
      name.includes("shawl") ||
      name.includes("handbag") ||
      name.includes("bag") ||
      name.includes("belt") ||
      name.includes("cap") ||
      name.includes("hat") ||
      name.includes("sunglass") ||
      name.includes("jewellery") ||
      name.includes("watch") ||
      name.includes("sock")
    ) {
      return sizes
        .filter(
          (size) =>
            size.name === "Free Size" ||
            size.category === "Clothing"
        )
        .map((size) => size.id);
    }

    if (
      name.includes("jeans") ||
      name.includes("pants") ||
      name.includes("trouser") ||
      name.includes("cargo") ||
      name.includes("jogger") ||
      name.includes("legging") ||
      name.includes("jeggings") ||
      name.includes("palazzo") ||
      name.includes("shorts")
    ) {
      return sizes
        .filter(
          (size) =>
            size.category === "Adult" &&
            size.sizeType === "NUMERIC"
        )
        .map((size) => size.id);
    }

    return sizes
      .filter(
        (size) =>
          size.category === "Adult" &&
          size.sizeType === "LETTER"
      )
      .map((size) => size.id);
  }

  const colorFamilies = useMemo(() => {
    const groups: Record<string, Color[]> = {};

    for (const color of colors) {
      const family = color.family?.trim() || "Other";

      if (!groups[family]) {
        groups[family] = [];
      }

      groups[family].push(color);
    }

    return Object.entries(groups).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [colors]);

  function toggleColorFamily(family: string) {
    setExpandedColorFamily((current) =>
      current === family ? null : family,
    );
  }

  const applicableSizes = useMemo(() => {
    const selectedCategory = categories.find(
      (category) => category.id === categoryId,
    );

    if (!selectedCategory) {
      return sizes;
    }

    const applicableIds = getApplicableSizeIds(
      selectedCategory.name,
    );

    return sizes.filter((size) =>
      applicableIds.includes(size.id),
    );
  }, [categories, categoryId, sizes]);

  const filteredSizes = useMemo(() => {
    const query = sizeSearch.trim().toLowerCase();

    if (!query) {
      return applicableSizes;
    }

    return applicableSizes.filter((size) =>
      size.name.toLowerCase().includes(query),
    );
  }, [applicableSizes, sizeSearch]);

  function toggleColor(colorId: string) {
    setSelectedColors((current) =>
      current.includes(colorId)
        ? current.filter((id) => id !== colorId)
        : [...current, colorId],
    );
  }

  function toggleSize(sizeId: string) {
    setSelectedSizes((current) =>
      current.includes(sizeId)
        ? current.filter((id) => id !== sizeId)
        : [...current, sizeId],
    );
  }

  function selectAllSizes() {
    setSelectedSizes(
      applicableSizes.map((size) => size.id),
    );
  }

  function clearAllSizes() {
    setSelectedSizes([]);
  }

  function generateVariants() {
    const generated: Variant[] = [];

    for (const colorId of selectedColors) {
      for (const sizeId of selectedSizes) {
        const existing = variants.find(
          (variant) =>
            variant.colorId === colorId &&
            variant.sizeId === sizeId,
        );

        generated.push(
          existing ?? {
            colorId,
            sizeId,
            sku: "",
            stock: 0,
            costPrice: "",
            retailPrice: retailPrice,
            resellerPrice: resellerPrice,
            isActive: true,
          },
        );
      }
    }

    setVariants(generated);
  }

  useEffect(() => {
    if (selectedColors.length && selectedSizes.length) {
      generateVariants();
    } else {
      setVariants([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColors, selectedSizes]);

  function updateVariant(
    colorId: string,
    sizeId: string,
    field: keyof Variant,
    value: string | number | boolean,
  ) {
    setVariants((current) =>
      current.map((variant) =>
        variant.colorId === colorId &&
        variant.sizeId === sizeId
          ? {
              ...variant,
              [field]: value,
            }
          : variant,
      ),
    );
  }

  function getColorName(id: string) {
    return colors.find((color) => color.id === id)?.name ?? id;
  }

  function getSizeName(id: string) {
    return sizes.find((size) => size.id === id)?.name ?? id;
  }

  function resetForm() {
    setName("");
    setCategoryId("");
    setSku("");
    setFabric("");
    setDescription("");
    setMrp("");
    setRetailPrice("");
    setResellerPrice("");
    setResellerMOQ("");
    setSelectedColors([]);
    setSelectedSizes([]);
    setVariants([]);
    setIsFeatured(false);
    setIsTrending(false);
    setIsNewArrival(false);
    setStatus("DRAFT");
  }

  async function uploadMediaFile(file: File) {
    setMediaError("");
    setUploadingMedia(true);
    setUploadProgress(0);

    try {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        throw new Error("Only image and video files are allowed");
      }

      const maxSize = isVideo
        ? 50 * 1024 * 1024
        : 10 * 1024 * 1024;

      if (file.size > maxSize) {
        throw new Error(
          isVideo
            ? "Video must be 50MB or smaller"
            : "Image must be 10MB or smaller",
        );
      }

      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(25);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(75);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      setMedia((current) => [
        ...current,
        {
          id: `temp-${Date.now()}-${Math.random()}`,
          type: data.type,
          url: data.url,
          thumbnailUrl: null,
          altText: file.name,
          sortOrder: current.length,
          isActive: true,
        },
      ]);

      setUploadProgress(100);
    } catch (error) {
      console.error("Media upload failed:", error);

      setMediaError(
        error instanceof Error
          ? error.message
          : "Upload failed",
      );
    } finally {
      setTimeout(() => {
        setUploadingMedia(false);
        setUploadProgress(0);
      }, 500);
    }
  }

  async function createProduct(event: React.FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Product name is required");
      return;
    }

    if (!categoryId) {
      alert("Select a category");
      return;
    }

    if (
      (salesMode === "RETAIL" || salesMode === "BOTH") &&
      !retailPrice
    ) {
      alert("Retail price is required");
      return;
    }

    if (
      (salesMode === "BULK" || salesMode === "BOTH") &&
      !resellerPrice
    ) {
      alert("Reseller price is required for bulk sales");
      return;
    }

    if (
      selectedColors.length > 0 &&
      selectedSizes.length > 0 &&
      variants.length === 0
    ) {
      alert("Generate product variants first");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          categoryId,
          gender,
          sku,
          fabric,
          description,
          mrp,
          retailPrice:
            salesMode === "BULK" ? "" : retailPrice,
          resellerPrice:
            salesMode === "RETAIL" ? "" : resellerPrice,
          resellerMOQ:
            salesMode === "RETAIL" ? "" : resellerMOQ,
          salesMode,
          status,
          isFeatured,
          isTrending,
          isNewArrival,

          variants: variants.map((variant) => ({
            colorId: variant.colorId,
            sizeId: variant.sizeId,
            sku: variant.sku || null,
            stock: Number(variant.stock || 0),
            costPrice:
              variant.costPrice === ""
                ? null
                : Number(variant.costPrice),
            retailPrice:
              variant.retailPrice === ""
                ? null
                : Number(variant.retailPrice),
            resellerPrice:
              variant.resellerPrice === ""
                ? null
                : Number(variant.resellerPrice),
            isActive: variant.isActive,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Failed to create product");
        return;
      }

      const createdProductId = data.id;

      if (createdProductId && media.length > 0) {
        for (const item of media) {
          const mediaResponse = await fetch("/api/media", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId: createdProductId,
              type: item.type,
              url: item.url,
              thumbnailUrl: item.thumbnailUrl ?? null,
              altText: item.altText ?? null,
            }),
          });

          if (!mediaResponse.ok) {
            console.error(
              "Failed to save product media:",
              await mediaResponse.text(),
            );
          }
        }
      }

      alert("Product created successfully");

      resetForm();
      setMedia([]);
      setMediaUrl("");
      setMediaAltText("");
      setMediaType("IMAGE");
      setSelectedMediaFile(null);
      setMediaError("");
      setUploadProgress(0);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const totalStock = variants.reduce(
    (total, variant) => total + Number(variant.stock || 0),
    0,
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
              AR FASHIONS
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Product Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Products, colors, sizes, pricing and stock variants
              అన్నీ ఒకే చోట manage చేయండి.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center">
              <p className="text-xl font-bold">
                {products.length}
              </p>
              <p className="text-[10px] uppercase text-slate-500">
                Products
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center">
              <p className="text-xl font-bold">
                {colors.length}
              </p>
              <p className="text-[10px] uppercase text-slate-500">
                Colors
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center">
              <p className="text-xl font-bold">
                {sizes.length}
              </p>
              <p className="text-[10px] uppercase text-slate-500">
                Sizes
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={createProduct}>

          {/* PRODUCT INFORMATION */}
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                01
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Product Information
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <Field
                label="Product Name *"
                value={name}
                onChange={setName}
                placeholder="Example: Premium Rayon Kurti"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Category *
                </label>

                <select
                  value={categoryId}
                  onChange={(event) =>
                    setCategoryId(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3.5 outline-none transition focus:border-emerald-400"
                >
                  <option value="">
                    Select Category / Subcategory
                  </option>

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
                  Gender *
                </label>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: "WOMEN", label: "Women" },
                    { value: "MEN", label: "Men" },
                    { value: "KIDS", label: "Kids" },
                    { value: "UNISEX", label: "Unisex" },
                  ].map((option) => {
                    const selected = gender === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setGender(
                            option.value as
                              | "WOMEN"
                              | "MEN"
                              | "KIDS"
                              | "UNISEX",
                          )
                        }
                        className={`rounded-2xl border px-4 py-3.5 text-sm font-bold transition ${
                          selected
                            ? "border-emerald-400 bg-emerald-400/15 text-emerald-300"
                            : "border-white/10 bg-slate-900 text-slate-400 hover:border-white/20"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Product SKU
                </label>

                <div className="flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3.5">
                  <div>
                    <p className="text-sm font-bold text-emerald-300">
                      Auto Generated
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      SKU will be assigned automatically after saving
                    </p>
                  </div>

                  <span className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-sm font-bold text-white">
                    AR-{{
                      WOMEN: "W",
                      MEN: "M",
                      KIDS: "K",
                      UNISEX: "U",
                    }[gender]}-XXX
                  </span>
                </div>
              </div>

              <Field
                label="Fabric"
                value={fabric}
                onChange={setFabric}
                placeholder="Cotton / Rayon / Denim..."
              />

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={4}
                  placeholder="Product details..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3.5 outline-none transition focus:border-emerald-400"
                />
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                02
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Pricing & Sales
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose how this product will be sold.
              </p>
            </div>

            {/* SALES MODE */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-slate-300">
                Sales Mode
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    value: "RETAIL" as const,
                    title: "Retail",
                    description: "Individual customer sales",
                  },
                  {
                    value: "BULK" as const,
                    title: "Bulk",
                    description: "Reseller / wholesale sales",
                  },
                  {
                    value: "BOTH" as const,
                    title: "Both",
                    description: "Retail + bulk sales",
                  },
                ].map((mode) => {
                  const selected = salesMode === mode.value;

                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setSalesMode(mode.value)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-emerald-400 bg-emerald-400/10"
                          : "border-white/10 bg-slate-900 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          {mode.title}
                        </span>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                            selected
                              ? "border-emerald-400 bg-emerald-400 text-slate-950"
                              : "border-white/20"
                          }`}
                        >
                          {selected ? "✓" : ""}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {mode.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PRICES */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

              {(salesMode === "RETAIL" || salesMode === "BOTH") && (
                <>
                  <PriceField
                    label="MRP"
                    value={mrp}
                    onChange={setMrp}
                  />

                  <PriceField
                    label="Retail Price *"
                    value={retailPrice}
                    onChange={setRetailPrice}
                  />
                </>
              )}

              {(salesMode === "BULK" || salesMode === "BOTH") && (
                <>
                  <PriceField
                    label="Reseller Price"
                    value={resellerPrice}
                    onChange={setResellerPrice}
                  />

                  <PriceField
                    label="Reseller MOQ"
                    value={resellerMOQ}
                    onChange={setResellerMOQ}
                  />
                </>
              )}

            </div>
          </section>

          {/* COLORS */}
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                03
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Product Colors
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {selectedColors.length} shades selected
              </p>
            </div>

            {colorFamilies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                No active colors found.
              </div>
            ) : (
              <div className="space-y-3">
                {colorFamilies.map(([family, familyColors]) => {
                  const expanded =
                    expandedColorFamily === family;

                  const selectedCount = familyColors.filter(
                    (color) =>
                      selectedColors.includes(color.id),
                  ).length;

                  return (
                    <div
                      key={family}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleColorFamily(family)
                        }
                        className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-white/[0.04]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {familyColors
                              .slice(0, 5)
                              .map((color) => (
                                <span
                                  key={color.id}
                                  className="h-7 w-7 rounded-full border-2 border-slate-900"
                                  style={{
                                    backgroundColor:
                                      color.hexCode ??
                                      "#64748b",
                                  }}
                                />
                              ))}
                          </div>

                          <div>
                            <p className="font-semibold text-white">
                              {family}
                            </p>

                            <p className="text-xs text-slate-500">
                              {familyColors.length} shades
                              {selectedCount > 0
                                ? ` · ${selectedCount} selected`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <span className="text-lg text-slate-400">
                          {expanded ? "−" : "+"}
                        </span>
                      </button>

                      {expanded && (
                        <div className="border-t border-white/10 p-4">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {familyColors.map((color) => {
                              const selected =
                                selectedColors.includes(
                                  color.id,
                                );

                              return (
                                <button
                                  key={color.id}
                                  type="button"
                                  onClick={() =>
                                    toggleColor(color.id)
                                  }
                                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                                    selected
                                      ? "border-emerald-400 bg-emerald-400/10"
                                      : "border-white/10 bg-slate-950 hover:border-white/20"
                                  }`}
                                >
                                  <span
                                    className="h-8 w-8 shrink-0 rounded-full border border-white/20 shadow-inner"
                                    style={{
                                      backgroundColor:
                                        color.hexCode ??
                                        "#64748b",
                                    }}
                                  />

                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-white">
                                      {color.name}
                                    </span>

                                    {color.hexCode && (
                                      <span className="block text-[10px] uppercase text-slate-500">
                                        {color.hexCode}
                                      </span>
                                    )}
                                  </span>

                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                                      selected
                                        ? "border-emerald-400 bg-emerald-400 text-slate-950"
                                        : "border-white/20"
                                    }`}
                                  >
                                    {selected ? "✓" : ""}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                    onClick={() => toggleSize(size.id)}
                    className={`min-w-16 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      selected
                        ? "border-emerald-400 bg-emerald-400 text-slate-950"
                        : "border-white/10 bg-slate-900 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    {size.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* VARIANT MATRIX */}
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
                {selectedColors.length} × {selectedSizes.length} combinations
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
                      <th className="px-4 py-4 font-semibold text-slate-300">
                        Color
                      </th>
                      <th className="px-4 py-4 font-semibold text-slate-300">
                        Size
                      </th>
                      <th className="px-4 py-4 font-semibold text-slate-300">
                        Stock
                      </th>
                      <th className="px-4 py-4 font-semibold text-slate-300">
                        Cost
                      </th>
                      <th className="px-4 py-4 font-semibold text-slate-300">
                        Retail
                      </th>
                      <th className="px-4 py-4 font-semibold text-slate-300">
                        Reseller
                      </th>
                      <th className="px-4 py-4 font-semibold text-slate-300">
                        SKU
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {variants.map((variant) => (
                      <tr key={`${variant.colorId}-${variant.sizeId}`}>
                        <td className="px-4 py-3 font-medium">
                          {getColorName(variant.colorId)}
                        </td>

                        <td className="px-4 py-3 font-semibold">
                          {getSizeName(variant.sizeId)}
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
                                Number(event.target.value),
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
                            placeholder="₹"
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
                            placeholder="₹"
                            className="w-24 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={variant.resellerPrice}
                            onChange={(event) =>
                              updateVariant(
                                variant.colorId,
                                variant.sizeId,
                                "resellerPrice",
                                event.target.value,
                              )
                            }
                            placeholder="₹"
                            className="w-24 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex min-w-[150px] items-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 font-mono text-xs font-bold text-emerald-300">
                            Auto Generated
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* PRODUCT MEDIA */}
          <section className="mb-6 rounded-3xl border border-purple-400/20 bg-purple-400/[0.03] p-5 sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
                06
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Product Media
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Upload product images and videos directly from your device.
              </p>
            </div>

            {/* UPLOAD BOX */}
            <div className="rounded-3xl border border-dashed border-purple-400/30 bg-purple-400/[0.04] p-6 text-center">
              <input
                id="product-media-upload"
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                disabled={uploadingMedia}
                onChange={async (event) => {
                  const files = Array.from(
                    event.target.files ?? [],
                  );

                  for (const file of files) {
                    await uploadMediaFile(file);
                  }

                  event.target.value = "";
                }}
              />

              <label
                htmlFor="product-media-upload"
                className="mx-auto flex max-w-xl cursor-pointer flex-col items-center rounded-2xl border border-white/10 bg-slate-900 p-8 transition hover:border-purple-400/50 hover:bg-purple-400/5"
              >
                <span className="text-4xl">📷</span>

                <span className="mt-3 text-lg font-bold">
                  Upload Product Media
                </span>

                <span className="mt-1 text-sm text-slate-500">
                  Select multiple images or videos
                </span>

                <span className="mt-3 rounded-xl bg-purple-400 px-5 py-2.5 text-sm font-bold text-slate-950">
                  {uploadingMedia ? "Uploading..." : "Choose Files"}
                </span>
              </label>

              <p className="mt-4 text-xs text-slate-500">
                Images up to 10MB · Videos up to 50MB
              </p>

              {uploadingMedia && (
                <div className="mx-auto mt-5 max-w-xl">
                  <div className="mb-2 flex justify-between text-xs text-slate-400">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-purple-400 transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {mediaError && (
                <p className="mt-4 text-sm font-medium text-red-400">
                  {mediaError}
                </p>
              )}
            </div>

            {/* ALT TEXT */}
            <div className="mt-4">
              <input
                value={mediaAltText}
                onChange={(event) =>
                  setMediaAltText(event.target.value)
                }
                placeholder="Alt text / media description (optional)"
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3.5 text-sm outline-none focus:border-purple-400"
              />
            </div>

            {/* MEDIA PREVIEW */}
            {media.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <p className="font-semibold text-slate-300">
                  No product media added
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Choose images or videos above to add them to the product.
                </p>
              </div>
            ) : (
              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">
                      Selected Media
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {media.length} media item{media.length === 1 ? "" : "s"} selected
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {media.map((item, index) => (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
                    >
                      <div className="aspect-square bg-slate-950">
                        {item.type === "IMAGE" ? (
                          <img
                            src={item.url}
                            alt={item.altText ?? "Product image"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <video
                            src={item.url}
                            controls
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      <div className="absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                        {item.type}
                      </div>

                      <div className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                        #{index + 1}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setMedia((current) =>
                            current.filter(
                              (mediaItem) =>
                                mediaItem.id !== item.id,
                            ),
                          )
                        }
                        className="absolute bottom-2 left-2 right-2 rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white opacity-90 transition hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
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
                enabled={isFeatured}
                onChange={setIsFeatured}
              />

              <Toggle
                label="Trending"
                description="Show as trending"
                enabled={isTrending}
                onChange={setIsTrending}
              />

              <Toggle
                label="New Arrival"
                description="Show as new arrival"
                enabled={isNewArrival}
                onChange={setIsNewArrival}
              />

              <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                <p className="text-sm font-semibold">
                  Status
                </p>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value)
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

          {/* SAVE */}
          <div className="sticky bottom-4 z-20 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="px-2">
                <p className="text-sm font-semibold">
                  Ready to save?
                </p>

                <p className="text-xs text-slate-500">
                  {variants.length} variants · {totalStock} stock units
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-400 px-7 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
                >
                  {saving
                    ? "Saving Product..."
                    : "Save Product"}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* PRODUCT LIST */}
        <section className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="border-b border-white/10 px-5 py-5 sm:px-7">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Catalog
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Existing Products ({products.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No products added yet.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-4 px-5 py-5 sm:px-7 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">
                        {product.name}
                      </h3>

                      <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-400">
                        {product.status}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-emerald-400">
                      {product.category.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {product.sku ?? "No SKU"} ·{" "}
                      {product._count.variants} variants ·{" "}
                      {product._count.media} media
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <div className="text-left md:text-right">
                      <p className="font-bold">
                        ₹
                        {Number(
                          product.retailPrice,
                        ).toLocaleString("en-IN")}
                      </p>

                      {product.resellerPrice !== null && (
                        <p className="text-sm text-emerald-400">
                          Reseller ₹
                          {Number(
                            product.resellerPrice,
                          ).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>

                    <a
                      href={`/admin/products/${product.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-400 transition hover:bg-emerald-400 hover:text-slate-950"
                    >
                      ✏️ Edit
                    </a>
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
        <span className="text-slate-500">₹</span>

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

"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadAdminProductMedia } from "@/lib/admin-client-upload";
import {
  KIDS_SIZE_PRESETS,
  KIDS_SIZE_REFERENCE_NOTE,
  getKidsSizePreset,
  kidsHeightCmToInches,
} from "@/lib/kids-size-presets";
import {
  SKU_PRODUCT_TYPES,
  buildProductSku,
  buildVariantSku,
  formatDesignNumber,
  getMainSkuCode,
  type MainSkuCode,
} from "@/lib/sku-system";

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
  inches?: string | null;
  ageGuide?: string | null;
  heightCm?: string | null;
  chestIn?: string | null;
  waistIn?: string | null;
  hipIn?: string | null;
  garmentLengthIn?: string | null;
  fitNote?: string | null;
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
  colorId?: string | null;
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
  const [
    skuProductTypeCode,
    setSkuProductTypeCode,
  ] = useState("");
  const [
    designNumber,
    setDesignNumber,
  ] = useState("");
  const [fabric, setFabric] = useState("");
  const [description, setDescription] = useState("");

  const [mrp, setMrp] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [resellerPrice, setResellerPrice] = useState("");
  const [resellerMOQ, setResellerMOQ] = useState("");

  const [
    smartStockBalance,
    setSmartStockBalance,
  ] = useState(false);

  const [salesMode, setSalesMode] = useState<
    "RETAIL" | "BULK" | "BOTH"
  >("BOTH");

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [
    colorSizeSelections,
    setColorSizeSelections,
  ] = useState<Record<string, string[]>>({});
  const [sizeSearch, setSizeSearch] = useState("");
  const [
    kidsSizeDisplayMode,
    setKidsSizeDisplayMode,
  ] = useState<
    "YEARS" | "CM" | "INCHES"
  >("YEARS");
  const [colorSearch, setColorSearch] = useState("");
  const [expandedColorFamily, setExpandedColorFamily] = useState<string | null>(null);

  const [showCreateColor, setShowCreateColor] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorFamily, setNewColorFamily] = useState("");
  const [newColorHex, setNewColorHex] = useState("#7B7066");
  const [creatingColor, setCreatingColor] = useState(false);

  const [showCreateSize, setShowCreateSize] = useState(false);
  const [newSizeName, setNewSizeName] = useState("");
  const [newSizeCategory, setNewSizeCategory] = useState("Kids");
  const [newSizeType, setNewSizeType] = useState("AGE");
  const [newSizeInches, setNewSizeInches] = useState("");
  const [newSizeAgeGuide, setNewSizeAgeGuide] = useState("");
  const [newSizeHeightCm, setNewSizeHeightCm] = useState("");
  const [newSizeChestIn, setNewSizeChestIn] = useState("");
  const [newSizeWaistIn, setNewSizeWaistIn] = useState("");
  const [newSizeHipIn, setNewSizeHipIn] = useState("");
  const [newSizeGarmentLengthIn, setNewSizeGarmentLengthIn] = useState("");
  const [newSizeFitNote, setNewSizeFitNote] = useState("");
  const [newSizePreset, setNewSizePreset] = useState("");
  const [creatingSize, setCreatingSize] = useState(false);
  const [
    selectingAllKidsSizes,
    setSelectingAllKidsSizes,
  ] = useState(false);

  const [
    kidsProductMeasurements,
    setKidsProductMeasurements,
  ] = useState<
    Record<
      string,
      {
        chestIn: string;
        waistIn: string;
        garmentLengthIn: string;
      }
    >
  >({});

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
  const [
    mediaColorId,
    setMediaColorId,
  ] = useState("");



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

  const selectedCategory =
    useMemo(
      () =>
        categories.find(
          (category) =>
            category.id ===
            categoryId,
        ) ?? null,
      [
        categories,
        categoryId,
      ],
    );

  const selectedMainCategoryName =
    useMemo(() => {
      if (!selectedCategory) {
        return "";
      }

      return selectedCategory.name
        .split("→")[0]
        ?.trim() ?? "";
    }, [
      selectedCategory,
    ]);

  const selectedMainSkuCode:
    MainSkuCode | null =
    useMemo(
      () =>
        getMainSkuCode(
          selectedMainCategoryName,
        ),
      [
        selectedMainCategoryName,
      ],
    );

  const skuProductTypeOptions =
    selectedMainSkuCode
      ? SKU_PRODUCT_TYPES[
          selectedMainSkuCode
        ]
      : [];

  const nextDesignNumber =
    useMemo(() => {
      if (
        !selectedMainSkuCode ||
        !skuProductTypeCode
      ) {
        return "001";
      }

      const prefix =
        `${selectedMainSkuCode}-${skuProductTypeCode}-`;

      let max = 0;

      for (
        const product of
        products
      ) {
        const productSku =
          product.sku ??
          "";

        if (
          !productSku.startsWith(
            prefix,
          )
        ) {
          continue;
        }

        const match =
          productSku
            .slice(
              prefix.length,
            )
            .match(
              /^(\d+)/,
            );

        if (match) {
          max = Math.max(
            max,
            Number(
              match[1],
            ) || 0,
          );
        }
      }

      return String(
        max + 1,
      ).padStart(
        3,
        "0",
      );
    }, [
      products,
      selectedMainSkuCode,
      skuProductTypeCode,
    ]);

  useEffect(() => {
    if (
      skuProductTypeCode &&
      !designNumber
    ) {
      setDesignNumber(
        nextDesignNumber,
      );
    }
  }, [
    skuProductTypeCode,
    nextDesignNumber,
    designNumber,
  ]);

  useEffect(() => {
    if (
      !selectedMainSkuCode ||
      !skuProductTypeCode ||
      !designNumber
    ) {
      setSku("");
      return;
    }

    setSku(
      buildProductSku(
        selectedMainSkuCode,
        skuProductTypeCode,
        designNumber,
      ),
    );
  }, [
    selectedMainSkuCode,
    skuProductTypeCode,
    designNumber,
  ]);

  function handleCategoryChange(
    nextCategoryId: string,
  ) {
    setCategoryId(
      nextCategoryId,
    );

    const nextCategory =
      categories.find(
        (item) =>
          item.id ===
          nextCategoryId,
      );

    const mainName =
      nextCategory?.name
        .split("→")[0]
        ?.trim() ?? "";

    const mainCode =
      getMainSkuCode(
        mainName,
      );

    setSkuProductTypeCode("");
    setDesignNumber("");
    setSku("");

    if (mainCode === "WM") {
      setGender("WOMEN");
    } else if (
      mainCode === "MN"
    ) {
      setGender("MEN");
    } else if (
      mainCode === "GK" ||
      mainCode === "BK"
    ) {
      setGender("KIDS");
    }
  }

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

  const filteredColorFamilies = useMemo(() => {
    const query = colorSearch.trim().toLowerCase();

    if (!query) {
      return colorFamilies;
    }

    return colorFamilies
      .map(([family, familyColors]) => [
        family,
        familyColors.filter((color) =>
          [
            color.name,
            color.family ?? "",
            color.hexCode ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(query),
        ),
      ] as [string, Color[]])
      .filter(
        ([family, familyColors]) =>
          family.toLowerCase().includes(query) ||
          familyColors.length > 0,
      )
      .map(([family, familyColors]) => {
        if (family.toLowerCase().includes(query)) {
          return [
            family,
            colorFamilies.find(([name]) => name === family)?.[1] ?? familyColors,
          ] as [string, Color[]];
        }

        return [family, familyColors] as [string, Color[]];
      });
  }, [colorFamilies, colorSearch]);

  function toggleColorFamily(family: string) {
    setExpandedColorFamily((current) =>
      current === family ? null : family,
    );
  }

  async function quickCreateColor() {
    const name = newColorName.trim();

    if (!name) {
      alert("Colour name is required");
      return;
    }

    setCreatingColor(true);

    try {
      const response = await fetch("/api/colors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          family: newColorFamily.trim() || null,
          hexCode: newColorHex.trim() || null,
          isActive: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Failed to create colour");
        return;
      }

      const created = data as Color;

      setColors((current) => [...current, created]);
      setSelectedColors((current) =>
        current.includes(created.id)
          ? current
          : [...current, created.id],
      );
      setColorSizeSelections((current) => ({
        ...current,
        [created.id]: current[created.id] ?? [],
      }));
      setMediaColorId((current) => current || created.id);
      setExpandedColorFamily(created.family?.trim() || "Other");
      setColorSearch("");
      setNewColorName("");
      setNewColorFamily("");
      setNewColorHex("#7B7066");
      setShowCreateColor(false);
    } catch (error) {
      console.error("Quick colour create failed:", error);
      alert("Something went wrong while creating colour");
    } finally {
      setCreatingColor(false);
    }
  }

  function applyKidsSizePreset(value: string) {
    setNewSizePreset(value);

    const preset = getKidsSizePreset(value);

    if (!preset) {
      return;
    }

    setNewSizeName(preset.sizeLabel);
    setNewSizeCategory("Kids");
    setNewSizeType("AGE");
    setNewSizeInches(
      kidsHeightCmToInches(
        preset.heightCm,
      ),
    );
    setNewSizeAgeGuide(preset.ageGuide);
    setNewSizeHeightCm(preset.heightCm);
    setNewSizeChestIn(preset.chestIn);
    setNewSizeWaistIn(preset.waistIn);
    setNewSizeHipIn(preset.hipIn);
    setNewSizeGarmentLengthIn("");
    setNewSizeFitNote(
      KIDS_SIZE_REFERENCE_NOTE,
    );
  }

  async function quickCreateSize() {
    const name = newSizeName.trim();

    if (!name) {
      alert("Size name is required");
      return;
    }

    setCreatingSize(true);

    try {
      const response = await fetch("/api/sizes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          category: newSizeCategory.trim() || null,
          sizeType: newSizeType.trim() || null,
          inches: newSizeInches.trim() || null,
          ageGuide: newSizeAgeGuide.trim() || null,
          heightCm: newSizeHeightCm.trim() || null,
          chestIn: newSizeChestIn.trim() || null,
          waistIn: newSizeWaistIn.trim() || null,
          hipIn: newSizeHipIn.trim() || null,
          garmentLengthIn: newSizeGarmentLengthIn.trim() || null,
          fitNote: newSizeFitNote.trim() || null,
          isActive: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Failed to create size");
        return;
      }

      const created = data as Size;

      setSizes((current) => [...current, created]);
      setSizeSearch(created.name);
      setNewSizeName("");
      setNewSizeInches("");
      setNewSizeAgeGuide("");
      setNewSizeHeightCm("");
      setNewSizeChestIn("");
      setNewSizeWaistIn("");
      setNewSizeHipIn("");
      setNewSizeGarmentLengthIn("");
      setNewSizeFitNote("");
      setNewSizePreset("");
      setShowCreateSize(false);
    } catch (error) {
      console.error("Quick size create failed:", error);
      alert("Something went wrong while creating size");
    } finally {
      setCreatingSize(false);
    }
  }

  useEffect(() => {
    const selectedCategory = categories.find(
      (category) => category.id === categoryId,
    );

    const categoryName =
      selectedCategory?.name.toLowerCase() ?? "";

    const isKids =
      gender === "KIDS" ||
      categoryName.includes("kids") ||
      categoryName.includes("girls") ||
      categoryName.includes("boys") ||
      categoryName.includes("baby");

    setNewSizeCategory(isKids ? "Kids" : "Adult");
    setNewSizeType(isKids ? "AGE" : "LETTER");
  }, [categories, categoryId, gender]);

  const isKidsProduct = useMemo(() => {
    const selectedCategory =
      categories.find(
        (category) =>
          category.id ===
          categoryId,
      );

    const categoryName =
      selectedCategory?.name.toLowerCase() ??
      "";

    return (
      gender === "KIDS" ||
      categoryName.includes("kids") ||
      categoryName.includes("girls") ||
      categoryName.includes("boys") ||
      categoryName.includes("baby")
    );
  }, [
    categories,
    categoryId,
    gender,
  ]);

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
    const query =
      sizeSearch
        .trim()
        .toLowerCase();

    if (!query) {
      return applicableSizes;
    }

    return applicableSizes.filter(
      (size) =>
        [
          size.name,
          size.ageGuide ?? "",
          size.heightCm ?? "",
          size.inches ?? "",
          size.chestIn ?? "",
          size.waistIn ?? "",
          size.hipIn ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
    );
  }, [
    applicableSizes,
    sizeSearch,
  ]);

  const selectedKidsSizeIds =
    useMemo(() => {
      if (!isKidsProduct) {
        return [];
      }

      const selected =
        new Set<string>();

      for (
        const colorId of
        selectedColors
      ) {
        for (
          const sizeId of
          colorSizeSelections[
            colorId
          ] ?? []
        ) {
          selected.add(
            sizeId,
          );
        }
      }

      return applicableSizes
        .filter((size) =>
          selected.has(
            size.id,
          ),
        )
        .map((size) =>
          size.id,
        );
    }, [
      applicableSizes,
      colorSizeSelections,
      isKidsProduct,
      selectedColors,
    ]);

  function updateKidsProductMeasurement(
    sizeId: string,
    field:
      | "chestIn"
      | "waistIn"
      | "garmentLengthIn",
    value: string,
  ) {
    setKidsProductMeasurements(
      (current) => ({
        ...current,
        [sizeId]: {
          chestIn:
            current[sizeId]
              ?.chestIn ??
            "",
          waistIn:
            current[sizeId]
              ?.waistIn ??
            "",
          garmentLengthIn:
            current[sizeId]
              ?.garmentLengthIn ??
            "",
          [field]: value,
        },
      }),
    );
  }

  function toggleColor(colorId: string) {
    setSelectedColors((current) => {
      const removing =
        current.includes(colorId);

      const next =
        removing
          ? current.filter(
              (id) =>
                id !== colorId,
            )
          : [
              ...current,
              colorId,
            ];

      setColorSizeSelections(
        (currentSizes) => {
          const nextSizes = {
            ...currentSizes,
          };

          if (removing) {
            delete nextSizes[
              colorId
            ];
          } else if (
            !nextSizes[colorId]
          ) {
            nextSizes[colorId] =
              [];
          }

          return nextSizes;
        },
      );

      if (
        removing &&
        mediaColorId ===
          colorId
      ) {
        setMediaColorId(
          next[0] ?? "",
        );
      } else if (
        !mediaColorId &&
        !removing
      ) {
        setMediaColorId(
          colorId,
        );
      }

      return next;
    });
  }

  function toggleSizeForColor(
    colorId: string,
    sizeId: string,
  ) {
    setColorSizeSelections(
      (current) => {
        const currentIds =
          current[colorId] ??
          [];

        return {
          ...current,
          [colorId]:
            currentIds.includes(
              sizeId,
            )
              ? currentIds.filter(
                  (id) =>
                    id !== sizeId,
                )
              : [
                  ...currentIds,
                  sizeId,
                ],
        };
      },
    );
  }

  const STANDARD_KIDS_SIZE_NAMES = [
    "0-3M",
    "3-6M",
    "6-9M",
    "9-12M",
    "1-2Y",
    "2-3Y",
    "3-4Y",
    "4-5Y",
    "5-6Y",
    "6-7Y",
    "7-8Y",
    "8-9Y",
    "9-10Y",
    "10-11Y",
    "11-12Y",
    "12-13Y",
    "13-14Y",
    "14-15Y",
    "15-16Y",
    "16-17Y",
  ] as const;

  async function selectAllKidsSizesForAllColours() {
    if (
      selectedColors.length ===
      0
    ) {
      alert(
        "First select at least one colour.",
      );
      return;
    }

    setSelectingAllKidsSizes(
      true,
    );

    try {
      let workingSizes =
        [...sizes];

      for (
        let index = 0;
        index <
        STANDARD_KIDS_SIZE_NAMES.length;
        index += 1
      ) {
        const sizeName =
          STANDARD_KIDS_SIZE_NAMES[
            index
          ];

        const existing =
          workingSizes.find(
            (size) =>
              size.category ===
                "Kids" &&
              size.name ===
                sizeName,
          );

        if (existing) {
          continue;
        }

        const preset =
          getKidsSizePreset(
            sizeName,
          );

        const response =
          await fetch(
            "/api/sizes",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              credentials:
                "include",
              body:
                JSON.stringify({
                  name:
                    sizeName,
                  category:
                    "Kids",
                  sizeType:
                    "AGE",
                  inches:
                    preset
                      ? kidsHeightCmToInches(
                          preset.heightCm,
                        )
                      : sizeName ===
                          "1-2Y"
                        ? "30-36 in"
                        : null,
                  ageGuide:
                    preset?.ageGuide ??
                    sizeName,
                  heightCm:
                    preset?.heightCm ??
                    null,
                  chestIn:
                    preset?.chestIn ??
                    null,
                  waistIn:
                    preset?.waistIn ??
                    null,
                  hipIn:
                    preset?.hipIn ??
                    null,
                  garmentLengthIn:
                    null,
                  fitNote:
                    KIDS_SIZE_REFERENCE_NOTE,
                  sortOrder:
                    50 +
                    index,
                  isActive:
                    true,
                }),
            },
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ??
              `Failed to create ${sizeName}`,
          );
        }

        workingSizes = [
          ...workingSizes,
          data as Size,
        ];
      }

      const allKidsSizeIds =
        STANDARD_KIDS_SIZE_NAMES
          .map(
            (name) =>
              workingSizes.find(
                (size) =>
                  size.category ===
                    "Kids" &&
                  size.name ===
                    name,
              )?.id,
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
          );

      setSizes(
        workingSizes,
      );

      setColorSizeSelections(
        (current) => {
          const next = {
            ...current,
          };

          for (
            const colorId of
            selectedColors
          ) {
            next[colorId] =
              allKidsSizeIds;
          }

          return next;
        },
      );

      setSizeSearch("");

      alert(
        `All kids sizes selected for ${selectedColors.length} colour(s): 0-3M to 16-17Y.`,
      );
    } catch (error) {
      console.error(
        "Select all kids sizes failed:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to select all kids sizes.",
      );
    } finally {
      setSelectingAllKidsSizes(
        false,
      );
    }
  }

  function selectAllSizesForColor(
    colorId: string,
  ) {
    setColorSizeSelections(
      (current) => ({
        ...current,
        [colorId]:
          applicableSizes.map(
            (size) =>
              size.id,
          ),
      }),
    );
  }

  function clearAllSizesForColor(
    colorId: string,
  ) {
    setColorSizeSelections(
      (current) => ({
        ...current,
        [colorId]: [],
      }),
    );
  }

  function generateVariants() {
    const generated: Variant[] =
      [];

    for (
      const colorId of
      selectedColors
    ) {
      const sizeIds =
        colorSizeSelections[
          colorId
        ] ?? [];

      for (
        const sizeId of
        sizeIds
      ) {
        const existing =
          variants.find(
            (variant) =>
              variant.colorId ===
                colorId &&
              variant.sizeId ===
                sizeId,
          );

        generated.push(
          existing ?? {
            colorId,
            sizeId,
            sku: "",
            stock: 0,
            costPrice: "",
            retailPrice:
              retailPrice,
            resellerPrice:
              resellerPrice,
            isActive: true,
          },
        );
      }
    }

    setVariants(
      generated,
    );
  }

  useEffect(() => {
    if (
      selectedColors.length
    ) {
      generateVariants();
    } else {
      setVariants([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedColors,
    colorSizeSelections,
  ]);

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

  function getRawSizeName(
    id: string,
  ) {
    return (
      sizes.find(
        (size) =>
          size.id === id,
      )?.name ?? id
    );
  }

  function getSizeDisplayLabel(
    size: Size,
  ) {
    if (!isKidsProduct) {
      return size.name;
    }

    if (
      kidsSizeDisplayMode ===
      "CM"
    ) {
      return size.heightCm
        ? `${size.heightCm} cm`
        : size.name;
    }

    if (
      kidsSizeDisplayMode ===
      "INCHES"
    ) {
      return size.inches
        ? `${size.inches} in`
        : size.name;
    }

    return (
      size.ageGuide ||
      size.name
    );
  }

  function getSizeDisplayMeta(
    size: Size,
  ) {
    if (!isKidsProduct) {
      return "";
    }

    if (
      kidsSizeDisplayMode ===
      "CM"
    ) {
      return (
        size.ageGuide ||
        size.name
      );
    }

    if (
      kidsSizeDisplayMode ===
      "INCHES"
    ) {
      return (
        size.ageGuide ||
        size.name
      );
    }

    return size.heightCm
      ? `${size.heightCm} cm`
      : "";
  }

  function getSizeName(id: string) {
    const size =
      sizes.find(
        (item) =>
          item.id === id,
      );

    return size
      ? getSizeDisplayLabel(size)
      : id;
  }

  function resetForm() {
    setName("");
    setCategoryId("");
    setSku("");
    setSkuProductTypeCode("");
    setDesignNumber("");
    setFabric("");
    setDescription("");
    setMrp("");
    setRetailPrice("");
    setResellerPrice("");
    setResellerMOQ("");
    setColorSearch("");
    setSizeSearch("");
    setKidsSizeDisplayMode(
      "YEARS",
    );
    setKidsProductMeasurements(
      {},
    );
    setShowCreateColor(false);
    setShowCreateSize(false);
    setSelectedColors([]);
    setColorSizeSelections({});
    setMediaColorId("");
    setVariants([]);
    setIsFeatured(false);
    setIsTrending(false);
    setIsNewArrival(false);
    setStatus("DRAFT");
  }

  async function uploadMediaFile(file: File) {
    setMediaError("");

    if (!mediaColorId) {
      setMediaError(
        "Select a product colour before uploading its photos or video.",
      );
      return;
    }
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

      setUploadProgress(1);

      const data =
        await uploadAdminProductMedia(
          file,
          (
            percentage,
          ) => {
            setUploadProgress(
              Math.max(
                1,
                percentage,
              ),
            );
          },
        );

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
          colorId:
            mediaColorId,
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

    if (!selectedMainSkuCode) {
      alert(
        "Select a category under Women, Men, Girl Kids or Boy Kids.",
      );
      return;
    }

    if (!skuProductTypeCode) {
      alert(
        "Select SKU product type.",
      );
      return;
    }

    if (
      !formatDesignNumber(
        designNumber,
      )
    ) {
      alert(
        "Enter design number.",
      );
      return;
    }

    if (!sku) {
      alert(
        "Unable to generate product SKU.",
      );
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
      selectedColors.length ===
      0
    ) {
      alert(
        "Select at least one product colour.",
      );
      return;
    }

    if (
      selectedColors.some(
        (colorId) =>
          (
            colorSizeSelections[
              colorId
            ] ?? []
          ).length === 0,
      )
    ) {
      alert(
        "Select available sizes separately for every selected colour.",
      );
      return;
    }

    if (
      variants.length === 0
    ) {
      alert(
        "Select colour-wise sizes to create variants.",
      );
      return;
    }

    if (
      media.some(
        (item) =>
          !item.colorId,
      )
    ) {
      alert(
        "Every product photo/video must be assigned to a colour.",
      );
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
          skuProductTypeCode,
          designNumber:
            formatDesignNumber(
              designNumber,
            ),
          fabric,
          description,
          mrp,
          retailPrice:
            salesMode === "BULK" ? "" : retailPrice,
          resellerPrice:
            salesMode === "RETAIL" ? "" : resellerPrice,
          resellerMOQ:
            salesMode === "RETAIL" ? "" : resellerMOQ,

          smartStockBalance:
            salesMode === "RETAIL"
              ? false
              : smartStockBalance,

          salesMode,
          status,
          isFeatured,
          isTrending,
          isNewArrival,

          kidsSizeMeasurements:
            selectedKidsSizeIds.map(
              (sizeId) => ({
                sizeId,
                chestIn:
                  kidsProductMeasurements[
                    sizeId
                  ]?.chestIn ??
                  "",
                waistIn:
                  kidsProductMeasurements[
                    sizeId
                  ]?.waistIn ??
                  "",
                garmentLengthIn:
                  kidsProductMeasurements[
                    sizeId
                  ]?.garmentLengthIn ??
                  "",
              }),
            ),

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
              colorId:
                item.colorId ??
                null,
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
              AS FASHIONS
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Product Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Products, colors, sizes, pricing and stock variants
              అన్నీ ఒకే చోట manage చేయండి.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

            <a
              href="/admin/product-catalog"
              className="flex flex-col items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-center transition hover:bg-emerald-400/20"
            >
              <p className="text-xl font-bold text-emerald-300">⌕</p>
              <p className="text-[10px] font-bold uppercase text-emerald-400">
                Catalog
              </p>
            </a>
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
                    handleCategoryChange(
                      event.target.value,
                    )
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

              <div className="md:col-span-2 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.045] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
                      AS FASHIONS Universal SKU
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Website, Amazon, Flipkart, Meesho and godown stock ki same SKU system.
                    </p>
                  </div>

                  <span className="rounded-full border border-emerald-400/20 bg-slate-950 px-3 py-1.5 font-mono text-[10px] font-black text-emerald-300">
                    MAIN-TYPE-DESIGN-COLOR-SIZE
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[.65fr_1.35fr_.85fr]">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Main Code
                    </label>

                    <div className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm font-black text-white">
                      {selectedMainSkuCode ??
                        "—"}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Product Type *
                    </label>

                    <select
                      value={
                        skuProductTypeCode
                      }
                      onChange={(event) => {
                        setSkuProductTypeCode(
                          event.target.value,
                        );
                        setDesignNumber(
                          "",
                        );
                      }}
                      disabled={
                        !selectedMainSkuCode
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400 disabled:opacity-50"
                    >
                      <option value="">
                        Select Product Type
                      </option>

                      {skuProductTypeOptions.map(
                        (option) => (
                          <option
                            key={
                              option.code
                            }
                            value={
                              option.code
                            }
                          >
                            {
                              option.label
                            }{" "}
                            — {
                              option.code
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Design No. *
                    </label>

                    <div className="flex gap-2">
                      <input
                        value={
                          designNumber
                        }
                        onChange={(event) =>
                          setDesignNumber(
                            event.target.value
                              .replace(
                                /\D+/g,
                                "",
                              )
                              .slice(
                                0,
                                6,
                              ),
                          )
                        }
                        inputMode="numeric"
                        placeholder="014"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm font-black outline-none focus:border-emerald-400"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setDesignNumber(
                            nextDesignNumber,
                          )
                        }
                        disabled={
                          !selectedMainSkuCode ||
                          !skuProductTypeCode
                        }
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 text-[9px] font-black uppercase text-emerald-300 disabled:opacity-40"
                      >
                        Next {
                          nextDesignNumber
                        }
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-slate-950/80 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Product Family SKU
                  </p>

                  <p className="mt-2 break-all font-mono text-lg font-black tracking-wide text-emerald-300">
                    {sku ||
                      "Select category + product type + design number"}
                  </p>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Same design lo colours/sizes maarina product family code maaradu. Variant SKU ki colour + size automatic ga append avutayi.
                  </p>
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

            {(salesMode === "BULK" ||
              salesMode === "BOTH") && (
              <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="max-w-xl">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
                      Smart Stock Balance
                    </p>

                    <h3 className="mt-2 text-base font-black text-white">
                      Auto Assorted Reseller Pack
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      Seller stock balanced ga move
                      avvadaniki available colours
                      and sizes automatic ga pack lo
                      distribute avutayi.
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      ON unte reseller single colour
                      or single size lo full MOQ
                      select cheyyaleru. System
                      current stock batti exact pack
                      automatic ga prepare chestundi.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSmartStockBalance(
                        (current) =>
                          !current,
                      )
                    }
                    className={`min-w-[88px] rounded-full px-4 py-3 text-xs font-black transition ${
                      smartStockBalance
                        ? "bg-emerald-400 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {smartStockBalance
                      ? "ON"
                      : "OFF"}
                  </button>
                </div>

                {smartStockBalance ? (
                  <div className="mt-4 rounded-2xl border border-emerald-400/10 bg-slate-950/40 p-4">
                    <p className="text-xs font-bold text-emerald-300">
                      ✓ Balanced allocation active
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      Every available colour-size
                      combination gets priority.
                      Remaining pieces move from
                      higher-stock variants so dead
                      stock is reduced.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-white/5 bg-slate-950/30 p-4">
                    <p className="text-[11px] leading-5 text-slate-500">
                      OFF = reseller can manually mix
                      colours and sizes.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* COLORS */}
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
            <div className="mb-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
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

                <button
                  type="button"
                  onClick={() =>
                    setShowCreateColor((current) => !current)
                  }
                  className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm font-bold text-emerald-400 transition hover:bg-emerald-400 hover:text-slate-950"
                >
                  {showCreateColor ? "Close" : "+ Create Colour"}
                </button>
              </div>

              <div className="mt-4 relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  ⌕
                </span>
                <input
                  value={colorSearch}
                  onChange={(event) =>
                    setColorSearch(event.target.value)
                  }
                  placeholder="Search colour name, family or hex..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                />
              </div>

              {showCreateColor && (
                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
                  <p className="text-sm font-bold text-emerald-300">
                    Quick Create Colour
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <input
                      value={newColorName}
                      onChange={(event) =>
                        setNewColorName(event.target.value)
                      }
                      placeholder="Colour name *"
                      className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />

                    <input
                      value={newColorFamily}
                      onChange={(event) =>
                        setNewColorFamily(event.target.value)
                      }
                      placeholder="Family e.g. Red / Blue"
                      className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />

                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3">
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(event) =>
                          setNewColorHex(event.target.value)
                        }
                        className="h-9 w-10 cursor-pointer bg-transparent"
                      />
                      <input
                        value={newColorHex}
                        onChange={(event) =>
                          setNewColorHex(event.target.value)
                        }
                        placeholder="#000000"
                        className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void quickCreateColor()}
                      disabled={creatingColor}
                      className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"
                    >
                      {creatingColor ? "Creating..." : "Create & Select Colour"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {filteredColorFamilies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                No active colors found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredColorFamilies.map(([family, familyColors]) => {
                  const expanded =
                    colorSearch.trim().length > 0 ||
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
                                      "#7B7066",
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
                                        "#7B7066",
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

          {/* COLOUR-WISE SIZES */}
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
            <div className="mb-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                    04
                  </p>

                  <h2 className="mt-1 text-xl font-bold">
                    Available Sizes by Colour
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Prathi colour ki actual ga available unna sizes maatrame select cheyyandi.
                  </p>

                  {isKidsProduct && (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          ["YEARS", "Years"],
                          ["CM", "Centimetres"],
                          ["INCHES", "Inches"],
                        ].map(
                          ([
                            value,
                            label,
                          ]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setKidsSizeDisplayMode(
                                  value as
                                    | "YEARS"
                                    | "CM"
                                    | "INCHES",
                                )
                              }
                              className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${
                                kidsSizeDisplayMode ===
                                value
                                  ? "border-emerald-400 bg-emerald-400 text-slate-950"
                                  : "border-white/10 bg-slate-900 text-slate-400"
                              }`}
                            >
                              {label}
                            </button>
                          ),
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void selectAllKidsSizesForAllColours()
                        }
                        disabled={
                          selectingAllKidsSizes ||
                          selectedColors.length ===
                            0
                        }
                        className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-400/15 px-4 py-2.5 text-xs font-black text-emerald-300 transition hover:bg-emerald-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {selectingAllKidsSizes
                          ? "Preparing all kids sizes..."
                          : "✓ Select All Kids Sizes (0-3M → 16-17Y) for All Colours"}
                      </button>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={sizeSearch}
                    onChange={(event) =>
                      setSizeSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search size..."
                    className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowCreateSize((current) => !current)
                    }
                    className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm font-bold text-emerald-400 transition hover:bg-emerald-400 hover:text-slate-950"
                  >
                    {showCreateSize ? "Close" : "+ Create Size"}
                  </button>
                </div>
              </div>

              {showCreateSize && (
                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
                  <p className="text-sm font-bold text-emerald-300">
                    Quick Create Size
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      value={newSizeName}
                      onChange={(event) =>
                        setNewSizeName(event.target.value)
                      }
                      placeholder="Size label * e.g. 28 / 15-16Y"
                      className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />

                    <select
                      value={newSizeCategory}
                      onChange={(event) =>
                        setNewSizeCategory(event.target.value)
                      }
                      className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="Kids">Kids</option>
                      <option value="Adult">Adult</option>
                      <option value="Clothing">Clothing / Free Size</option>
                    </select>

                    <select
                      value={newSizeType}
                      onChange={(event) =>
                        setNewSizeType(event.target.value)
                      }
                      className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="AGE">Age</option>
                      <option value="LETTER">Letter</option>
                      <option value="NUMERIC">Numeric</option>
                      <option value="GENERAL">General / Free</option>
                    </select>

                    <input
                      value={newSizeInches}
                      onChange={(event) =>
                        setNewSizeInches(event.target.value)
                      }
                      placeholder="Legacy height/inches optional"
                      className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  {newSizeCategory === "Kids" && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 p-3">
                      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p className="text-xs font-bold text-emerald-300">
                            Kids Fit Measurements — age is only a guide
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            Age preset select cheste reference measurements automatic ga fill avutayi. Tarvata supplier/product chart batti edit cheyochu.
                          </p>
                        </div>

                        <div className="min-w-[220px]">
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Auto Fill by Age
                          </label>
                          <select
                            value={newSizePreset}
                            onChange={(event) =>
                              applyKidsSizePreset(
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-emerald-400/20 bg-slate-950 px-4 py-3 text-sm font-bold text-emerald-300 outline-none focus:border-emerald-400"
                          >
                            <option value="">
                              Select age / months...
                            </option>
                            {KIDS_SIZE_PRESETS.map(
                              (preset) => (
                                <option
                                  key={preset.value}
                                  value={preset.value}
                                >
                                  {preset.label}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Age Guide
                          </span>
                          <input
                            value={newSizeAgeGuide}
                            onChange={(event) =>
                              setNewSizeAgeGuide(
                                event.target.value,
                              )
                            }
                            placeholder="e.g. 7-8Y"
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Child Height (cm)
                          </span>
                          <input
                            value={newSizeHeightCm}
                            onChange={(event) =>
                              setNewSizeHeightCm(
                                event.target.value,
                              )
                            }
                            placeholder="e.g. 122-128"
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                          />
                        </label>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Chest (inches)
                          </span>
                          <input
                            value={newSizeChestIn}
                            onChange={(event) =>
                              setNewSizeChestIn(
                                event.target.value,
                              )
                            }
                            placeholder="Reference e.g. 26-27"
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Waist (inches)
                          </span>
                          <input
                            value={newSizeWaistIn}
                            onChange={(event) =>
                              setNewSizeWaistIn(
                                event.target.value,
                              )
                            }
                            placeholder="Reference e.g. 23-24"
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Hip (inches)
                          </span>
                          <input
                            value={newSizeHipIn}
                            onChange={(event) =>
                              setNewSizeHipIn(
                                event.target.value,
                              )
                            }
                            placeholder="Optional"
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                          />
                        </label>

                        <label className="block sm:col-span-2 lg:col-span-3">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Garment Length (inches)
                          </span>
                          <input
                            value={newSizeGarmentLengthIn}
                            onChange={(event) =>
                              setNewSizeGarmentLengthIn(
                                event.target.value,
                              )
                            }
                            placeholder="Optional reference"
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                          />
                        </label>
                      </div>

                      <textarea
                        value={newSizeFitNote}
                        onChange={(event) =>
                          setNewSizeFitNote(
                            event.target.value,
                          )
                        }
                        rows={2}
                        placeholder="Fit note..."
                        className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                      />
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void quickCreateSize()}
                      disabled={creatingSize}
                      className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"
                    >
                      {creatingSize ? "Creating..." : "Create Size"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedColors.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <p className="font-semibold text-slate-300">
                  Select product colours first
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Colour select chesaka aa colour ki sizes ikkada vastayi.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedColors.map(
                  (colorId) => {
                    const selectedForColor =
                      colorSizeSelections[
                        colorId
                      ] ?? [];

                    return (
                      <div
                        key={colorId}
                        className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-9 w-9 rounded-full border border-white/20"
                              style={{
                                backgroundColor:
                                  colors.find(
                                    (color) =>
                                      color.id ===
                                      colorId,
                                  )?.hexCode ??
                                  "#7B7066",
                              }}
                            />

                            <div>
                              <p className="font-bold text-white">
                                {getColorName(
                                  colorId,
                                )}
                              </p>

                              <p className="text-xs text-slate-500">
                                {
                                  selectedForColor.length
                                }{" "}
                                size
                                {selectedForColor.length ===
                                1
                                  ? ""
                                  : "s"}{" "}
                                available
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                selectAllSizesForColor(
                                  colorId,
                                )
                              }
                              className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-400"
                            >
                              All Sizes
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                clearAllSizesForColor(
                                  colorId,
                                )
                              }
                              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-400"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {filteredSizes.map(
                            (size) => {
                              const selected =
                                selectedForColor.includes(
                                  size.id,
                                );

                              return (
                                <button
                                  key={
                                    size.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    toggleSizeForColor(
                                      colorId,
                                      size.id,
                                    )
                                  }
                                  className={`min-w-14 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                                    selected
                                      ? "border-emerald-400 bg-emerald-400 text-slate-950"
                                      : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/20"
                                  }`}
                                >
                                  <span className="block">
                                    {
                                      getSizeDisplayLabel(
                                        size,
                                      )
                                    }
                                  </span>

                                  {getSizeDisplayMeta(
                                    size,
                                  ) ? (
                                    <span className={`mt-0.5 block text-[9px] font-semibold ${
                                      selected
                                        ? "text-slate-800"
                                        : "text-slate-500"
                                    }`}>
                                      {
                                        getSizeDisplayMeta(
                                          size,
                                        )
                                      }
                                    </span>
                                  ) : null}
                                </button>
                              );
                            },
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </section>

          {isKidsProduct &&
            selectedKidsSizeIds.length >
              0 && (
            <section className="mb-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5 sm:p-7">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Kids Product Size Measurements
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Enter actual measurements for each age size
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Ee product lo 1-2Y, 2-3Y, 3-4Y ila prathi selected size ki actual Chest, Waist, Length separate ga inches lo enter cheyyandi. Ee values ee product ki maatrame save avutayi.
                </p>
              </div>

              <div className="space-y-3">
                {selectedKidsSizeIds.map(
                  (sizeId) => {
                    const size =
                      sizes.find(
                        (item) =>
                          item.id ===
                          sizeId,
                      );

                    const values =
                      kidsProductMeasurements[
                        sizeId
                      ] ?? {
                        chestIn: "",
                        waistIn: "",
                        garmentLengthIn:
                          "",
                      };

                    return (
                      <div
                        key={sizeId}
                        className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:grid-cols-[130px_repeat(3,minmax(0,1fr))] sm:items-end"
                      >
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Age / Size
                          </p>
                          <p className="mt-2 text-base font-black text-emerald-300">
                            {size?.name ??
                              sizeId}
                          </p>
                        </div>

                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Chest (in)
                          </span>
                          <input
                            value={
                              values.chestIn
                            }
                            onChange={(event) =>
                              updateKidsProductMeasurement(
                                sizeId,
                                "chestIn",
                                event.target.value,
                              )
                            }
                            placeholder="e.g. 22"
                            inputMode="decimal"
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-emerald-400"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Waist (in)
                          </span>
                          <input
                            value={
                              values.waistIn
                            }
                            onChange={(event) =>
                              updateKidsProductMeasurement(
                                sizeId,
                                "waistIn",
                                event.target.value,
                              )
                            }
                            placeholder="e.g. 20"
                            inputMode="decimal"
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-emerald-400"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Length (in)
                          </span>
                          <input
                            value={
                              values.garmentLengthIn
                            }
                            onChange={(event) =>
                              updateKidsProductMeasurement(
                                sizeId,
                                "garmentLengthIn",
                                event.target.value,
                              )
                            }
                            placeholder="e.g. 28"
                            inputMode="decimal"
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-emerald-400"
                          />
                        </label>
                      </div>
                    );
                  },
                )}
              </div>
            </section>
          )}

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
                {selectedColors.length} colours · {variants.length} available combinations
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
                          <span className="inline-flex min-w-[190px] items-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 font-mono text-[11px] font-bold text-emerald-300">
                            {sku
                              ? buildVariantSku(
                                  sku,
                                  getColorName(
                                    variant.colorId,
                                  ),
                                  getRawSizeName(
                                    variant.sizeId,
                                  ),
                                )
                              : "Complete SKU setup"}
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

            <div className="mb-5 rounded-2xl border border-purple-400/20 bg-slate-900/70 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-purple-300">
                Photos / Video Colour
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Mundu colour select cheyyandi. Taruvata upload chese photos aa colour ki link avutayi.
              </p>

              {selectedColors.length ===
              0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-400">
                  Product Colors section lo colour select cheyyandi.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedColors.map(
                    (colorId) => {
                      const selected =
                        mediaColorId ===
                        colorId;

                      return (
                        <button
                          key={
                            colorId
                          }
                          type="button"
                          onClick={() =>
                            setMediaColorId(
                              colorId,
                            )
                          }
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                            selected
                              ? "border-purple-300 bg-purple-300 text-slate-950"
                              : "border-white/10 bg-slate-950 text-slate-300"
                          }`}
                        >
                          <span
                            className="h-4 w-4 rounded-full border border-black/20"
                            style={{
                              backgroundColor:
                                colors.find(
                                  (color) =>
                                    color.id ===
                                    colorId,
                                )
                                  ?.hexCode ??
                                "#7B7066",
                            }}
                          />

                          {
                            getColorName(
                              colorId,
                            )
                          }
                        </button>
                      );
                    },
                  )}
                </div>
              )}
            </div>

            {/* UPLOAD BOX */}
            <div className="rounded-3xl border border-dashed border-purple-400/30 bg-purple-400/[0.04] p-6 text-center">
              <input
                id="product-media-upload"
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                disabled={
                  uploadingMedia ||
                  !mediaColorId
                }
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
                  {mediaColorId
                    ? `Upload ${getColorName(
                        mediaColorId,
                      )} Media`
                    : "Select Colour First"}
                </span>

                <span className="mt-1 text-sm text-slate-500">
                  {mediaColorId
                    ? "Select multiple images or videos for this colour"
                    : "Colour-wise photos compulsory"}
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

                      <div className="absolute left-2 top-2 flex flex-col gap-1">
                        <span className="w-fit rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                          {item.type}
                        </span>

                        {item.colorId && (
                          <span className="w-fit rounded-lg bg-purple-500/90 px-2 py-1 text-[10px] font-bold text-white">
                            {getColorName(
                              item.colorId,
                            )}
                          </span>
                        )}
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

        <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Product Catalog
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Existing products are now managed on a separate searchable catalog page.
            </p>
          </div>

          <a
            href="/admin/product-catalog"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 sm:mt-0"
          >
            Open Product Catalog →
          </a>
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

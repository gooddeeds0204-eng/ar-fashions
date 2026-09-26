"use client";

import {
  buildSmartStockAllocation,
  getSmartStockPackSize,
} from "@/lib/smart-stock-balance";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ensureUserSession } from "@/lib/user-session-init";
import BrandLogo from "@/components/BrandLogo";

type Media = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  thumbnailUrl?: string | null;
  altText?: string | null;
  sortOrder: number;
  isActive: boolean;
  colorId?: string | null;
};

type Variant = {
  id: string;
  stock: number;
  retailPrice: string | number | null;
  resellerPrice: string | number | null;
  color: {
    id: string;
    name: string;
    hexCode?: string | null;
  };
  size: {
    id: string;
    name: string;
    inches?: string | null;
  };
};

type SizeGuide = {
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
};

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  gender: string;
  description?: string | null;
  fabric?: string | null;
  retailPrice: string | number;
  resellerPrice: string | number | null;
  mrp: string | number | null;
  resellerMOQ: number | null;
  smartStockBalance: boolean;
  salesMode: "RETAIL" | "BULK" | "BOTH";
  status: string;
  category: {
    id: string;
    name: string;
  };
  variants: Variant[];
  media: Media[];
};

type ProductReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  customerName: string;
};

type ProductTransitionPreview = {
  id: string;
  name: string;
  category: string;
  image: string | null;
  price: string | number | null;
  mrp: string | number | null;
  mode: "RETAIL" | "RESELLER";
  savedAt?: number;
};

type CartItem = {
  id: string;
  productId: string;
  productName: string;
  image: string | null;
  variantId: string;
  colorId: string;
  colorName: string;
  sizeId: string;
  sizeName: string;
  price: number;
  quantity: number;
  mode?: "RETAIL" | "RESELLER";
  resellerMOQ?: number;
  smartStockBalance?: boolean;
  smartPackSize?: number;
};

function money(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "₹0";
  }

  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function sizeLabel(
  name: string,
  inches?: string | null,
) {
  return inches
    ? `${name} · Height ${inches}`
    : name;
}

function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem("ar-fashions-cart");

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();

  const productId = String(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [
    transitionPreview,
    setTransitionPreview,
  ] =
    useState<ProductTransitionPreview | null>(
      null,
    );

  const [selectedColorId, setSelectedColorId] = useState("");
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(0);
  const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>([]);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [isReseller, setIsReseller] = useState(false);
  const [resellerQuantities, setResellerQuantities] = useState<Record<string, number>>({});

  const [
    smartPackCount,
    setSmartPackCount,
  ] = useState(1);

  const [adding, setAdding] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);

  const [
    buyNowOpen,
    setBuyNowOpen,
  ] = useState(false);

  const [
    salesAccessLoaded,
    setSalesAccessLoaded,
  ] = useState(false);

  const [
    purchaseClosed,
    setPurchaseClosed,
  ] = useState(false);

  const [
    purchaseClosedMessage,
    setPurchaseClosedMessage,
  ] = useState("");

  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [reviews, setReviews] =
    useState<ProductReview[]>([]);

  const [
    averageRating,
    setAverageRating,
  ] = useState(0);

  useEffect(() => {
    try {
      const raw =
        sessionStorage.getItem(
          "ar-fashions-product-transition",
        );

      if (!raw) {
        return;
      }

      const preview =
        JSON.parse(
          raw,
        ) as ProductTransitionPreview;

      if (
        preview.id === productId
      ) {
        setTransitionPreview(
          preview,
        );
      }
    } catch {
      setTransitionPreview(
        null,
      );
    }
  }, [productId]);

  useEffect(() => {
    if (!product) return;

    async function resolveSalesAccess() {
      try {
        const [
          sessionResponse,
          settingsResponse,
        ] = await Promise.all([
          fetch(
            "/api/session",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          ),

          fetch(
            "/api/site-settings",
            {
              cache: "no-store",
            },
          ),
        ]);

        let resellerAccount =
          false;

        if (sessionResponse.ok) {
          const sessionData =
            await sessionResponse.json();

          resellerAccount =
            sessionData.user
              ?.isReseller === true;
        }

        setIsReseller(
          resellerAccount,
        );

        if (settingsResponse.ok) {
          const settingsData =
            await settingsResponse.json();

          const modeData =
            settingsData.salesMode;

          const status =
            resellerAccount
              ? modeData
                  ?.resellerStatus
              : modeData
                  ?.retailStatus;

          const message =
            resellerAccount
              ? modeData
                  ?.resellerMessage
              : modeData
                  ?.retailMessage;

          setPurchaseClosed(
            status === "CLOSED",
          );

          setPurchaseClosedMessage(
            String(
              message ??
                "Shopping is temporarily closed.",
            ),
          );
        }
      } catch {
        setIsReseller(false);
      } finally {
        setSalesAccessLoaded(
          true,
        );
      }
    }

    resolveSalesAccess();
  }, [product?.id]);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);

        const [
          response,
          sizesResponse,
        ] = await Promise.all([
          fetch(
            `/api/products/${productId}`,
            {
              cache: "no-store",
            },
          ),
          fetch("/api/sizes", {
            cache: "no-store",
          }),
        ]);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ?? "Failed to load product",
          );
        }

        if (sizesResponse.ok) {
          const sizesData =
            await sizesResponse.json();

          setSizeGuides(
            Array.isArray(sizesData)
              ? sizesData
              : [],
          );
        }

        setProduct(data);

        try {
          sessionStorage.removeItem(
            "ar-fashions-product-transition",
          );
        } catch {
          // Ignore storage cleanup errors.
        }

        const firstVariant = data.variants?.find(
          (item: Variant) => item.stock > 0,
        );

        if (firstVariant) {
          setSelectedColorId(firstVariant.color.id);
          setSelectedSizeId(firstVariant.size.id);
        }
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

    if (productId) {
      loadProduct();
    }
  }, [productId]);

  useEffect(() => {
    if (!product) return;

    async function loadWishlistState() {
      try {
        const userId =
          await ensureUserSession();

        if (!userId || !productId) return;

        const response = await fetch(
          "/api/wishlist",
          { cache: "no-store" },
        );

        if (!response.ok) return;

        const data = await response.json();

        const items = Array.isArray(data?.wishlist)
          ? data.wishlist
          : [];

        setWishlisted(
          items.some(
            (item: { productId?: string }) =>
              item.productId === productId,
          ),
        );
      } catch (error) {
        console.error(
          "Product wishlist state failed:",
          error,
        );
      }
    }

    loadWishlistState();
  }, [product?.id, productId]);

  useEffect(() => {
    if (!product) return;

    async function loadReviews() {
      try {
        const response =
          await fetch(
            `/api/reviews?productId=${encodeURIComponent(
              productId,
            )}`,
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        setReviews(
          Array.isArray(
            data.reviews,
          )
            ? data.reviews
            : [],
        );

        setAverageRating(
          Number(
            data.averageRating ??
              0,
          ) || 0,
        );
      } catch (error) {
        console.error(
          "Product reviews load failed:",
          error,
        );
      }
    }

    if (productId) {
      loadReviews();
    }
  }, [product?.id, productId]);

  async function toggleWishlist() {
    if (wishlistLoading || !product) return;

    const userId =
      await ensureUserSession();

    if (!userId) {
      alert("Please login to use Wishlist.");
      return;
    }

    try {
      setWishlistLoading(true);

      if (wishlisted) {
        const response = await fetch(
          "/api/wishlist",
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId: product.id,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            "Failed to remove from wishlist.",
          );
        }

        setWishlisted(false);
      } else {
        const response = await fetch(
          "/api/wishlist",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId: product.id,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            "Failed to add to wishlist.",
          );
        }

        setWishlisted(true);
      }
    } catch (error) {
      console.error(
        "Product wishlist toggle failed:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Wishlist update failed.",
      );
    } finally {
      setWishlistLoading(false);
    }
  }

  const colors = useMemo(() => {
    if (!product) return [];

    const map = new Map<string, Variant["color"]>();

    for (const variant of product.variants) {
      if (!map.has(variant.color.id)) {
        map.set(variant.color.id, variant.color);
      }
    }

    return Array.from(map.values());
  }, [product]);

  const sizes = useMemo(() => {
    if (!product || !selectedColorId) return [];

    const map = new Map<string, Variant["size"]>();

    for (const variant of product.variants) {
      if (
        variant.color.id === selectedColorId &&
        variant.stock > 0 &&
        !map.has(variant.size.id)
      ) {
        map.set(variant.size.id, variant.size);
      }
    }

    return Array.from(map.values());
  }, [product, selectedColorId]);

  const productSizeGuides = useMemo(() => {
    if (!product) {
      return [];
    }

    const sizeIds = new Set(
      product.variants.map(
        (variant) => variant.size.id,
      ),
    );

    return sizeGuides.filter(
      (guide) =>
        sizeIds.has(guide.id) &&
        [
          guide.ageGuide,
          guide.heightCm,
          guide.chestIn,
          guide.waistIn,
          guide.hipIn,
          guide.garmentLengthIn,
          guide.fitNote,
        ].some(Boolean),
    );
  }, [product, sizeGuides]);

  const sizeGuideById = useMemo(
    () =>
      new Map(
        sizeGuides.map((guide) => [
          guide.id,
          guide,
        ]),
      ),
    [sizeGuides],
  );

  const selectedVariant = useMemo(() => {
    if (!product) return null;

    return (
      product.variants.find(
        (variant) =>
          variant.color.id === selectedColorId &&
          variant.size.id === selectedSizeId,
      ) ?? null
    );
  }, [
    product,
    selectedColorId,
    selectedSizeId,
  ]);

  const colorMedia =
    useMemo(() => {
      if (!product) {
        return [];
      }

      const exact =
        product.media.filter(
          (item) =>
            item.colorId ===
            selectedColorId,
        );

      if (
        exact.length > 0
      ) {
        return exact;
      }

      const generic =
        product.media.filter(
          (item) =>
            !item.colorId,
        );

      return generic.length >
        0
        ? generic
        : product.media;
    }, [
      product,
      selectedColorId,
    ]);

  useEffect(() => {
    setSelectedMedia(0);
  }, [
    selectedColorId,
  ]);

  function imageForColor(
    colorId: string,
  ) {
    if (!product) {
      return null;
    }

    return (
      product.media.find(
        (item) =>
          item.type ===
            "IMAGE" &&
          item.colorId ===
            colorId,
      )?.url ??
      product.media.find(
        (item) =>
          item.type ===
            "IMAGE" &&
          !item.colorId,
      )?.url ??
      product.media.find(
        (item) =>
          item.type ===
          "IMAGE",
      )?.url ??
      product.media[0]
        ?.url ??
      null
    );
  }

  const minimumQuantity = isReseller
    ? Math.max(1, product?.resellerMOQ ?? 1)
    : 1;

  const smartStockVariants =
    useMemo(() => {
      if (!product) {
        return [];
      }

      return product.variants.map(
        (variant) => ({
          id:
            variant.id,
          colorId:
            variant.color.id,
          sizeId:
            variant.size.id,
          stock:
            variant.stock,
          isActive: true,
        }),
      );
    }, [product]);

  const smartPackSize =
    useMemo(() => {
      if (
        !product?.smartStockBalance
      ) {
        return 0;
      }

      return getSmartStockPackSize(
        smartStockVariants,
        product.resellerMOQ,
      );
    }, [
      product?.smartStockBalance,
      product?.resellerMOQ,
      smartStockVariants,
    ]);

  const smartTargetQuantity =
    smartPackSize *
    smartPackCount;

  const smartStockPlan =
    useMemo(() => {
      return buildSmartStockAllocation(
        smartStockVariants,
        smartTargetQuantity,
      );
    }, [
      smartStockVariants,
      smartTargetQuantity,
    ]);

  useEffect(() => {
    if (
      !isReseller ||
      !product?.smartStockBalance
    ) {
      return;
    }

    setResellerQuantities(
      smartStockPlan.ok
        ? smartStockPlan.allocation
        : {},
    );
  }, [
    isReseller,
    product?.smartStockBalance,
    smartStockPlan,
  ]);

  const currentPrice = isReseller
    ? selectedVariant?.resellerPrice !== null &&
      selectedVariant?.resellerPrice !== undefined
      ? Number(selectedVariant.resellerPrice)
      : Number(
          product?.resellerPrice ??
            product?.retailPrice ??
            0,
        )
    : selectedVariant?.retailPrice
      ? Number(selectedVariant.retailPrice)
      : Number(product?.retailPrice ?? 0);

  const availableStock =
    selectedVariant?.stock ?? 0;

  const meetsMOQ =
    !isReseller || quantity >= minimumQuantity;

  const totalResellerQuantity = useMemo(() => {
    return Object.values(resellerQuantities).reduce(
      (total, value) => total + value,
      0,
    );
  }, [resellerQuantities]);

  const resellerTotal = useMemo(() => {
    if (!product) return 0;

    return product.variants.reduce((total, variant) => {
      const variantQuantity =
        resellerQuantities[variant.id] ?? 0;

      const price =
        variant.resellerPrice !== null &&
        variant.resellerPrice !== undefined
          ? Number(variant.resellerPrice)
          : Number(
              product.resellerPrice ??
                product.retailPrice ??
                0,
            );

      return total + price * variantQuantity;
    }, 0);
  }, [product, resellerQuantities]);

  const resellerMeetsMOQ =
    product?.smartStockBalance
      ? smartStockPlan.ok &&
        totalResellerQuantity ===
          smartTargetQuantity
      : totalResellerQuantity >=
        minimumQuantity;

  function changeResellerQuantity(
    variantId: string,
    stock: number,
    change: number,
  ) {
    if (
      product?.smartStockBalance
    ) {
      return;
    }

    setResellerQuantities((current) => {
      const currentQuantity = current[variantId] ?? 0;

      const nextQuantity = Math.max(
        0,
        Math.min(stock, currentQuantity + change),
      );

      const next = { ...current };

      if (nextQuantity === 0) {
        delete next[variantId];
      } else {
        next[variantId] = nextQuantity;
      }

      return next;
    });
  }

  function addResellerSelectionToCart() {
    if (purchaseClosed) {
      alert(
        purchaseClosedMessage ||
          "Reseller ordering is temporarily closed.",
      );
      return;
    }

    if (!product) return;

    if (
      product.smartStockBalance &&
      !smartStockPlan.ok
    ) {
      alert(
        smartStockPlan.reason ||
          "Smart stock pack is currently unavailable.",
      );
      return;
    }

    const selectedVariants = product.variants.filter(
      (variant) =>
        (resellerQuantities[variant.id] ?? 0) > 0,
    );

    if (selectedVariants.length === 0) {
      alert("Select reseller quantities first.");
      return;
    }

    if (!resellerMeetsMOQ) {
      alert(
        `Minimum ${minimumQuantity} pieces required for reseller purchase.`,
      );
      return;
    }

    let cart = getCart();

    if (
      product.smartStockBalance
    ) {
      cart = cart.filter(
        (item) =>
          !(
            item.productId ===
              product.id &&
            (item.mode ??
              "RETAIL") ===
              "RESELLER"
          ),
      );
    }

    for (const variant of selectedVariants) {
      const selectedQuantity =
        resellerQuantities[variant.id] ?? 0;

      const existingIndex = cart.findIndex(
        (item) =>
          item.productId === product.id &&
          item.variantId === variant.id &&
          (item.mode ?? "RETAIL") === "RESELLER",
      );

      const existingQuantity =
        existingIndex >= 0
          ? cart[existingIndex].quantity
          : 0;

      if (
        existingQuantity + selectedQuantity >
        variant.stock
      ) {
        alert(
          `Only ${variant.stock} pieces available for ${variant.color.name} / ${sizeLabel(
            variant.size.name,
            variant.size.inches,
          )}.`,
        );
        return;
      }
    }

    setAdding(true);

    for (const variant of selectedVariants) {
      const selectedQuantity =
        resellerQuantities[variant.id] ?? 0;

      const price =
        variant.resellerPrice !== null &&
        variant.resellerPrice !== undefined
          ? Number(variant.resellerPrice)
          : Number(
              product.resellerPrice ??
                product.retailPrice ??
                0,
            );

      const existingIndex = cart.findIndex(
        (item) =>
          item.productId === product.id &&
          item.variantId === variant.id &&
          (item.mode ?? "RETAIL") === "RESELLER",
      );

      if (existingIndex >= 0) {
        cart[existingIndex].quantity += selectedQuantity;

        cart[existingIndex].sizeName =
          sizeLabel(
            variant.size.name,
            variant.size.inches,
          );
      } else {
        cart.push({
          id: `${product.id}-${variant.id}-RESELLER`,
          productId: product.id,
          productName: product.name,
          image:
            imageForColor(
              variant.color.id,
            ),
          variantId: variant.id,
          colorId: variant.color.id,
          colorName: variant.color.name,
          sizeId: variant.size.id,
          sizeName: sizeLabel(
            variant.size.name,
            variant.size.inches,
          ),
          price,
          quantity: selectedQuantity,
          mode: "RESELLER",
          resellerMOQ: minimumQuantity,
          smartStockBalance:
            product.smartStockBalance,
          smartPackSize:
            product.smartStockBalance
              ? smartPackSize
              : undefined,
        });
      }
    }

    localStorage.setItem(
      "ar-fashions-cart",
      JSON.stringify(cart),
    );

    setAdding(false);
    router.push("/cart");
  }

  function selectColor(colorId: string) {
    setSelectedColorId(colorId);

    const firstAvailableSize =
      product?.variants.find(
        (variant) =>
          variant.color.id === colorId &&
          variant.stock > 0,
      )?.size.id ?? "";

    setSelectedSizeId(firstAvailableSize);
    setQuantity(1);
  }

  function selectSize(sizeId: string) {
    setSelectedSizeId(sizeId);
    setQuantity(1);
  }

  function addToCart() {
    if (purchaseClosed) {
      alert(
        purchaseClosedMessage ||
          "Shopping is temporarily closed.",
      );
      return;
    }

    if (!product) return;

    if (
      isReseller &&
      product.smartStockBalance
    ) {
      alert(
        "Use the Smart Stock Balance pack builder to order this reseller product.",
      );
      return;
    }

    if (!selectedVariant) {
      alert("Please select color and size.");
      return;
    }

    if (selectedVariant.stock <= 0) {
      alert("This variant is out of stock.");
      return;
    }

    if (quantity > selectedVariant.stock) {
      alert(
        `Only ${selectedVariant.stock} pieces available.`,
      );
      return;
    }

    if (isReseller && quantity < minimumQuantity) {
      alert(
        `Minimum ${minimumQuantity} pieces required for reseller purchase.`,
      );
      return;
    }

    setAdding(true);

    const cart = getCart();

    const existingIndex = cart.findIndex(
      (item) =>
        item.productId === product.id &&
        item.variantId === selectedVariant.id &&
        (item.mode ?? "RETAIL") ===
          (isReseller ? "RESELLER" : "RETAIL"),
    );

    if (existingIndex >= 0) {
      const newQuantity =
        cart[existingIndex].quantity + quantity;

      cart[existingIndex].quantity = Math.min(
        newQuantity,
        selectedVariant.stock,
      );

      cart[existingIndex].sizeName =
        sizeLabel(
          selectedVariant.size.name,
          selectedVariant.size.inches,
        );
    } else {
      cart.push({
        id: `${product.id}-${selectedVariant.id}-${isReseller ? "RESELLER" : "RETAIL"}`,
        productId: product.id,
        productName: product.name,
        image:
          imageForColor(
            selectedVariant.color.id,
          ),
        variantId: selectedVariant.id,
        colorId: selectedVariant.color.id,
        colorName: selectedVariant.color.name,
        sizeId: selectedVariant.size.id,
        sizeName: sizeLabel(
          selectedVariant.size.name,
          selectedVariant.size.inches,
        ),
        price: currentPrice,
        quantity,
        mode: isReseller ? "RESELLER" : "RETAIL",
        resellerMOQ: isReseller ? minimumQuantity : undefined,
      });
    }

    localStorage.setItem(
      "ar-fashions-cart",
      JSON.stringify(cart),
    );

    setAdding(false);

    setCartNotice(true);

    window.setTimeout(() => {
      setCartNotice(false);
    }, 2800);
  }

  function openBuyNowPopup() {
    if (purchaseClosed) {
      alert(
        purchaseClosedMessage ||
          "Shopping is temporarily closed.",
      );
      return;
    }

    if (!product) return;

    if (
      isReseller &&
      product.smartStockBalance
    ) {
      alert(
        "Use the Smart Stock Balance pack builder to order this reseller product.",
      );
      return;
    }

    if (!selectedVariant) {
      alert(
        "Please select color and size.",
      );
      return;
    }

    if (selectedVariant.stock <= 0) {
      alert(
        "This variant is out of stock.",
      );
      return;
    }

    if (
      quantity >
      selectedVariant.stock
    ) {
      alert(
        `Only ${selectedVariant.stock} pieces available.`,
      );
      return;
    }

    if (
      isReseller &&
      quantity < minimumQuantity
    ) {
      alert(
        `Minimum ${minimumQuantity} pieces required for reseller purchase.`,
      );
      return;
    }

    setBuyNowOpen(true);
  }

  function buyNow() {
    if (purchaseClosed) {
      alert(
        purchaseClosedMessage ||
          "Shopping is temporarily closed.",
      );
      return;
    }

    if (!product) return;

    if (
      isReseller &&
      product.smartStockBalance
    ) {
      alert(
        "Use the Smart Stock Balance pack builder to order this reseller product.",
      );
      return;
    }

    if (!selectedVariant) {
      alert("Please select color and size.");
      return;
    }

    if (selectedVariant.stock <= 0) {
      alert("This variant is out of stock.");
      return;
    }

    if (quantity > selectedVariant.stock) {
      alert(
        `Only ${selectedVariant.stock} pieces available.`,
      );
      return;
    }

    setAdding(true);

    const cart = getCart();

    const modeValue =
      isReseller ? "RESELLER" : "RETAIL";

    const existingIndex =
      cart.findIndex(
        (item) =>
          item.productId === product.id &&
          item.variantId === selectedVariant.id &&
          (item.mode ?? "RETAIL") === modeValue,
      );

    if (existingIndex >= 0) {
      cart[existingIndex].quantity =
        Math.min(
          cart[existingIndex].quantity +
            quantity,
          selectedVariant.stock,
        );

      cart[existingIndex].sizeName =
        sizeLabel(
          selectedVariant.size.name,
          selectedVariant.size.inches,
        );
    } else {
      cart.push({
        id: `${product.id}-${selectedVariant.id}-${modeValue}`,
        productId: product.id,
        productName: product.name,
        image:
          imageForColor(
            selectedVariant.color.id,
          ),
        variantId:
          selectedVariant.id,
        colorId:
          selectedVariant.color.id,
        colorName:
          selectedVariant.color.name,
        sizeId:
          selectedVariant.size.id,
        sizeName:
          sizeLabel(
            selectedVariant.size.name,
            selectedVariant.size.inches,
          ),
        price:
          currentPrice,
        quantity,
        mode:
          modeValue,
        resellerMOQ:
          isReseller
            ? minimumQuantity
            : undefined,
      });
    }

    localStorage.setItem(
      "ar-fashions-cart",
      JSON.stringify(cart),
    );

    setAdding(false);

    router.push("/checkout");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#211C18]">
        <header className="border-b border-[#E4D7C4] bg-[#FFFDF9]">
          <div className="mx-auto flex h-[60px] max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <div className="ar-skeleton h-9 w-9 rounded-full" />
            <div className="ml-3 ar-skeleton h-8 w-24 rounded-full" />
            <div className="ml-auto ar-skeleton h-9 w-20 rounded-full" />
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-8">
          <div className="ar-skeleton aspect-[4/5] overflow-hidden rounded-[1.8rem]" />

          <section className="py-2">
            <div className="ar-skeleton h-3 w-24 rounded-full" />
            <div className="mt-4 ar-skeleton h-10 w-4/5 rounded-xl" />
            <div className="mt-3 ar-skeleton h-4 w-2/5 rounded-full" />
            <div className="mt-7 ar-skeleton h-24 w-full rounded-[1.3rem]" />
            <div className="mt-4 ar-skeleton h-24 w-full rounded-[1.3rem]" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="ar-skeleton h-14 rounded-2xl" />
              <div className="ar-skeleton h-14 rounded-2xl" />
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F0] px-6">
        <div className="text-center">
          <h1 className="text-xl font-black">
            Product not found
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            {error}
          </p>

          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-[#031B14] px-6 py-3 text-sm font-bold text-[#FFFDF9] transition-[transform,opacity] duration-200 active:scale-[0.98]"
          >
            Back to Shop
          </button>
        </div>
      </main>
    );
  }

  const media =
    colorMedia.length > 0
      ? colorMedia[
          selectedMedia
        ] ??
        colorMedia[0]
      : null;

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#211C18] sm:pb-0">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#FFFDF9]/95 shadow-[0_1px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-7xl items-center px-4 sm:h-16 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="mr-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#E4D7C4] bg-[#F4EBDD] text-sm font-black text-[#211C18] transition-[transform,opacity] duration-200 active:scale-[0.98]"
          >
            ←
          </button>

          <BrandLogo
            compact
            onClick={() => router.push("/")}
          />

          <button
            onClick={() => router.push("/cart")}
            className="ml-auto rounded-full border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-2 text-[11px] font-black text-[#031B14] shadow-sm transition-[transform,opacity] duration-200 active:scale-[0.98]"
          >
            🛒 Cart
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-0 pb-8 sm:gap-8 sm:px-6 sm:pt-6 lg:grid-cols-2 lg:px-8 lg:py-10">
        {/* MEDIA */}
        <section className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden bg-[#F4EBDD] sm:rounded-[2rem]">
            <div className="aspect-[4/5]">
              {media?.type === "VIDEO" ? (
                <video
                  src={media.url}
                  controls
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : media ? (
                <img
                  src={media.url}
                  alt={
                    media.altText ??
                    product.name
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">
                  No image
                </div>
              )}
            </div>
          </div>

          {colorMedia.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2 px-4 pb-2 sm:mt-4 sm:gap-3 sm:px-0 sm:pb-0">
              {colorMedia.map(
                (item, index) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setSelectedMedia(index)
                    }
                    className={`overflow-hidden rounded-xl border-2 bg-[#FFFDF9] shadow-sm transition-[transform,opacity] duration-200 active:scale-[0.98] ${
                      selectedMedia === index
                        ? "border-[#D4AF37]"
                        : "border-transparent"
                    }`}
                  >
                    {item.type === "VIDEO" ? (
                      <div className="flex aspect-square items-center justify-center bg-zinc-900 text-xs font-bold text-white">
                        VIDEO
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                    )}
                  </button>
                ),
              )}
            </div>
          )}
        </section>

        {/* DETAILS */}
        <section className="relative z-10 mt-3 rounded-[1.5rem] border border-[#E4D7C4] bg-[#FFFDF9] px-4 pb-8 pt-6 shadow-sm sm:mt-0 sm:rounded-[2rem] sm:p-6 lg:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6B5435]">
            {product.category.name}
          </p>

          <div className="mt-2 flex items-start gap-4">
            <h1 className="flex-1 text-[1.65rem] font-black leading-tight tracking-[-0.035em] sm:text-4xl">
              {product.name}
            </h1>

            <button
              type="button"
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              aria-label={
                wishlisted
                  ? "Remove from Wishlist"
                  : "Add to Wishlist"
              }
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-white text-xl shadow-sm transition active:scale-95 ${
                wishlisted
                  ? "border-red-200 text-red-500"
                  : "border-black/10 text-zinc-700 hover:border-emerald-500 hover:text-emerald-600"
              } ${
                wishlistLoading
                  ? "cursor-wait opacity-60"
                  : "hover:scale-105"
              }`}
            >
              {wishlisted ? "♥" : "♡"}
            </button>
          </div>

          {product.fabric && (
            <p className="mt-2 text-sm text-zinc-500">
              Fabric: {product.fabric}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-[1.8rem] font-black tracking-[-0.04em]">
              {money(currentPrice)}
            </span>

            {product.mrp &&
              Number(product.mrp) >
                currentPrice && (
                <>
                  <span className="text-sm font-semibold text-zinc-400 line-through">
                    {money(product.mrp)}
                  </span>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                    {Math.round(
                      ((Number(product.mrp) -
                        currentPrice) /
                        Number(product.mrp)) *
                        100,
                    )}
                    % OFF
                  </span>
                </>
              )}
          </div>

          {reviews.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700">
              ★ {averageRating.toFixed(1)}

              <span className="font-semibold text-zinc-400">
                · {reviews.length} verified
              </span>
            </div>
          )}

          {isReseller && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                Reseller Price
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-900">
                MOQ {minimumQuantity} pieces
              </p>
            </div>
          )}

          {!isReseller ? (
            <>
          {/* COLOR */}
          <div className="mt-7 rounded-[1.35rem] border border-black/[0.06] bg-[#FAF7F0] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">
                Color
              </p>

              <p className="text-xs text-zinc-500">
                {colors.find(
                  (color) =>
                    color.id ===
                    selectedColorId,
                )?.name ?? "Select"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() =>
                    selectColor(color.id)
                  }
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-[11px] font-black transition active:scale-95 ${
                    selectedColorId ===
                    color.id
                      ? "border-[#031B14] bg-[#031B14] text-[#FFFDF9] shadow-sm"
                      : "border-[#E4D7C4] bg-[#FFFDF9] text-[#211C18]"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                    style={{
                      background:
                        color.hexCode ||
                        "#d4d4d8",
                    }}
                  />

                  {color.name}
                </button>
              ))}
            </div>
          </div>

          {/* SIZE */}
          <div className="mt-4 rounded-[1.35rem] border border-black/[0.06] bg-[#FAF7F0] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold">
                Size
              </p>

              {productSizeGuides.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSizeGuideOpen(true)
                  }
                  className="rounded-full border border-[#D9C29A] bg-[#FFFDF9] px-3 py-1.5 text-[10px] font-black text-[#6B5435]"
                >
                  Size Guide
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {sizes.map((size) => {
                const variant =
                  product.variants.find(
                    (item) =>
                      item.color.id ===
                        selectedColorId &&
                      item.size.id ===
                        size.id,
                  );

                const disabled =
                  !variant ||
                  variant.stock <= 0;

                return (
                  <button
                    key={size.id}
                    disabled={disabled}
                    onClick={() =>
                      selectSize(size.id)
                    }
                    className={`min-w-[64px] rounded-xl border px-3 py-3 text-[11px] font-black transition active:scale-95 ${
                      selectedSizeId ===
                      size.id
                        ? "border-[#031B14] bg-[#031B14] text-[#FFFDF9]"
                        : disabled
                          ? "cursor-not-allowed border-black/5 bg-zinc-100 text-zinc-300"
                          : "border-[#E4D7C4] bg-[#FFFDF9] text-[#211C18]"
                    }`}
                  >
                    <span className="block">
                      {size.name}
                    </span>

                    {(() => {
                      const guide =
                        sizeGuideById.get(size.id);

                      if (
                        guide?.ageGuide ||
                        guide?.heightCm
                      ) {
                        return (
                          <span className="mt-1 block text-[9px] font-semibold opacity-80">
                            {guide.ageGuide
                              ? `Age ${guide.ageGuide}`
                              : ""}
                            {guide.ageGuide &&
                            guide.heightCm
                              ? " · "
                              : ""}
                            {guide.heightCm
                              ? `${guide.heightCm} cm`
                              : ""}
                          </span>
                        );
                      }

                      return size.inches ? (
                        <span className="mt-1 block text-[9px] font-semibold opacity-80">
                          Height {size.inches}
                        </span>
                      ) : null;
                    })()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STOCK */}
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            {selectedVariant ? (
              availableStock > 0 ? (
                <p className="inline-flex rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">
                  ✓ {availableStock} pieces
                  available
                </p>
              ) : (
                <p className="text-sm font-bold text-red-500">
                  Out of stock
                </p>
              )
            ) : (
              <p className="text-sm text-zinc-500">
                Select color and size
              </p>
            )}
          </div>

          {/* QUANTITY */}
          <div className="mt-4 flex items-center justify-between gap-4 rounded-[1.35rem] border border-black/[0.06] bg-[#FAF7F0] p-4">
            <div>
              <p className="text-sm font-black">
                Quantity
              </p>

              <p className="mt-0.5 text-[10px] text-zinc-400">
                Choose pieces
              </p>
            </div>

            <div className="flex items-center overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
              <button
                disabled={quantity <= 1}
                onClick={() =>
                  setQuantity((value) =>
                    Math.max(1, value - 1),
                  )
                }
                className="px-4 py-3 font-bold"
              >
                −
              </button>

              <span className="min-w-10 text-center text-sm font-bold">
                {quantity}
              </span>

              <button
                disabled={
                  !selectedVariant ||
                  quantity >=
                    selectedVariant.stock
                }
                onClick={() =>
                  setQuantity((value) =>
                    Math.min(
                      availableStock,
                      value + 1,
                    ),
                  )
                }
                className="px-4 py-3 font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* ACTION */}
          {!isReseller || meetsMOQ ? (
            <div className="mt-6 hidden grid-cols-2 gap-3 sm:grid">
              <button
                type="button"
                disabled={
                  adding ||
                  !selectedVariant ||
                  availableStock <= 0
                }
                onClick={addToCart}
                className="rounded-2xl border border-[#031B14] bg-[#FFFDF9] py-4 text-[12px] font-black text-[#031B14] transition-[transform,opacity] duration-200 active:scale-[0.98] disabled:border-[#E4D7C4] disabled:bg-[#F4EBDD] disabled:text-[#9A9188]"
              >
                {adding
                  ? "Adding..."
                  : "Add to Cart"}
              </button>

              <button
                type="button"
                disabled={
                  adding ||
                  !selectedVariant ||
                  availableStock <= 0
                }
                onClick={openBuyNowPopup}
                className="rounded-2xl bg-[#031B14] py-4 text-[12px] font-black text-[#FFFDF9] shadow-lg transition-[transform,opacity] duration-200 active:scale-[0.98] disabled:bg-[#E4D7C4] disabled:text-[#9A9188]"
              >
                Buy Now
              </button>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              {!selectedVariant
                ? `Select color and size. Minimum ${minimumQuantity} pieces required.`
                : availableStock < minimumQuantity
                  ? `Reseller MOQ is ${minimumQuantity} pieces, but only ${availableStock} are available.`
                  : `Select at least ${minimumQuantity} pieces to continue. Currently selected: ${quantity}.`}
            </div>
          )}


            </>
          ) : (
            <div className="mt-8">
              {/* RESELLER VARIANT BUILDER */}
              <div className="mb-5">
                <h2 className="text-base font-black">
                  {product.smartStockBalance
                    ? "Smart Stock Balance Pack"
                    : "Build Your Reseller Set"}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {product.smartStockBalance
                    ? `AR automatically balances all available colours and sizes. One smart pack contains ${smartPackSize} pieces.`
                    : `Mix sizes and colors. Total quantity must reach MOQ ${minimumQuantity}.`}
                </p>
              </div>

              {product.smartStockBalance ? (
                <div className="mb-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                        Automatic Allocation
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-900/70">
                        Every currently available
                        colour-size combination is
                        included first. Extra pieces
                        are taken from higher-stock
                        variants to keep seller stock
                        balanced.
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-600 px-3 py-1 text-[9px] font-black text-white">
                      SMART
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      Choose Packs
                    </p>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[1, 2, 3].map(
                        (count) => {
                          const target =
                            smartPackSize *
                            count;

                          const disabled =
                            smartPackSize <= 0 ||
                            target >
                              smartStockPlan.totalStock;

                          return (
                            <button
                              key={count}
                              type="button"
                              disabled={disabled}
                              onClick={() =>
                                setSmartPackCount(
                                  count,
                                )
                              }
                              className={`rounded-xl border px-3 py-3 text-center transition disabled:opacity-30 ${
                                smartPackCount ===
                                count
                                  ? "border-[#031B14] bg-[#031B14] text-[#FFFDF9]"
                                  : "border-emerald-200 bg-white text-zinc-700"
                              }`}
                            >
                              <p className="text-sm font-black">
                                {count} Pack
                                {count > 1
                                  ? "s"
                                  : ""}
                              </p>

                              <p className="mt-1 text-[9px] font-bold opacity-70">
                                {target} pcs
                              </p>
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {!smartStockPlan.ok ? (
                    <p className="mt-4 rounded-xl bg-amber-100 px-3 py-2.5 text-xs font-bold leading-5 text-amber-800">
                      {smartStockPlan.reason}
                    </p>
                  ) : (
                    <p className="mt-4 text-[10px] font-bold text-emerald-700">
                      ✓ {smartStockPlan.availableVariantCount} available colour-size combinations covered
                    </p>
                  )}
                </div>
              ) : null}

              <div className="mb-5 rounded-[1.35rem] border border-[#D9C29A] bg-[#FBF5EA] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B5435]">
                    Available Colors
                  </p>

                  <span className="text-[10px] font-bold text-[#7B7066]">
                    {colors.length} color{colors.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() =>
                        selectColor(color.id)
                      }
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black transition active:scale-[0.98] ${
                        selectedColorId ===
                        color.id
                          ? "border-[#031B14] bg-[#031B14] text-[#FFFDF9]"
                          : "border-[#E4D7C4] bg-[#FFFDF9] text-[#211C18]"
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                        style={{
                          background:
                            color.hexCode ||
                            "#d4d4d8",
                        }}
                      />
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                {colors.map((color) => {
                  const colorVariants =
                    product.variants.filter(
                      (variant) =>
                        variant.color.id === color.id,
                    );

                  const colorImage =
                    imageForColor(color.id);

                  return (
                    <div
                      key={color.id}
                      className="rounded-2xl border border-black/[0.07] bg-[#FFFDF9] p-4 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              selectColor(color.id)
                            }
                            className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-[#E4D7C4] bg-[#F4EBDD]"
                            aria-label={`View ${color.name} product image`}
                          >
                            {colorImage ? (
                              <img
                                src={colorImage}
                                alt={`${product.name} - ${color.name}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span
                                className="absolute inset-0"
                                style={{
                                  background:
                                    color.hexCode ||
                                    "#d4d4d8",
                                }}
                              />
                            )}

                            <span
                              className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border border-white shadow"
                              style={{
                                background:
                                  color.hexCode ||
                                  "#d4d4d8",
                              }}
                            />
                          </button>

                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A7518]">
                              Color Variant
                            </p>

                            <p className="truncate text-sm font-black text-[#211C18]">
                              {color.name}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                selectColor(color.id)
                              }
                              className="mt-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#0D5A43] underline underline-offset-2"
                            >
                              View Product
                            </button>
                          </div>
                        </div>

                        <p className="shrink-0 text-xs font-bold text-zinc-500">
                          {colorVariants.reduce(
                            (total, variant) =>
                              total + variant.stock,
                            0,
                          )} pcs stock
                        </p>
                      </div>

                      <div className="space-y-3">
                        {colorVariants.map((variant) => {
                          const variantQuantity =
                            resellerQuantities[
                              variant.id
                            ] ?? 0;

                          const variantPrice =
                            variant.resellerPrice !==
                              null &&
                            variant.resellerPrice !==
                              undefined
                              ? Number(
                                  variant.resellerPrice,
                                )
                              : Number(
                                  product.resellerPrice ??
                                    product.retailPrice ??
                                    0,
                                );

                          return (
                            <div
                              key={variant.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.05] bg-white p-3"
                            >
                              <div>
                                <p className="text-sm font-black">
                                  Size{" "}
                                  {sizeLabel(
                                    variant.size.name,
                                    variant.size.inches,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-zinc-500">
                                  {money(variantPrice)} each · Stock {variant.stock}
                                </p>
                              </div>

                              <div className="flex items-center overflow-hidden rounded-xl border border-black/10 bg-white">
                                <button
                                  disabled={
                                    product.smartStockBalance ||
                                    variantQuantity <= 0
                                  }
                                  onClick={() =>
                                    changeResellerQuantity(
                                      variant.id,
                                      variant.stock,
                                      -1,
                                    )
                                  }
                                  className="px-3 py-2 font-black disabled:text-zinc-300"
                                >
                                  −
                                </button>

                                <span className="min-w-9 text-center text-sm font-black">
                                  {variantQuantity}
                                </span>

                                <button
                                  disabled={
                                    product.smartStockBalance ||
                                    variantQuantity >=
                                      variant.stock
                                  }
                                  onClick={() =>
                                    changeResellerQuantity(
                                      variant.id,
                                      variant.stock,
                                      1,
                                    )
                                  }
                                  className="px-3 py-2 font-black disabled:text-zinc-300"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-[1.5rem] bg-[#031B14] p-5 text-[#FFFDF9] shadow-xl shadow-black/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Total Selected
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {totalResellerQuantity} /{" "}
                      {product.smartStockBalance
                        ? smartTargetQuantity
                        : minimumQuantity}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Total
                    </p>

                    <p className="mt-1 text-xl font-black">
                      {money(resellerTotal)}
                    </p>
                  </div>
                </div>

                {!resellerMeetsMOQ ? (
                  <p className="mt-4 rounded-xl bg-amber-400/15 px-4 py-3 text-sm font-bold text-amber-300">
                    {product.smartStockBalance
                      ? smartStockPlan.reason ||
                        "Smart pack is being prepared."
                      : `Add ${Math.max(
                          0,
                          minimumQuantity -
                            totalResellerQuantity,
                        )} more pieces to reach MOQ.`}
                  </p>
                ) : (
                  <p className="mt-4 rounded-xl bg-emerald-400/15 px-4 py-3 text-sm font-bold text-emerald-300">
                    {product.smartStockBalance
                      ? "✓ Smart balanced pack ready. Colours and sizes are auto allocated."
                      : "✓ MOQ reached. You can proceed."}
                  </p>
                )}
              </div>

              {resellerMeetsMOQ && (
                <button
                  disabled={adding}
                  onClick={addResellerSelectionToCart}
                  className="mt-5 w-full rounded-2xl bg-emerald-600 py-4 text-[13px] font-black text-white shadow-lg transition active:scale-[0.99] hover:bg-emerald-700 disabled:bg-zinc-300"
                >
                  {adding
                    ? "Adding..."
                    : "Proceed to Buy"}
                </button>
              )}
            </div>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              [
                "✓",
                "Quality Checked",
                "Selected styles",
              ],
              [
                "₹",
                "COD Available",
                "Easy payment",
              ],
              [
                "◎",
                "Secure Order",
                "Protected checkout",
              ],
            ].map(
              ([icon, title, subtitle]) => (
                <div
                  key={title}
                  className="rounded-[1.25rem] border border-black/[0.05] bg-[#FAF7F0] px-2 py-3.5 text-center"
                >
                  <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-white text-[11px] font-black text-emerald-700 shadow-sm">
                    {icon}
                  </span>

                  <p className="mt-2 text-[9px] font-black leading-tight text-zinc-900">
                    {title}
                  </p>

                  <p className="mt-1 hidden text-[7px] font-medium text-zinc-400 min-[360px]:block">
                    {subtitle}
                  </p>
                </div>
              ),
            )}
          </div>

          {product.description && (
            <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-black/[0.06] bg-[#FAF7F0]">
              <div className="border-b border-black/[0.05] px-5 py-4">
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-emerald-700">
                  About this piece
                </p>

                <h2 className="mt-1 text-[15px] font-black text-zinc-950">
                  Product Details
                </h2>
              </div>

              <div className="px-5 py-4">
                <p className="whitespace-pre-line text-[12px] leading-6 text-zinc-600 sm:text-sm sm:leading-7">
                  {product.description
                    .replace(
                      /^\s*product details\s*[:\-]?\s*$/gim,
                      "",
                    )
                    .replace(
                      /\n{3,}/g,
                      "\n\n",
                    )
                    .trim()}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-black/[0.06] bg-white shadow-[0_12px_35px_rgba(0,0,0,0.04)]">
            <div className="flex items-end justify-between gap-4 border-b border-black/[0.05] bg-[#FAF7F0] px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Verified Buyers
                </p>

                <h2 className="mt-1 text-lg font-black">
                  Customer Reviews
                </h2>
              </div>

              {reviews.length > 0 && (
                <div className="text-right">
                  <p className="text-xl font-black">
                    ★{" "}
                    {averageRating.toFixed(
                      1,
                    )}
                  </p>

                  <p className="text-[10px] font-bold text-zinc-400">
                    {reviews.length}{" "}
                    review
                    {reviews.length === 1
                      ? ""
                      : "s"}
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 pb-5">
            {reviews.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-500">
                No approved reviews
                yet.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {reviews.map(
                  (review) => (
                    <article
                      key={
                        review.id
                      }
                      className="rounded-[1.2rem] border border-black/[0.05] bg-[#FAF7F0] p-4 shadow-[0_4px_18px_rgba(0,0,0,0.025)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black">
                            {
                              review.customerName
                            }
                          </p>

                          <p className="mt-1 text-sm text-amber-500">
                            {"★".repeat(
                              review.rating,
                            )}
                            <span className="text-zinc-200">
                              {"★".repeat(
                                5 -
                                  review.rating,
                              )}
                            </span>
                          </p>
                        </div>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                          Verified
                        </span>
                      </div>

                      {review.title && (
                        <h3 className="mt-4 text-sm font-black">
                          {
                            review.title
                          }
                        </h3>
                      )}

                      {review.comment && (
                        <p className="mt-2 text-sm leading-6 text-zinc-600">
                          {
                            review.comment
                          }
                        </p>
                      )}

                      <p className="mt-3 text-[10px] font-semibold text-zinc-400">
                        {new Date(
                          review.createdAt,
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            dateStyle:
                              "medium",
                          },
                        )}
                      </p>
                    </article>
                  ),
                )}
              </div>
            )}
            </div>
          </div>
        </section>
      </div>

      {cartNotice && (
        <div className="fixed left-1/2 top-[78px] z-[70] w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-[1.3rem] border border-emerald-400/25 bg-[#031B14]/95 p-3.5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-400 text-lg font-black text-[#031B14]">
              ✓
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Added to Bag
              </p>

              <p className="mt-1 truncate text-[12px] font-black">
                {product.name}
              </p>

              <p className="mt-0.5 text-[10px] font-semibold text-white/55">
                {quantity} × {money(currentPrice)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="shrink-0 rounded-full bg-white px-4 py-2.5 text-[9px] font-black text-[#031B14]"
            >
              View Bag →
            </button>
          </div>
        </div>
      )}

      {buyNowOpen &&
        selectedVariant && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
            <button
              type="button"
              aria-label="Close Buy Now popup"
              onClick={() =>
                setBuyNowOpen(false)
              }
              className="absolute inset-0 bg-black/65 backdrop-blur-[3px]"
            />

            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[2rem] bg-[#FFFDF9] shadow-[0_-20px_70px_rgba(0,0,0,0.28)] sm:rounded-[2rem]">
              <div className="h-1 w-full bg-gradient-to-r from-[#7C3A45] via-[#D4AF37] to-[#7C3A45]" />

              <div className="flex items-start justify-between px-5 pb-3 pt-5">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.24em] text-[#7C3A45]">
                    AS Fashions
                  </p>

                  <h2 className="mt-1 font-serif text-2xl text-zinc-950">
                    Confirm your look
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setBuyNowOpen(
                      false,
                    )
                  }
                  className="grid h-10 w-10 place-items-center rounded-full border border-black/[0.08] bg-white text-lg text-zinc-600 shadow-sm"
                >
                  ×
                </button>
              </div>

              <div className="px-5">
                <div className="flex gap-4 rounded-[1.3rem] border border-black/[0.06] bg-[#F8F1E7] p-3">
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
                    {imageForColor(
                      selectedVariant.color.id,
                    ) ? (
                      <img
                        src={
                          imageForColor(
                            selectedVariant.color.id,
                          )!
                        }
                        alt={
                          product.name
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-serif text-xl text-[#D4AF37]">
                        AS
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 py-1">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#7C3A45]">
                      {
                        product
                          .category
                          .name
                      }
                    </p>

                    <h3 className="mt-1 line-clamp-2 text-[15px] font-black leading-5 text-zinc-950">
                      {
                        product.name
                      }
                    </h3>

                    <p className="mt-2 text-lg font-black text-zinc-950">
                      {money(
                        currentPrice,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-black/[0.06] bg-white p-3 text-center">
                    <p className="text-[7px] font-black uppercase tracking-[0.14em] text-zinc-400">
                      Color
                    </p>

                    <p className="mt-1 truncate text-[10px] font-black text-zinc-900">
                      {
                        selectedVariant
                          .color
                          .name
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border border-black/[0.06] bg-white p-3 text-center">
                    <p className="text-[7px] font-black uppercase tracking-[0.14em] text-zinc-400">
                      Size
                    </p>

                    <p className="mt-1 truncate text-[10px] font-black text-zinc-900">
                      {sizeLabel(
                        selectedVariant
                          .size
                          .name,
                        selectedVariant
                          .size
                          .inches,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-black/[0.06] bg-white p-3 text-center">
                    <p className="text-[7px] font-black uppercase tracking-[0.14em] text-zinc-400">
                      Qty
                    </p>

                    <p className="mt-1 text-[10px] font-black text-zinc-900">
                      {quantity}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.2rem] bg-[#080B0D] p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
                        Order Total
                      </p>

                      <p className="mt-1 text-[10px] text-white/45">
                        {quantity} ×{" "}
                        {money(
                          currentPrice,
                        )}
                      </p>
                    </div>

                    <p className="text-2xl font-black text-[#D4AF37]">
                      {money(
                        currentPrice *
                          quantity,
                      )}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[8px] font-semibold text-white/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                    COD available · Secure checkout
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-[0.75fr_1.4fr] gap-2 border-t border-black/[0.06] bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setBuyNowOpen(
                      false,
                    )
                  }
                  className="min-h-[54px] rounded-[1rem] border-2 border-zinc-950 bg-white text-[11px] font-black text-zinc-950"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={adding}
                  onClick={() => {
                    setBuyNowOpen(
                      false,
                    );
                    buyNow();
                  }}
                  className="min-h-[54px] rounded-[1rem] bg-[#7C3A45] px-3 text-[11px] font-black text-white shadow-[0_12px_30px_rgba(124,39,50,0.28)] disabled:opacity-50"
                >
                  {adding
                    ? "Preparing..."
                    : "Continue to Checkout →"}
                </button>
              </div>
            </div>
          </div>
        )}

      {sizeGuideOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5">
          <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-t-[2rem] bg-[#FFFDF9] shadow-2xl sm:rounded-[2rem]">
            <div className="flex items-start justify-between gap-4 border-b border-[#E4D7C4] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6B5435]">
                  Kids Fit Guide
                </p>
                <h2 className="mt-1 text-xl font-black text-[#211C18]">
                  Choose by measurements
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-5 text-[#7B7066]">
                  Age is only a guide. Compare the child&apos;s actual height, chest and waist before choosing a size.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSizeGuideOpen(false)
                }
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E4D7C4] bg-white font-black"
              >
                ×
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto">
              <table className="min-w-[760px] w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#031B14] text-[#FFFDF9]">
                  <tr>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Age Guide</th>
                    <th className="px-4 py-3">Height cm</th>
                    <th className="px-4 py-3">Chest in</th>
                    <th className="px-4 py-3">Waist in</th>
                    <th className="px-4 py-3">Hip in</th>
                    <th className="px-4 py-3">Garment Length</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4D7C4]">
                  {productSizeGuides.map(
                    (guide) => (
                      <tr key={guide.id}>
                        <td className="px-4 py-4 font-black">
                          {guide.name}
                        </td>
                        <td className="px-4 py-4">
                          {guide.ageGuide ?? "—"}
                        </td>
                        <td className="px-4 py-4">
                          {guide.heightCm ?? "—"}
                        </td>
                        <td className="px-4 py-4">
                          {guide.chestIn ?? "—"}
                        </td>
                        <td className="px-4 py-4">
                          {guide.waistIn ?? "—"}
                        </td>
                        <td className="px-4 py-4">
                          {guide.hipIn ?? "—"}
                        </td>
                        <td className="px-4 py-4">
                          {guide.garmentLengthIn ??
                            "—"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {productSizeGuides.some(
              (guide) => guide.fitNote,
            ) && (
              <div className="border-t border-[#E4D7C4] px-5 py-4 text-xs text-[#6B5435] sm:px-6">
                {productSizeGuides
                  .filter(
                    (guide) => guide.fitNote,
                  )
                  .slice(0, 2)
                  .map((guide) => (
                    <p
                      key={guide.id}
                      className="mt-1"
                    >
                      <strong>{guide.name}:</strong>{" "}
                      {guide.fitNote}
                    </p>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!isReseller && (
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
          <div className="w-full border-t border-[#E4D7C4] bg-[#FFFDF9]/98 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_35px_rgba(0,0,0,0.14)] backdrop-blur-xl">
            <div className="flex w-full items-center gap-2">
              <div className="min-w-[78px] px-1">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />

                  <p className="text-[7px] font-black uppercase tracking-[0.15em] text-[#6B5435]">
                    Price
                  </p>
                </div>

                <p className="mt-1 text-[18px] font-black leading-none tracking-[-0.04em] text-[#211C18]">
                  {money(currentPrice)}
                </p>

                {product.mrp &&
                  Number(product.mrp) >
                    currentPrice && (
                    <p className="mt-1 text-[8px] font-semibold text-[#9A9188] line-through">
                      {money(product.mrp)}
                    </p>
                  )}
              </div>

              <button
                type="button"
                disabled={
                  adding ||
                  !selectedVariant ||
                  availableStock <= 0
                }
                onClick={addToCart}
                className="min-h-[56px] flex-1 rounded-[1rem] border-2 border-[#031B14] bg-[#FFFDF9] px-2 text-[11px] font-black text-[#031B14] transition-[transform,opacity] duration-200 active:scale-[0.98] disabled:border-[#E4D7C4] disabled:bg-[#F4EBDD] disabled:text-[#9A9188]"
              >
                Add to Cart
              </button>

              <button
                type="button"
                disabled={
                  adding ||
                  !selectedVariant ||
                  availableStock <= 0
                }
                onClick={openBuyNowPopup}
                className="min-h-[56px] flex-[1.15] rounded-[1rem] bg-[#031B14] px-2 text-[12px] font-black text-[#FFFDF9] shadow-[0_10px_24px_rgba(3,27,20,0.28)] transition-[transform,opacity] duration-200 active:scale-[0.98] disabled:bg-[#E4D7C4] disabled:text-[#9A9188] disabled:shadow-none"
              >
                Buy Now →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

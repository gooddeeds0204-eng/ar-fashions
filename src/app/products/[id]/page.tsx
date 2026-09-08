"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUserId } from "@/lib/user-session";
import { ensureUserSession } from "@/lib/user-session-init";

type Media = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  thumbnailUrl?: string | null;
  altText?: string | null;
  sortOrder: number;
  isActive: boolean;
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

  const [selectedColorId, setSelectedColorId] = useState("");
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(0);

  const [quantity, setQuantity] = useState(1);
  const [isReseller, setIsReseller] = useState(false);
  const [resellerQuantities, setResellerQuantities] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);

  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [reviews, setReviews] =
    useState<ProductReview[]>([]);

  const [
    averageRating,
    setAverageRating,
  ] = useState(0);

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    setIsReseller(mode === "reseller");
  }, []);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/products/${productId}`,
          {
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ?? "Failed to load product",
          );
        }

        setProduct(data);

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
    async function loadWishlistState() {
      try {
        await ensureUserSession();

        const userId = getUserId();

        if (!userId || !productId) return;

        const response = await fetch(
          `/api/wishlist?userId=${encodeURIComponent(userId)}`,
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
  }, [productId]);

  useEffect(() => {
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
  }, [productId]);

  async function toggleWishlist() {
    if (wishlistLoading || !product) return;

    const userId =
      getUserId() ?? (await ensureUserSession());

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
              userId,
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
              userId,
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
        !map.has(variant.size.id)
      ) {
        map.set(variant.size.id, variant.size);
      }
    }

    return Array.from(map.values());
  }, [product, selectedColorId]);

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

  const minimumQuantity = isReseller
    ? Math.max(1, product?.resellerMOQ ?? 1)
    : 1;

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
    totalResellerQuantity >= minimumQuantity;

  function changeResellerQuantity(
    variantId: string,
    stock: number,
    change: number,
  ) {
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
    if (!product) return;

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

    const cart = getCart();

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
            product.media.find(
              (item) => item.type === "IMAGE",
            )?.url ??
            product.media[0]?.url ??
            null,
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
    if (!product) return;

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
          product.media.find(
            (item) => item.type === "IMAGE",
          )?.url ??
          product.media[0]?.url ??
          null,
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

    alert("Added to cart successfully.");

    router.push("/cart");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <div className="text-sm font-semibold text-zinc-500">
          Loading product...
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6">
        <div className="text-center">
          <h1 className="text-xl font-black">
            Product not found
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            {error}
          </p>

          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-zinc-950 px-6 py-3 text-sm font-bold text-white"
          >
            Back to Shop
          </button>
        </div>
      </main>
    );
  }

  const media =
    product.media.length > 0
      ? product.media[selectedMedia] ??
        product.media[0]
      : null;

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="mr-4 rounded-full px-3 py-2 text-sm font-bold hover:bg-zinc-100"
          >
            ←
          </button>

          <button
            onClick={() => router.push("/")}
            className="text-xl font-black tracking-[-0.05em]"
          >
            AR
            <span className="text-emerald-600">
              FASHIONS
            </span>
          </button>

          <button
            onClick={() => router.push("/cart")}
            className="ml-auto rounded-full border border-black/10 px-4 py-2 text-xs font-bold"
          >
            🛒 Cart
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-12">
        {/* MEDIA */}
        <section>
          <div className="overflow-hidden rounded-3xl bg-zinc-100">
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

          {product.media.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-3">
              {product.media.map(
                (item, index) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setSelectedMedia(index)
                    }
                    className={`overflow-hidden rounded-xl border-2 ${
                      selectedMedia === index
                        ? "border-emerald-600"
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
        <section className="lg:py-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
            {product.category.name}
          </p>

          <div className="mt-2 flex items-start gap-4">
            <h1 className="flex-1 text-3xl font-black tracking-tight sm:text-4xl">
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
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-white text-2xl shadow-sm transition ${
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

          <div className="mt-6 flex items-center gap-3">
            <span className="text-3xl font-black">
              {money(currentPrice)}
            </span>

            {product.mrp &&
              Number(product.mrp) >
                currentPrice && (
                <span className="text-base text-zinc-400 line-through">
                  {money(product.mrp)}
                </span>
              )}
          </div>

          {isReseller && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
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
          <div className="mt-8">
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
                  className={`rounded-full border-2 px-4 py-2 text-xs font-bold ${
                    selectedColorId ===
                    color.id
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-black/10 bg-white"
                  }`}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </div>

          {/* SIZE */}
          <div className="mt-8">
            <p className="mb-3 text-sm font-bold">
              Size
            </p>

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
                    className={`min-w-14 rounded-xl border px-4 py-3 text-xs font-bold ${
                      selectedSizeId ===
                      size.id
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : disabled
                          ? "cursor-not-allowed border-black/5 bg-zinc-100 text-zinc-300"
                          : "border-black/10 bg-white"
                    }`}
                  >
                    <span className="block">
                      {size.name}
                    </span>

                    {size.inches ? (
                      <span className="mt-1 block text-[9px] font-semibold opacity-80">
                        Height {size.inches}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STOCK */}
          <div className="mt-6">
            {selectedVariant ? (
              availableStock > 0 ? (
                <p className="text-sm font-bold text-emerald-600">
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
          <div className="mt-6 flex items-center gap-4">
            <p className="text-sm font-bold">
              Quantity
            </p>

            <div className="flex items-center overflow-hidden rounded-xl border border-black/10 bg-white">
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
            <button
              disabled={
                adding ||
                !selectedVariant ||
                availableStock <= 0
              }
              onClick={addToCart}
              className="mt-8 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {adding
                ? "Adding..."
                : isReseller
                  ? "Proceed to Buy"
                  : "Add to Cart"}
            </button>
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
                  Build Your Reseller Set
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Mix sizes and colors. Total quantity must reach MOQ {minimumQuantity}.
                </p>
              </div>

              <div className="space-y-5">
                {colors.map((color) => {
                  const colorVariants =
                    product.variants.filter(
                      (variant) =>
                        variant.color.id === color.id,
                    );

                  return (
                    <div
                      key={color.id}
                      className="rounded-2xl border border-black/10 bg-white p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <p className="font-black">
                          {color.name}
                        </p>

                        <p className="text-xs font-bold text-zinc-500">
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
                              className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 p-3"
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

              <div className="mt-6 rounded-2xl border border-black/10 bg-zinc-950 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Total Selected
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {totalResellerQuantity} / {minimumQuantity}
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
                    Add {Math.max(
                      0,
                      minimumQuantity -
                        totalResellerQuantity,
                    )} more pieces to reach MOQ.
                  </p>
                ) : (
                  <p className="mt-4 rounded-xl bg-emerald-400/15 px-4 py-3 text-sm font-bold text-emerald-300">
                    ✓ MOQ reached. You can proceed.
                  </p>
                )}
              </div>

              {resellerMeetsMOQ && (
                <button
                  disabled={adding}
                  onClick={addResellerSelectionToCart}
                  className="mt-6 w-full rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:bg-zinc-300"
                >
                  {adding
                    ? "Adding..."
                    : "Proceed to Buy"}
                </button>
              )}
            </div>
          )}

          {product.description && (
            <div className="mt-8 border-t border-black/10 pt-6">
              <h2 className="text-sm font-black">
                Product Details
              </h2>

              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-600">
                {product.description}
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-black/10 pt-6">
            <div className="flex items-end justify-between gap-4">
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
                      className="rounded-2xl border border-black/10 p-4"
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
        </section>
      </div>
    </main>
  );
}

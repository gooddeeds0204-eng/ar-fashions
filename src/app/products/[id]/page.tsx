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
};

function money(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "₹0";
  }

  return `₹${Number(value).toLocaleString("en-IN")}`;
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
  const [adding, setAdding] = useState(false);

  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

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

  const currentPrice = selectedVariant?.retailPrice
    ? Number(selectedVariant.retailPrice)
    : Number(product?.retailPrice ?? 0);

  const availableStock =
    selectedVariant?.stock ?? 0;

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

    setAdding(true);

    const cart = getCart();

    const existingIndex = cart.findIndex(
      (item) =>
        item.productId === product.id &&
        item.variantId === selectedVariant.id,
    );

    if (existingIndex >= 0) {
      const newQuantity =
        cart[existingIndex].quantity + quantity;

      cart[existingIndex].quantity = Math.min(
        newQuantity,
        selectedVariant.stock,
      );
    } else {
      cart.push({
        id: `${product.id}-${selectedVariant.id}`,
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
        sizeName: selectedVariant.size.name,
        price: currentPrice,
        quantity,
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
                    {size.name}
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
              : "Add to Cart"}
          </button>

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
        </section>
      </div>
    </main>
  );
}

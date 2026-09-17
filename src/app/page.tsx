"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureUserSession } from "@/lib/user-session-init";
import { useRouter } from "next/navigation";
import PromoSlot from "@/components/PromoSlot";
import BrandLogo from "@/components/BrandLogo";
import StorefrontDrawer from "@/components/StorefrontDrawer";

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
  sku: string | null;
  gender: "WOMEN" | "MEN" | "KIDS" | "UNISEX";
  description?: string | null;
  fabric?: string | null;
  retailPrice: string | number;
  resellerPrice: string | number | null;
  mrp: string | number | null;
  resellerMOQ: number | null;
  salesMode: "RETAIL" | "BULK" | "BOTH";
  status: string;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  category: {
    id: string;
    name: string;
  };
  media: Media[];
  variants?: Array<{
    id: string;
    stock: number;
    isActive: boolean;
  }>;
};

type StoreCategoryChild = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  children: StoreCategoryChild[];
};

type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;

  imageUrl: string | null;
  videoUrl: string | null;
  mobileImageUrl: string | null;
  mobileVideoUrl: string | null;

  buttonText: string | null;
  buttonUrl: string | null;

  placement: "HOME_HERO";
  contentType:
    | "IMAGE"
    | "VIDEO"
    | "GRAPHIC";

  audience:
    | "ALL"
    | "RETAIL"
    | "RESELLER";

  backgroundColor: string | null;
  backgroundGradient: string | null;
  textColor: string | null;

  textAlign:
    | "LEFT"
    | "CENTER"
    | "RIGHT";

  overlayOpacity: number;
  sortOrder: number;
};

type HomeSection = {
  id: string;
  title: string;
  subtitle: string;
  sectionType:
    | "NEW_ARRIVALS"
    | "TRENDING"
    | "REELS"
    | "FEATURED";
  sortOrder: number;
};

type Reel = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string;
  sortOrder: number;
  source: "UPLOAD" | "INSTAGRAM";
  instagramEmbedUrl: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    slug: string;
    retailPrice: number;
    resellerPrice: number | null;
    salesMode: "RETAIL" | "BULK" | "BOTH";
    image: string | null;
  };
};

type Mode = "RETAIL" | "RESELLER";

type PublicSiteSettings = {
  storeName: string;
  supportPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  storeNotice: string;
  codEnabled: boolean;
  minimumRetailOrder: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

type PublicSalesMode = {
  retailStatus:
    | "OPEN"
    | "CLOSED";
  resellerStatus:
    | "OPEN"
    | "CLOSED";
  retailMessage: string;
  resellerMessage: string;
};

const DEFAULT_PUBLIC_SITE_SETTINGS:
  PublicSiteSettings = {
    storeName:
      "AR FASHIONS",
    supportPhone: "",
    whatsappNumber: "",
    supportEmail: "",
    storeNotice: "",
    codEnabled: true,
    minimumRetailOrder: 0,
    maintenanceMode:
      false,
    maintenanceMessage:
      "We are currently updating the store. Please check back shortly.",
  };

const DEFAULT_PUBLIC_SALES_MODE:
  PublicSalesMode = {
    retailStatus: "OPEN",
    resellerStatus: "OPEN",
    retailMessage:
      "Retail shopping is open.",
    resellerMessage:
      "Reseller orders are open.",
  };

function money(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "₹0";
  }

  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function ProductCard({
  product,
  mode,
}: {
  product: Product;
  mode: Mode;
}) {
  const router = useRouter();

  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    async function loadWishlistState() {
      try {
        const userId =
          await ensureUserSession();

        if (!userId) return;

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
              item.productId === product.id,
          ),
        );
      } catch (error) {
        console.error(
          "Wishlist state failed:",
          error,
        );
      }
    }

    loadWishlistState();
  }, [product.id]);

  async function toggleWishlist() {
    if (wishlistLoading) return;

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
        "Wishlist toggle failed:",
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

  const media =
    product.media.find((item) => item.type === "IMAGE") ??
    product.media[0];

  const price =
    mode === "RESELLER" && product.resellerPrice !== null
      ? product.resellerPrice
      : product.retailPrice;

  const discountPercent =
    product.mrp &&
    Number(product.mrp) > Number(price)
      ? Math.round(
          ((Number(product.mrp) - Number(price)) /
            Number(product.mrp)) *
            100,
        )
      : 0;

  return (
    <article
      onClick={() => router.push(`/products/${product.id}?mode=${mode.toLowerCase()}`)}
      className="group min-w-0 cursor-pointer overflow-hidden bg-transparent transition duration-300 active:scale-[0.985]"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1rem] border border-white/10 bg-[#171313] shadow-[0_14px_34px_rgba(0,0,0,0.25)]">
        {media?.type === "VIDEO" ? (
          <video
            src={media.url}
            muted
            autoPlay
            loop
            playsInline
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : media ? (
          <img
            src={media.url}
            alt={media.altText ?? product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            No image
          </div>
        )}

        {product.isNewArrival && (
          <span className="absolute left-2 top-2 rounded-full bg-[#7C2732] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white shadow-sm">
            New
          </span>
        )}

        <button
          type="button"
          disabled={wishlistLoading}
          onClick={(event) => {
            event.stopPropagation();
            toggleWishlist();
          }}
          className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-xl shadow-sm transition active:scale-90 ${
            wishlisted
              ? "text-red-500"
              : "text-zinc-700"
          } ${
            wishlistLoading
              ? "opacity-50"
              : "hover:scale-110"
          }`}
          aria-label={
            wishlisted
              ? "Remove from Wishlist"
              : "Add to Wishlist"
          }
        >
          {wishlisted ? "♥" : "♡"}
        </button>
      </div>

      <div className="px-1 pb-2 pt-2.5 sm:px-1.5 sm:pt-3">
        <p className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#D4AF37]">
          {product.category.name}
        </p>

        <h3 className="line-clamp-1 text-[12px] font-semibold text-zinc-100 sm:text-sm">
          {product.name}
        </h3>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
          <span className="text-[13px] font-black text-white sm:text-[15px]">
            {money(price)}
          </span>

          {product.mrp &&
            Number(product.mrp) > Number(price) && (
              <span className="text-[10px] text-zinc-400 line-through sm:text-[11px]">
                {money(product.mrp)}
              </span>
            )}

          {discountPercent > 0 && (
            <span className="text-[9px] font-black text-[#D4AF37] sm:text-[10px]">
              ({discountPercent}% OFF)
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-[#D4AF37]">
            {mode === "RESELLER"
              ? "Bulk Ready"
              : product.isNewArrival
                ? "Fresh Drop"
                : product.isTrending
                  ? "Trending"
                  : "AR Pick"}
          </span>

          <span className="text-[8px] font-bold text-[#D4AF37]">
            {product.isFeatured
              ? "Signature Edit"
              : "Curated Style"}
          </span>
        </div>

        {mode === "RESELLER" && product.resellerPrice !== null && (
          <p className="mt-1 text-[11px] font-semibold text-[#D4AF37]">
            MOQ {product.resellerMOQ ?? 1} pcs
          </p>
        )}

      </div>
    </article>
  );
}

function ProductSection({
  title,
  subtitle,
  products,
  mode,
}: {
  title: string;
  subtitle: string;
  products: Product[];
  mode: Mode;
}) {
  const router = useRouter();

  if (products.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-9 sm:px-6 sm:py-11 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-7">
        <div>
          <p className="mb-2 text-[8px] font-black uppercase tracking-[0.28em] text-[#B9912E]">
            AR Fashions
          </p>

          <h2 className="font-serif text-[1.9rem] font-normal leading-none text-white sm:text-3xl">
            {title}
          </h2>

          <p className="mt-2 text-[10px] font-medium text-white/40 sm:text-xs">
            {subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
          className="hidden rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-white/70 sm:block"
        >
          View All →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
        {products.slice(0, 5).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            mode={mode}
          />
        ))}
      </div>
    </section>
  );
}


function BrandHighlights({
  mode,
}: {
  mode: Mode;
}) {
  const highlights = [
    {
      icon: "✦",
      title: "AR Curated",
      subtitle: "Selected styles",
    },
    {
      icon: "₹",
      title:
        mode === "RESELLER"
          ? "Bulk Pricing"
          : "Easy Shopping",
      subtitle:
        mode === "RESELLER"
          ? "Seller friendly"
          : "Simple checkout",
    },
    {
      icon: "✓",
      title: "Quality First",
      subtitle: "Fashion checked",
    },
    {
      icon: "↗",
      title: "Fresh Drops",
      subtitle: "New styles often",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-5 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {highlights.map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-3 rounded-[1.15rem] border border-black/[0.05] bg-white p-3 shadow-[0_6px_24px_rgba(0,0,0,0.035)] sm:p-4"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f2f0eb] text-sm font-black text-[#B9912E]">
              {item.icon}
            </span>

            <span className="min-w-0">
              <span className="block text-[10px] font-black text-zinc-900 sm:text-[11px]">
                {item.title}
              </span>

              <span className="mt-0.5 block text-[8px] font-medium text-zinc-400 sm:text-[9px]">
                {item.subtitle}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}


function FashionReelsSection({
  title,
  subtitle,
  reels,
  mode,
}: {
  title: string;
  subtitle: string;
  reels: Reel[];
  mode: Mode;
}) {
  const router = useRouter();

  const preferredReel =
    reels.find(
      (item) =>
        item.source === "UPLOAD",
    ) ?? reels[0];

  const [
    selectedReelId,
    setSelectedReelId,
  ] = useState<string | null>(
    preferredReel?.id ?? null,
  );

  useEffect(() => {
    if (reels.length === 0) {
      return;
    }

    const stillExists =
      reels.some(
        (item) =>
          item.id ===
          selectedReelId,
      );

    if (!stillExists) {
      const preferred =
        reels.find(
          (item) =>
            item.source ===
            "UPLOAD",
        ) ?? reels[0];

      setSelectedReelId(
        preferred.id,
      );
    }
  }, [
    reels,
    selectedReelId,
  ]);

  if (reels.length === 0) {
    return null;
  }

  const selectedReel =
    reels.find(
      (item) =>
        item.id ===
        selectedReelId,
    ) ??
    preferredReel ??
    reels[0];

  const selectedPrice =
    mode === "RESELLER" &&
    selectedReel.product.resellerPrice !== null
      ? selectedReel.product.resellerPrice
      : selectedReel.product.retailPrice;

  function openProduct(
    reel: Reel,
  ) {
    router.push(
      `/products/${reel.product.id}?mode=${mode.toLowerCase()}`,
    );
  }

  return (
    <section
      id="fashion-reels"
      className="mx-3 overflow-hidden rounded-[1.8rem] border border-[#D4AF37]/10 bg-[#050506] py-8 text-white shadow-[0_30px_80px_rgba(0,0,0,0.42)] sm:mx-6 sm:py-10 lg:mx-auto lg:max-w-7xl"
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-px w-5 bg-[#D4AF37]" />

              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                AR Live Looks
              </p>
            </div>

            <h2 className="mt-2 font-serif text-[2rem] leading-none text-white sm:text-3xl">
              {title}
            </h2>

            <p className="mt-2 text-[10px] text-white/40 sm:text-xs">
              Watch the look. Shop the look.
            </p>
          </div>

          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[7px] font-black uppercase tracking-[0.14em] text-white/50">
            {reels.length} Reels
          </span>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-3 sm:grid-cols-[minmax(0,1fr)_140px] sm:gap-4 lg:grid-cols-[420px_150px_minmax(0,1fr)]">
          {/* CINEMATIC MAIN REEL */}
          <div className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-black shadow-[0_22px_50px_rgba(0,0,0,0.4)]">
            <div className="relative aspect-[9/16]">
              {selectedReel.source === "UPLOAD" ? (
                <video
                  key={selectedReel.id}
                  src={selectedReel.url}
                  poster={
                    selectedReel.thumbnailUrl ??
                    undefined
                  }
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : selectedReel.instagramEmbedUrl ? (
                <iframe
                  key={selectedReel.id}
                  src={selectedReel.instagramEmbedUrl}
                  title={selectedReel.caption}
                  className="h-full w-full border-0 bg-black"
                  allow="autoplay; encrypted-media"
                />
              ) : selectedReel.thumbnailUrl ? (
                <img
                  src={selectedReel.thumbnailUrl}
                  alt={selectedReel.caption}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#4B1821] to-black">
                  <span className="text-4xl">
                    ▶
                  </span>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.16em] text-[#D4AF37] backdrop-blur">
                    {selectedReel.source === "UPLOAD"
                      ? "AR Original"
                      : "Instagram"}
                  </span>

                  <span className="rounded-full bg-black/40 px-2.5 py-1 text-[7px] font-bold text-white/70 backdrop-blur">
                    Full Look
                  </span>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/55 to-transparent p-4">
                <p className="line-clamp-2 text-[15px] font-black leading-5 text-white sm:text-lg">
                  {selectedReel.product.name}
                </p>

                <p className="mt-2 text-[15px] font-black text-[#D4AF37]">
                  {money(selectedPrice)}
                </p>
              </div>
            </div>
          </div>

          {/* VERTICAL REEL RAIL */}
          <div className="max-h-[590px] space-y-2 overflow-y-auto pr-0.5 sm:max-h-[700px] sm:space-y-3">
            {reels
              .slice(0, 10)
              .map((reel) => {
                const active =
                  reel.id ===
                  selectedReel.id;

                return (
                  <button
                    key={reel.id}
                    type="button"
                    onClick={() =>
                      setSelectedReelId(
                        reel.id,
                      )
                    }
                    className={`relative block w-full overflow-hidden rounded-xl border transition active:scale-[0.97] ${
                      active
                        ? "border-[#D4AF37] shadow-[0_0_18px_rgba(212,175,55,0.22)]"
                        : "border-white/10"
                    }`}
                  >
                    <div className="relative aspect-[9/14] bg-[#181313]">
                      {reel.thumbnailUrl ? (
                        <img
                          src={reel.thumbnailUrl}
                          alt={reel.caption}
                          className="h-full w-full object-cover"
                        />
                      ) : reel.source === "UPLOAD" ? (
                        <video
                          src={reel.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#5A1D28] to-black">
                          <span className="text-xl">
                            ▶
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                      <div className="absolute inset-0 grid place-items-center">
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-full text-[9px] shadow-lg ${
                            active
                              ? "bg-[#D4AF37] text-[#080B0D]"
                              : "bg-white/90 text-black"
                          }`}
                        >
                          ▶
                        </span>
                      </div>

                      {active && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-[#D4AF37] px-1.5 py-0.5 text-[6px] font-black uppercase text-[#080B0D]">
                          Live
                        </span>
                      )}

                      <p className="absolute inset-x-0 bottom-0 line-clamp-2 p-2 text-left text-[7px] font-black leading-3 text-white sm:text-[8px]">
                        {reel.product.name}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>

          {/* PRODUCT PANEL - DESKTOP */}
          <div className="hidden flex-col justify-between rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-6 lg:flex">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.24em] text-[#D4AF37]">
                Shop the reel
              </p>

              <h3 className="mt-4 font-serif text-3xl leading-tight text-white">
                {selectedReel.product.name}
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/45">
                {selectedReel.caption ||
                  "See the style in motion and shop the featured product instantly."}
              </p>

              <p className="mt-6 text-2xl font-black text-white">
                {money(selectedPrice)}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "AR Curated",
                  mode === "RESELLER"
                    ? "Bulk Ready"
                    : "Retail Pick",
                  "Watch & Shop",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-[8px] font-bold text-white/55"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                openProduct(
                  selectedReel,
                )
              }
              className="mt-8 w-full rounded-2xl bg-[#D4AF37] py-4 text-[10px] font-black uppercase tracking-[0.1em] text-[#080B0D]"
            >
              Shop This Look →
            </button>
          </div>
        </div>

        {/* MOBILE PRODUCT CTA */}
        <button
          type="button"
          onClick={() =>
            openProduct(
              selectedReel,
            )
          }
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-[1.2rem] border border-[#D4AF37]/15 bg-[#D4AF37]/[0.07] p-4 text-left lg:hidden"
        >
          <div className="min-w-0">
            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
              Featured Look
            </p>

            <p className="mt-1 truncate text-[12px] font-black text-white">
              {selectedReel.product.name}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[13px] font-black text-white">
              {money(selectedPrice)}
            </p>

            <p className="mt-1 text-[8px] font-black text-[#D4AF37]">
              Shop Now →
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/reels?mode=${mode.toLowerCase()}`,
            )
          }
          className="mt-4 w-full rounded-[1rem] border border-white/10 bg-white/[0.03] py-3 text-[8px] font-black uppercase tracking-[0.16em] text-white/50"
        >
          View All AR Reels →
        </button>
      </div>
    </section>
  );
}


export default function Home() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);

  const [banners, setBanners] =
    useState<Banner[]>([]);

  const [
    homeSections,
    setHomeSections,
  ] = useState<HomeSection[]>([]);

  const [
    homeSectionsConfigured,
    setHomeSectionsConfigured,
  ] = useState(false);

  const [
    videoReels,
    setVideoReels,
  ] = useState<Reel[]>([]);

  const [bannerIndex, setBannerIndex] =
    useState(0);

  const [heroSlideIndex, setHeroSlideIndex] =
    useState(0);

  const [heroTouchStartX, setHeroTouchStartX] =
    useState<number | null>(null);

  const [mode, setMode] = useState<Mode>("RETAIL");

  const [
    customerLoggedIn,
    setCustomerLoggedIn,
  ] = useState(false);

  const [
    siteSettings,
    setSiteSettings,
  ] =
    useState<PublicSiteSettings>(
      DEFAULT_PUBLIC_SITE_SETTINGS,
    );

  const [
    salesMode,
    setSalesMode,
  ] =
    useState<PublicSalesMode>(
      DEFAULT_PUBLIC_SALES_MODE,
    );

  const [
    siteSettingsLoaded,
    setSiteSettingsLoaded,
  ] = useState(false);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    menuCategories,
    setMenuCategories,
  ] = useState<StoreCategory[]>([]);

  const [
    expandedMenuCategory,
    setExpandedMenuCategory,
  ] = useState<string | null>(null);

  const [
    selectedMenuCategoryIds,
    setSelectedMenuCategoryIds,
  ] = useState<string[]>([]);

  const [
    selectedMenuCategoryName,
    setSelectedMenuCategoryName,
  ] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccountMode() {
      try {
        const response =
          await fetch(
            "/api/session",
            {
              cache:
                "no-store",
              credentials:
                "same-origin",
            },
          );

        if (!response.ok) {
          setCustomerLoggedIn(false);
          setMode("RETAIL");
          return;
        }

        const data =
          await response.json();

        setCustomerLoggedIn(true);

        setMode(
          data.user?.isReseller ===
            true
            ? "RESELLER"
            : "RETAIL",
        );
      } catch {
        setCustomerLoggedIn(false);
        setMode("RETAIL");
      }
    }

    loadAccountMode();
  }, []);

  useEffect(() => {
    if (
      !menuOpen ||
      mode !== "RETAIL"
    ) {
      return;
    }

    let cancelled = false;

    async function loadMenuCategories() {
      try {
        const response =
          await fetch(
            "/api/storefront/categories",
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (!cancelled) {
          setMenuCategories(
            Array.isArray(
              data.categories,
            )
              ? data.categories
              : [],
          );
        }
      } catch (error) {
        console.error(
          "Storefront categories failed:",
          error,
        );
      }
    }

    loadMenuCategories();

    return () => {
      cancelled = true;
    };
  }, [menuOpen, mode]);

  useEffect(() => {
    async function loadSiteSettings() {
      try {
        const response =
          await fetch(
            "/api/site-settings",
            {
              cache:
                "no-store",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (
          data.settings &&
          typeof data.settings ===
            "object"
        ) {
          setSiteSettings({
            ...DEFAULT_PUBLIC_SITE_SETTINGS,
            ...data.settings,
          });
        }

        if (
          data.salesMode &&
          typeof data.salesMode ===
            "object"
        ) {
          setSalesMode({
            ...DEFAULT_PUBLIC_SALES_MODE,
            ...data.salesMode,
          });
        }
      } catch (error) {
        console.error(
          "Homepage site settings failed:",
          error,
        );
      } finally {
        setSiteSettingsLoaded(
          true,
        );
      }
    }

    loadSiteSettings();
  }, []);

  useEffect(() => {
    async function loadReels() {
      try {
        const response =
          await fetch(
            "/api/reels",
            {
              cache:
                "no-store",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Failed to load reels.",
          );
        }

        setVideoReels(
          Array.isArray(
            data.reels,
          )
            ? data.reels
            : [],
        );
      } catch (error) {
        console.error(
          "Reels load failed:",
          error,
        );

        setVideoReels([]);
      }
    }

    loadReels();
  }, []);

  useEffect(() => {
    ensureUserSession().catch((error) => {
      console.error("Session bridge failed:", error);
    });

    async function loadProducts() {
      try {
        const response = await fetch("/api/products");

        if (!response.ok) {
          throw new Error("Failed to load products");
        }

        const data = await response.json();

        setProducts(
          Array.isArray(data)
            ? data.filter(
                (product: Product) =>
                  product.status === "ACTIVE",
              )
            : [],
        );
      } catch (error) {
        console.error("Homepage products failed:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();

    async function loadHomeSections() {
      try {
        const response =
          await fetch(
            "/api/home-sections",
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        setHomeSections(
          Array.isArray(
            data.sections,
          )
            ? data.sections
            : [],
        );

        setHomeSectionsConfigured(
          data.configured === true,
        );
      } catch (error) {
        console.error(
          "Homepage sections failed:",
          error,
        );
      }
    }

    loadHomeSections();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHeroBanners() {
      try {
        const params =
          new URLSearchParams({
            placement:
              "HOME_HERO",
            audience: mode,
          });

        const response =
          await fetch(
            `/api/banners?${params.toString()}`,
            {
              cache:
                "no-store",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (!cancelled) {
          setBanners(
            Array.isArray(
              data.banners,
            )
              ? data.banners
              : [],
          );

          setBannerIndex(0);
        }
      } catch (error) {
        console.error(
          "Homepage hero banners failed:",
          error,
        );
      }
    }

    loadHeroBanners();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (banners.length <= 1) {
      return;
    }

    const timer = window.setInterval(
      () => {
        setBannerIndex(
          (current) =>
            (current + 1) %
            banners.length,
        );
      },
      5000,
    );

    return () =>
      window.clearInterval(timer);
  }, [banners.length]);

  const activeBanner =
    banners.length > 0
      ? banners[
          bannerIndex %
            banners.length
        ]
      : null;

  function applyGenderCategory(
    value: string,
  ) {
    setSelectedMenuCategoryIds([]);
    setSelectedMenuCategoryName(null);
    setCategory(value);
  }

  function applyMenuCategory(
    ids: string[],
    name: string,
  ) {
    setSelectedMenuCategoryIds(ids);
    setSelectedMenuCategoryName(name);
    setCategory("ALL");
    setMenuOpen(false);

    window.setTimeout(() => {
      document
        .getElementById(
          "shop-categories",
        )
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 50);
  }

  function clearMenuCategory() {
    setSelectedMenuCategoryIds([]);
    setSelectedMenuCategoryName(null);
    setCategory("ALL");
    setMenuOpen(false);
  }

  async function logoutCustomer() {
    try {
      const response =
        await fetch(
          "/api/auth/logout",
          {
            method: "POST",
            credentials:
              "same-origin",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: "{}",
          },
        );

      if (!response.ok) {
        return;
      }

      setCustomerLoggedIn(false);
      setMode("RETAIL");
      setMenuOpen(false);

      window.location.href = "/";
    } catch (error) {
      console.error(
        "Customer logout failed:",
        error,
      );
    }
  }

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.name.toLowerCase().includes(query);

      const matchesMenuCategory =
        selectedMenuCategoryIds.length ===
          0 ||
        selectedMenuCategoryIds.includes(
          product.category.id,
        );

      const matchesGenderCategory =
        selectedMenuCategoryIds.length >
        0
          ? true
          : category === "ALL" ||
            product.gender === category;

      return (
        matchesSearch &&
        matchesMenuCategory &&
        matchesGenderCategory
      );
    });
  }, [
    products,
    search,
    category,
    selectedMenuCategoryIds,
  ]);

  const heroProduct = useMemo(
    () =>
      visibleProducts.find((product) => product.media.length > 0) ??
      visibleProducts[0] ??
      products.find((product) => product.media.length > 0) ??
      products[0],
    [visibleProducts, products],
  );

  const heroProducts = useMemo(() => {
    const eligible = products.filter(
      (product) => {
        const channelAllowed =
          mode === "RESELLER"
            ? product.salesMode === "BULK" ||
              product.salesMode === "BOTH"
            : product.salesMode === "RETAIL" ||
              product.salesMode === "BOTH";

        const hasMedia =
          product.media.some(
            (item) =>
              item.isActive !== false,
          );

        const hasStock =
          product.variants?.some(
            (variant) =>
              variant.isActive !== false &&
              Number(variant.stock) > 0,
          ) ?? false;

        return (
          product.status === "ACTIVE" &&
          channelAllowed &&
          hasMedia &&
          hasStock
        );
      },
    );

    function heroScore(
      product: Product,
    ) {
      return (
        (product.isFeatured ? 100 : 0) +
        (product.isNewArrival ? 30 : 0) +
        (product.isTrending ? 10 : 0)
      );
    }

    return [...eligible]
      .sort(
        (a, b) =>
          heroScore(b) -
          heroScore(a),
      )
      .slice(0, 5);
  }, [products, mode]);

  const heroSlideProduct =
    heroProducts.length > 0
      ? heroProducts[
          heroSlideIndex %
            heroProducts.length
        ]
      : null;

  const heroSlideMedia =
    heroSlideProduct?.media.find(
      (item) =>
        item.type === "IMAGE",
    ) ??
    heroSlideProduct?.media[0] ??
    null;

  const heroSlidePrice =
    heroSlideProduct
      ? mode === "RESELLER" &&
        heroSlideProduct.resellerPrice !==
          null
        ? heroSlideProduct.resellerPrice
        : heroSlideProduct.retailPrice
      : null;

  const heroDiscount =
    heroSlideProduct &&
    heroSlidePrice !== null &&
    heroSlideProduct.mrp &&
    Number(heroSlideProduct.mrp) >
      Number(heroSlidePrice)
      ? Math.round(
          ((Number(
            heroSlideProduct.mrp,
          ) -
            Number(
              heroSlidePrice,
            )) /
            Number(
              heroSlideProduct.mrp,
            )) *
            100,
        )
      : 0;

  const heroAvailableStock =
    heroSlideProduct?.variants?.reduce(
      (total, variant) =>
        variant.isActive !== false
          ? total +
            Math.max(
              0,
              Number(
                variant.stock,
              ) || 0,
            )
          : total,
      0,
    ) ?? 0;

  useEffect(() => {
    setHeroSlideIndex(0);
  }, [
    mode,
    heroProducts.length,
  ]);

  useEffect(() => {
    if (heroProducts.length <= 1) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setHeroSlideIndex(
          (current) =>
            (current + 1) %
            heroProducts.length,
        );
      }, 5000);

    return () =>
      window.clearInterval(timer);
  }, [heroProducts.length]);

  function moveHeroSlide(
    direction: number,
  ) {
    if (heroProducts.length <= 1) {
      return;
    }

    setHeroSlideIndex(
      (current) =>
        (current +
          direction +
          heroProducts.length) %
        heroProducts.length,
    );
  }

  function openHeroProduct() {
    if (!heroSlideProduct) {
      return;
    }

    router.push(
      `/products/${heroSlideProduct.id}?mode=${mode.toLowerCase()}`,
    );
  }

  const featured = visibleProducts.filter(
    (product) => product.isFeatured,
  );

  const trending = visibleProducts.filter(
    (product) => product.isTrending,
  );

  const newArrivals = visibleProducts.filter(
    (product) => product.isNewArrival,
  );

  const homeCategoryItems = useMemo(() => {
    const allItems: Array<{
      key: string;
      name: string;
      imageUrl: string | null;
      ids: string[];
    }> = [];

    menuCategories.forEach((main) => {
      allItems.push({
        key: `main-${main.id}`,
        name: main.name,
        imageUrl: main.imageUrl,
        ids: [
          main.id,
          ...main.children.map(
            (child) => child.id,
          ),
        ],
      });

      main.children.forEach(
        (child) => {
          allItems.push({
            key: `child-${child.id}`,
            name: child.name,
            imageUrl:
              child.imageUrl,
            ids: [child.id],
          });
        },
      );
    });

    const preferred = [
      "women",
      "men",
      "kids",
      "ethnic",
      "western",
      "accessor",
    ];

    const picked: typeof allItems = [];

    for (const needle of preferred) {
      const item = allItems.find(
        (candidate) =>
          !picked.some(
            (selected) =>
              selected.key ===
              candidate.key,
          ) &&
          candidate.name
            .toLowerCase()
            .includes(needle),
      );

      if (item) {
        picked.push(item);
      }
    }

    for (const item of allItems) {
      if (picked.length >= 6) {
        break;
      }

      if (
        !picked.some(
          (selected) =>
            selected.key ===
            item.key,
        )
      ) {
        picked.push(item);
      }
    }

    return picked.slice(0, 6);
  }, [menuCategories]);

  const defaultHomeSections:
    HomeSection[] = [
      {
        id: "default-new-arrivals",
        title: "New Arrivals",
        subtitle:
          "Fresh styles just added",
        sectionType:
          "NEW_ARRIVALS",
        sortOrder: 0,
      },
      {
        id: "default-trending",
        title: "Trending Now",
        subtitle:
          "What shoppers are loving",
        sectionType:
          "TRENDING",
        sortOrder: 1,
      },
      {
        id: "default-reels",
        title: "Fashion Reels",
        subtitle:
          "Watch it. Love it. Buy it.",
        sectionType:
          "REELS",
        sortOrder: 2,
      },
      {
        id: "default-featured",
        title:
          "Featured Collection",
        subtitle:
          "Our hand-picked favourites",
        sectionType:
          "FEATURED",
        sortOrder: 3,
      },
    ];

  const contentSections =
    homeSectionsConfigured
      ? homeSections
      : defaultHomeSections;

  const activeModeStatus =
    mode === "RESELLER"
      ? salesMode.resellerStatus
      : salesMode.retailStatus;

  const activeModeMessage =
    mode === "RESELLER"
      ? salesMode.resellerMessage
      : salesMode.retailMessage;

  const activeModeClosed =
    activeModeStatus ===
    "CLOSED";

  if (
    siteSettingsLoaded &&
    siteSettings.maintenanceMode
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 text-white">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur sm:p-12">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            {siteSettings.storeName ||
              "AR FASHIONS"}
          </p>

          <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl">
            ⚙
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">
            Store temporarily unavailable
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-zinc-300">
            {siteSettings.maintenanceMessage}
          </p>

          {siteSettings.supportPhone ? (
            <p className="mt-6 text-xs text-zinc-400">
              Support:{" "}
              <span className="font-bold text-white">
                {siteSettings.supportPhone}
              </span>
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080B0D] pb-24 text-white sm:pb-0">
      <StorefrontDrawer
        open={menuOpen}
        mode={mode}
        categories={menuCategories}
        expandedCategory={
          expandedMenuCategory
        }
        selectedCategoryName={
          selectedMenuCategoryName
        }
        loggedIn={
          customerLoggedIn
        }
        onClose={() =>
          setMenuOpen(false)
        }
        onToggleCategory={(id) =>
          setExpandedMenuCategory(
            expandedMenuCategory ===
              id
              ? null
              : id,
          )
        }
        onSelectParent={
          applyMenuCategory
        }
        onSelectChild={(
          id,
          name,
        ) =>
          applyMenuCategory(
            [id],
            name,
          )
        }
        onClearCategory={
          clearMenuCategory
        }
        onWishlist={() => {
          setMenuOpen(false);
          router.push(
            "/wishlist",
          );
        }}
        onCart={() => {
          setMenuOpen(false);
          router.push("/cart");
        }}
        onOrders={() => {
          setMenuOpen(false);
          router.push(
            "/my-orders",
          );
        }}
        onAccount={() => {
          setMenuOpen(false);
          router.push(
            "/account",
          );
        }}
        onResellerDashboard={() => {
          setMenuOpen(false);
          router.push(
            "/reseller-sets",
          );
        }}
        onLogout={
          logoutCustomer
        }
      />

      {/* IMAGE 2 LUXURY HEADER */}
      <div className="border-b border-[#D4AF37]/10 bg-[#7C2732] px-4 py-2 text-center text-[8px] font-bold tracking-[0.08em] text-[#F7F5EF] sm:text-[10px]">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 sm:justify-between">
          <p>
            ✦{" "}
            {siteSettings.storeNotice ||
              "Premium fashion for every mood, every moment."}
          </p>

          <div className="hidden items-center gap-4 text-[8px] text-white/75 sm:flex">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/my-orders",
                )
              }
            >
              Track Order
            </button>

            <span className="text-white/25">
              |
            </span>

            <span>
              Shop Smart. Dress Better.
            </span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-[#D4AF37]/10 bg-[#080B0D]/95 text-[#F7F5EF] backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[68px] items-center gap-5">
            <button
              type="button"
              onClick={() =>
                setMenuOpen(true)
              }
              aria-label="Menu"
              className="grid h-10 w-10 shrink-0 place-items-center text-xl text-[#F7F5EF] lg:hidden"
            >
              ☰
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="shrink-0 text-center"
            >
              <span className="block font-serif text-[31px] leading-[0.8] tracking-[-0.04em] text-[#D4AF37]">
                AR
              </span>

              <span className="mt-1 block text-[5px] font-black uppercase tracking-[0.42em] text-[#D4AF37]">
                Fashions
              </span>
            </button>

            <nav className="hidden items-center gap-6 lg:flex">
              <button
                type="button"
                onClick={() =>
                  router.push("/")
                }
                className="text-[10px] font-semibold text-[#D4AF37]"
              >
                Home
              </button>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(
                      "shop-categories",
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                    })
                }
                className="text-[10px] font-semibold text-white/75 transition hover:text-[#D4AF37]"
              >
                Shop
              </button>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(
                      "shop-categories",
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                    })
                }
                className="text-[10px] font-semibold text-white/75 transition hover:text-[#D4AF37]"
              >
                Categories
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    mode ===
                      "RESELLER"
                      ? "/reseller-sets"
                      : "/account",
                  )
                }
                className="text-[10px] font-semibold text-white/75 transition hover:text-[#D4AF37]"
              >
                Reseller
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/reels?mode=${mode.toLowerCase()}`,
                  )
                }
                className="text-[10px] font-semibold text-white/75 transition hover:text-[#D4AF37]"
              >
                Reels
              </button>
            </nav>

            <div className="ml-auto hidden min-w-0 flex-1 items-center justify-end gap-3 md:flex">
              <div className="flex w-full max-w-[330px] items-center rounded-full border border-white/10 bg-white/[0.055] px-4 py-2.5">
                <span className="mr-2 text-[#D4AF37]">
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search for products..."
                  className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-white/30"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="text-white/45"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/wishlist",
                  )
                }
                aria-label="Wishlist"
                className="grid h-9 w-9 shrink-0 place-items-center text-xl text-[#F7F5EF]"
              >
                ♡
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    customerLoggedIn
                      ? "/account"
                      : "/login",
                  )
                }
                aria-label="Account"
                className="grid h-9 w-9 shrink-0 place-items-center text-lg text-[#F7F5EF]"
              >
                ♙
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/cart",
                  )
                }
                aria-label="Cart"
                className="relative grid h-9 w-9 shrink-0 place-items-center text-lg text-[#F7F5EF]"
              >
                ◇
                <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-[#7C2732]" />
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1 md:hidden">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/wishlist",
                  )
                }
                className="grid h-9 w-9 place-items-center text-xl"
                aria-label="Wishlist"
              >
                ♡
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/cart",
                  )
                }
                className="relative grid h-9 w-9 place-items-center text-lg"
                aria-label="Cart"
              >
                ◇
                <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-[#7C2732]" />
              </button>
            </div>
          </div>

          <div className="pb-3 md:hidden">
            <div className="flex items-center rounded-full border border-white/10 bg-white/[0.055] px-4 py-2.5">
              <span className="mr-2 text-[#D4AF37]">
                ⌕
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search for products..."
                className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-white/30"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="text-white/45"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {activeModeClosed ? (
        <section className="mx-auto flex min-h-[58vh] max-w-7xl items-center justify-center px-4 py-14 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-xl">
              ⏸
            </div>

            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.25em] text-red-600">
              {mode === "RESELLER"
                ? "Reseller Orders"
                : "Retail Shopping"}
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Temporarily closed
            </h2>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-zinc-500">
              {activeModeMessage}
            </p>

            <p className="mt-6 text-xs text-zinc-400">
              This shopping channel is currently disabled by AR Fashions.
            </p>
          </div>
        </section>
      ) : (
        <>
      {/* PRODUCT-CONNECTED HERO SLIDER */}
      <section className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8">
        <div
          className="relative min-h-[565px] touch-pan-y overflow-hidden rounded-[1.6rem] border border-white/[0.09] bg-[#080B0D] shadow-[0_35px_90px_rgba(0,0,0,0.44)] sm:min-h-[640px] sm:rounded-[2.2rem]"
          style={{
            background:
              !heroSlideProduct
                ? activeBanner?.backgroundGradient ||
                  activeBanner?.backgroundColor ||
                  undefined
                : undefined,
          }}
          onTouchStart={(event) => {
            setHeroTouchStartX(
              event.touches[0]
                ?.clientX ?? null,
            );
          }}
          onTouchEnd={(event) => {
            if (
              heroTouchStartX ===
              null
            ) {
              return;
            }

            const endX =
              event.changedTouches[0]
                ?.clientX ??
              heroTouchStartX;

            const distance =
              endX -
              heroTouchStartX;

            setHeroTouchStartX(
              null,
            );

            if (
              Math.abs(distance) <
              45
            ) {
              return;
            }

            moveHeroSlide(
              distance < 0
                ? 1
                : -1,
            );
          }}
        >
          {/* MEDIA */}
          <div className="absolute inset-0">
            {heroSlideMedia ? (
              heroSlideMedia.type ===
              "VIDEO" ? (
                <video
                  key={
                    heroSlideProduct?.id
                  }
                  src={
                    heroSlideMedia.url
                  }
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  key={
                    heroSlideProduct?.id
                  }
                  src={
                    heroSlideMedia.url
                  }
                  alt={
                    heroSlideMedia.altText ??
                    heroSlideProduct?.name ??
                    "AR Fashions"
                  }
                  className="h-full w-full object-cover"
                />
              )
            ) : activeBanner?.contentType ===
                "VIDEO" &&
              (activeBanner.videoUrl ||
                activeBanner.mobileVideoUrl) ? (
              <>
                {activeBanner.mobileVideoUrl && (
                  <video
                    src={
                      activeBanner.mobileVideoUrl
                    }
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="h-full w-full object-cover sm:hidden"
                  />
                )}

                <video
                  src={
                    activeBanner.videoUrl ||
                    activeBanner.mobileVideoUrl ||
                    undefined
                  }
                  muted
                  autoPlay
                  loop
                  playsInline
                  className={`absolute inset-0 h-full w-full object-cover ${
                    activeBanner.mobileVideoUrl
                      ? "hidden sm:block"
                      : ""
                  }`}
                />
              </>
            ) : activeBanner?.imageUrl ||
              activeBanner?.mobileImageUrl ? (
              <picture>
                {activeBanner.mobileImageUrl && (
                  <source
                    media="(max-width: 639px)"
                    srcSet={
                      activeBanner.mobileImageUrl
                    }
                  />
                )}

                <img
                  src={
                    activeBanner.imageUrl ||
                    activeBanner.mobileImageUrl ||
                    ""
                  }
                  alt={
                    activeBanner.title ??
                    "AR Fashions"
                  }
                  className="h-full w-full object-cover"
                />
              </picture>
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_75%_20%,rgba(212,175,55,0.22),transparent_32%),linear-gradient(135deg,#3A1119,#080B0D_58%,#010806)]" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#02100b] via-black/20 to-black/20 sm:bg-gradient-to-r sm:from-[#02100b]/95 sm:via-[#02100b]/35 sm:to-black/10" />
          </div>

          {/* CLICK IMAGE -> PRODUCT */}
          {heroSlideProduct && (
            <button
              type="button"
              onClick={
                openHeroProduct
              }
              aria-label={`View ${heroSlideProduct.name}`}
              className="absolute inset-0 z-10 cursor-pointer"
            />
          )}

          {/* AR MONOGRAM */}
          <div className="pointer-events-none absolute left-6 top-24 z-20 hidden sm:block">
            <p className="font-serif text-[9rem] leading-[0.62] tracking-[-0.08em] text-white/[0.07]">
              A
              <br />
              R
            </p>
          </div>

          {/* SLIDE COUNT */}
          {heroProducts.length >
            0 && (
            <div className="pointer-events-none absolute right-5 top-5 z-30 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.15em] text-white/75 backdrop-blur-md">
              {String(
                (heroSlideIndex %
                  heroProducts.length) +
                  1,
              ).padStart(2, "0")}
              {" / "}
              {String(
                heroProducts.length,
              ).padStart(2, "0")}
            </div>
          )}

          {/* MAIN CONTENT */}
          <div className="pointer-events-none relative z-20 flex min-h-[565px] items-end p-5 pb-20 sm:min-h-[640px] sm:items-center sm:p-11 lg:p-14">
            <div className="max-w-[560px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1.5 text-[7px] font-black uppercase tracking-[0.18em] text-emerald-200 backdrop-blur">
                  {heroSlideProduct
                    ? heroSlideProduct.isFeatured
                      ? "AR Signature"
                      : heroSlideProduct.isNewArrival
                        ? "Fresh Drop"
                        : heroSlideProduct.isTrending
                          ? "Trending Now"
                          : "AR Curated"
                    : "The AR Runway"}
                </span>

                {heroSlideProduct && (
                  <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[7px] font-black uppercase tracking-[0.16em] text-white/65 backdrop-blur">
                    {mode ===
                    "RESELLER"
                      ? "Reseller Edit"
                      : "Retail Edit"}
                  </span>
                )}
              </div>

              <p className="mt-5 text-[8px] font-black uppercase tracking-[0.32em] text-[#D4AF37]">
                {heroSlideProduct
                  ? heroSlideProduct.category.name
                  : "Wear Your Story"}
              </p>

              <h1 className="mt-3 max-w-[520px] font-serif text-[3rem] font-normal leading-[0.87] tracking-[-0.05em] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.45)] sm:text-7xl">
                {heroSlideProduct?.name ||
                  activeBanner?.title ||
                  "Style takes the spotlight."}
              </h1>

              <p className="mt-5 max-w-[390px] text-[11px] leading-5 text-white/70 sm:text-sm sm:leading-6">
                {heroSlideProduct?.description
                  ? heroSlideProduct.description
                      .replace(
                        /\s+/g,
                        " ",
                      )
                      .slice(
                        0,
                        145,
                      ) +
                    (heroSlideProduct.description.length >
                    145
                      ? "…"
                      : "")
                  : activeBanner?.subtitle ||
                    "Curated fashion for women, men and kids — made to be noticed."}
              </p>

              {heroSlideProduct &&
                heroSlidePrice !==
                  null && (
                  <div className="mt-5 flex flex-wrap items-end gap-2.5">
                    <span className="text-2xl font-black text-white sm:text-3xl">
                      {money(
                        heroSlidePrice,
                      )}
                    </span>

                    {heroSlideProduct.mrp &&
                      Number(
                        heroSlideProduct.mrp,
                      ) >
                        Number(
                          heroSlidePrice,
                        ) && (
                        <span className="pb-1 text-[11px] text-white/45 line-through sm:text-sm">
                          {money(
                            heroSlideProduct.mrp,
                          )}
                        </span>
                      )}

                    {heroDiscount >
                      0 && (
                      <span className="mb-0.5 rounded-full bg-[#D4AF37] px-2.5 py-1 text-[8px] font-black text-[#080B0D]">
                        {
                          heroDiscount
                        }
                        % OFF
                      </span>
                    )}
                  </div>
                )}

              {heroSlideProduct && (
                <div className="mt-3 flex items-center gap-3 text-[8px] font-bold uppercase tracking-[0.12em] text-white/55">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                    {heroAvailableStock} in stock
                  </span>

                  <span>COD</span>

                  {mode ===
                    "RESELLER" &&
                    heroSlideProduct.resellerMOQ && (
                      <span>
                        MOQ{" "}
                        {
                          heroSlideProduct.resellerMOQ
                        }
                      </span>
                    )}
                </div>
              )}

              <div className="pointer-events-auto mt-7 flex flex-wrap items-center gap-3">
                {heroSlideProduct ? (
                  <button
                    type="button"
                    onClick={
                      openHeroProduct
                    }
                    className="group inline-flex items-center gap-4 rounded-full bg-[#D4AF37] py-2 pl-5 pr-2 text-[9px] font-black uppercase tracking-[0.12em] text-[#03160f] shadow-[0_14px_35px_rgba(212,175,55,0.22)] transition active:scale-[0.97]"
                  >
                    Shop Now
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#7C2732] text-base text-white transition group-hover:translate-x-0.5">
                      →
                    </span>
                  </button>
                ) : activeBanner?.buttonUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        activeBanner.buttonUrl!,
                      )
                    }
                    className="rounded-full bg-[#D4AF37] px-6 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-[#03160f]"
                  >
                    {activeBanner.buttonText ||
                      "Explore"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(
                        "shop-categories",
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                      })
                  }
                  className="rounded-full border border-white/20 bg-black/25 px-5 py-3 text-[8px] font-black uppercase tracking-[0.12em] text-white backdrop-blur"
                >
                  Explore Collection
                </button>
              </div>
            </div>
          </div>

          {/* PREVIOUS / NEXT */}
          {heroProducts.length >
            1 && (
            <>
              <button
                type="button"
                aria-label="Previous hero product"
                onClick={() =>
                  moveHeroSlide(-1)
                }
                className="absolute left-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/30 text-2xl text-white backdrop-blur transition hover:bg-black/50 sm:grid"
              >
                ‹
              </button>

              <button
                type="button"
                aria-label="Next hero product"
                onClick={() =>
                  moveHeroSlide(1)
                }
                className="absolute right-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/30 text-2xl text-white backdrop-blur transition hover:bg-black/50 sm:grid"
              >
                ›
              </button>
            </>
          )}

          {/* DESKTOP MINI PRODUCT RAIL */}
          {heroProducts.length >
            1 && (
            <div className="absolute bottom-7 right-7 z-30 hidden max-w-[48%] gap-2 lg:flex">
              {heroProducts.map(
                (product, index) => {
                  const media =
                    product.media.find(
                      (item) =>
                        item.type ===
                        "IMAGE",
                    ) ??
                    product.media[0];

                  const active =
                    index ===
                    heroSlideIndex %
                      heroProducts.length;

                  return (
                    <button
                      key={
                        product.id
                      }
                      type="button"
                      onClick={() =>
                        setHeroSlideIndex(
                          index,
                        )
                      }
                      className={`relative w-[82px] overflow-hidden rounded-xl border text-left transition ${
                        active
                          ? "border-[#D4AF37] shadow-[0_0_0_1px_rgba(212,175,55,0.32)]"
                          : "border-white/15 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="aspect-[4/5] bg-[#181313]">
                        {media?.type ===
                        "IMAGE" ? (
                          <img
                            src={
                              media.url
                            }
                            alt={
                              product.name
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : media ? (
                          <video
                            src={
                              media.url
                            }
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-1.5">
                        <p className="truncate text-[6px] font-black text-white">
                          {
                            product.name
                          }
                        </p>
                      </div>
                    </button>
                  );
                },
              )}
            </div>
          )}

          {/* MOBILE DOTS / PROGRESS */}
          {heroProducts.length >
            1 && (
            <div className="absolute bottom-7 left-5 z-30 flex items-center gap-1.5 lg:left-1/2 lg:-translate-x-1/2">
              {heroProducts.map(
                (product, index) => (
                  <button
                    key={
                      product.id
                    }
                    type="button"
                    aria-label={`Show ${product.name}`}
                    onClick={() =>
                      setHeroSlideIndex(
                        index,
                      )
                    }
                    className={`h-1.5 rounded-full transition-all ${
                      index ===
                      heroSlideIndex %
                        heroProducts.length
                        ? "w-8 bg-[#D4AF37]"
                        : "w-2 bg-white/35"
                    }`}
                  />
                ),
              )}
            </div>
          )}

          <div className="pointer-events-none absolute bottom-7 right-5 z-20 text-[7px] font-black uppercase tracking-[0.2em] text-white/45 lg:hidden">
            Swipe to explore
          </div>
        </div>
      </section>

      {/* DEDICATED CATEGORY IMAGE RAIL */}
      <section
        id="shop-categories"
        className="border-b border-white/[0.06] bg-[#080B0D]"
      >
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6 sm:gap-5">
            {homeCategoryItems.map(
              (item) => {
                const active =
                  selectedMenuCategoryName ===
                  item.name;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      applyMenuCategory(
                        item.ids,
                        item.name,
                      )
                    }
                    className="group min-w-0 text-center"
                  >
                    <div
                      className={`mx-auto aspect-square w-full max-w-[92px] overflow-hidden rounded-full border-2 bg-[#171313] p-[3px] transition sm:max-w-[112px] ${
                        active
                          ? "border-[#D4AF37] shadow-[0_0_0_3px_rgba(124,39,50,0.38)]"
                          : "border-[#D4AF37]/55 group-hover:border-[#D4AF37]"
                      }`}
                    >
                      <div className="h-full w-full overflow-hidden rounded-full bg-[#1A1A1A]">
                        {item.imageUrl ? (
                          <img
                            src={
                              item.imageUrl
                            }
                            alt={
                              item.name
                            }
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_25%,#7C2732_0%,#261317_45%,#0B0B0B_100%)]">
                            <span className="font-serif text-2xl text-[#D4AF37] sm:text-3xl">
                              AR
                            </span>

                            <span className="mt-1 max-w-[70px] truncate text-[5px] font-black uppercase tracking-[0.18em] text-white/45">
                              {item.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p
                      className={`mt-3 truncate text-[9px] font-semibold sm:text-[10px] ${
                        active
                          ? "text-[#D4AF37]"
                          : "text-[#F7F5EF]"
                      }`}
                    >
                      {item.name}
                    </p>
                  </button>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* IMAGE 2 BENEFIT STRIP */}
      <section className="border-y border-white/[0.055] bg-[#111112]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/[0.06] px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
          {[
            [
              "✦",
              "Premium Quality",
              "AR curated fashion",
            ],
            [
              "▣",
              siteSettings.codEnabled
                ? "Cash on Delivery"
                : "Easy Checkout",
              siteSettings.codEnabled
                ? "COD available"
                : "Simple checkout",
            ],
            [
              "↻",
              "Retail + Reseller",
              "Two shopping modes",
            ],
            [
              "◉",
              "Customer Support",
              siteSettings.supportPhone ||
                "AR Fashions support",
            ],
          ].map(
            ([
              icon,
              title,
              subtitle,
            ]) => (
              <div
                key={title}
                className="flex min-h-[82px] items-center gap-3 px-3 py-4 sm:px-5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#D4AF37]/30 text-sm text-[#D4AF37]">
                  {icon}
                </span>

                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-[#F7F5EF] sm:text-[9px]">
                    {title}
                  </p>

                  <p className="mt-1 truncate text-[6px] text-white/40 sm:text-[7px]">
                    {subtitle}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <PromoSlot
        placement="SHOP_TOP"
        audience={mode}
        className="py-4"
      />

      {loading ? (
        <section className="mx-auto max-w-7xl px-4 py-20 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-500" />

          <p className="mt-4 text-sm text-zinc-400">
            Loading AR Fashions...
          </p>
        </section>
      ) : (
        <>
          {contentSections.map(
            (section) => {
              if (
                section.sectionType ===
                "NEW_ARRIVALS"
              ) {
                return (
                  <ProductSection
                    key={section.id}
                    title={
                      section.title
                    }
                    subtitle={
                      section.subtitle
                    }
                    products={
                      newArrivals
                    }
                    mode={mode}
                  />
                );
              }

              if (
                section.sectionType ===
                "TRENDING"
              ) {
                return (
                  <ProductSection
                    key={section.id}
                    title={
                      section.title
                    }
                    subtitle={
                      section.subtitle
                    }
                    products={
                      trending
                    }
                    mode={mode}
                  />
                );
              }

              if (
                section.sectionType ===
                "REELS"
              ) {
                return (
                  <FashionReelsSection
                    key={section.id}
                    title={
                      section.title
                    }
                    subtitle={
                      section.subtitle
                    }
                    reels={videoReels}
                    mode={mode}
                  />
                );
              }

              if (
                section.sectionType ===
                "FEATURED"
              ) {
                return (
                  <ProductSection
                    key={section.id}
                    title={
                      section.title
                    }
                    subtitle={
                      section.subtitle
                    }
                    products={
                      featured
                    }
                    mode={mode}
                  />
                );
              }

              return null;
            },
          )}
        </>
      )}

      {/* AR EDIT */}
      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-11 lg:px-8">
        <div className="relative min-h-[280px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#d9c3ab] shadow-[0_25px_60px_rgba(0,0,0,0.28)] sm:min-h-[370px]">
          {heroProduct?.media?.find(
            (item) =>
              item.type === "IMAGE",
          )?.url ? (
            <img
              src={
                heroProduct.media.find(
                  (item) =>
                    item.type === "IMAGE",
                )?.url
              }
              alt="AR Edit"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-r from-[#e9d5bc]/95 via-[#d7bea0]/70 to-transparent" />

          <div className="relative z-10 flex min-h-[280px] max-w-[62%] flex-col justify-center p-5 sm:min-h-[370px] sm:p-10">
            <p className="font-serif text-[2.25rem] leading-[0.82] tracking-[-0.05em] text-[#1A1A1A] sm:text-5xl">
              AR
              <br />
              Edit
            </p>

            <p className="mt-4 max-w-[180px] text-[8px] font-black uppercase leading-4 tracking-[0.16em] text-[#7C2732]">
              Fashion for
              <br />
              real people
            </p>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("shop-categories")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              className="mt-5 w-fit rounded-full bg-[#1A1A1A] px-5 py-2.5 text-[8px] font-black uppercase tracking-[0.08em] text-white"
            >
              Discover →
            </button>
          </div>
        </div>
      </section>

      <PromoSlot
        placement="HOME_MIDDLE"
        audience={mode}
        className="py-6"
      />

      {/* RESELLER CTA */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.7rem] border border-[#D4AF37]/15 bg-gradient-to-br from-[#3A1119] via-[#211014] to-[#080B0D] text-white shadow-[0_30px_70px_rgba(0,0,0,0.32)]">
          <div className="pointer-events-none absolute right-[-60px] top-[-80px] h-56 w-56 rounded-full bg-[#D4AF37]/10 blur-3xl" />

          <div className="relative grid gap-6 p-6 sm:p-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                AR Reseller Studio
              </p>

              <h2 className="mt-3 font-serif text-[2.35rem] leading-[0.9] sm:text-5xl">
                Grow together.
                <br />
                Sell smarter.
              </h2>

              <div className="mt-5 space-y-2">
                {[
                  "Bulk pricing",
                  "Mixed sizes & colors",
                  "Dedicated reseller flow",
                ].map((item) => (
                  <p
                    key={item}
                    className="text-[9px] font-semibold text-white/65"
                  >
                    ◉ {item}
                  </p>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    mode === "RESELLER"
                      ? "/reseller-sets"
                      : "/account",
                  )
                }
                className="mt-6 rounded-full bg-white px-5 py-3 text-[8px] font-black uppercase tracking-[0.1em] text-[#063326]"
              >
                Join Now →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                ["10+", "Sets"],
                ["₹300+", "Start"],
                ["24/7", "Orders"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-black/15 px-2 py-4 text-center"
                >
                  <p className="text-xl font-black">
                    {value}
                  </p>

                  <p className="mt-1 text-[7px] uppercase tracking-wide text-emerald-100/50">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PromoSlot
        placement="HOME_BOTTOM"
        audience={mode}
        className="pb-10"
      />

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07] bg-[#020c08]">
        <div className="mx-auto max-w-7xl px-5 py-10 text-center sm:px-6 lg:px-8">
          <p className="font-serif text-[1.8rem] tracking-[0.08em] text-white">
            AR
          </p>

          <p className="mt-1 text-[7px] font-black uppercase tracking-[0.35em] text-[#D4AF37]">
            Fashions
          </p>

          <p className="mt-4 text-[8px] uppercase tracking-[0.22em] text-white/30">
            Wear · Share · Belong
          </p>

          <div className="mt-6 flex justify-center gap-5 text-[9px] font-semibold text-white/45">
            <button onClick={() => applyGenderCategory("WOMEN")}>
              Women
            </button>
            <button onClick={() => applyGenderCategory("MEN")}>
              Men
            </button>
            <button onClick={() => applyGenderCategory("KIDS")}>
              Kids
            </button>
            <button
              onClick={() =>
                router.push(
                  mode === "RESELLER"
                    ? "/reseller-sets"
                    : "/account",
                )
              }
            >
              Reseller
            </button>
          </div>

          <p className="mt-8 text-[7px] text-white/20">
            © 2026 AR Fashions
          </p>
        </div>
      </footer>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-2 left-3 right-3 z-50 rounded-[1.35rem] border border-emerald-200/10 bg-[#080B0D]/95 px-1 pb-1.5 pt-1 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:hidden">
        <div className="grid grid-cols-5 items-end">
          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-[#D4AF37]"
          >
            <span className="text-lg">⌂</span>
            <span className="text-[7px] font-black">
              Home
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("shop-categories")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-white/45"
          >
            <span className="text-lg">▦</span>
            <span className="text-[7px] font-black">
              Shop
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/reels?mode=${mode.toLowerCase()}`,
              )
            }
            className="relative flex min-h-[52px] flex-col items-center justify-center"
          >
            <span className="-mt-7 grid h-14 w-14 place-items-center rounded-full border-[4px] border-[#080B0D] bg-[#D4AF37] font-serif text-[15px] font-black text-[#080B0D] shadow-[0_0_28px_rgba(212,175,55,0.3)]">
              AR
            </span>

            <span className="mt-0.5 text-[7px] font-black text-white">
              Reels
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/wishlist")
            }
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-white/45"
          >
            <span className="text-lg">♡</span>
            <span className="text-[7px] font-black">
              Wishlist
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/account")
            }
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-white/45"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-[7px]">
              A
            </span>
            <span className="text-[7px] font-black">
              Account
            </span>
          </button>
        </div>
      </nav>

        {/* SHOP CONTENT CLOSED CONDITIONAL END */}
        </>
      )}
    </main>
  );
}

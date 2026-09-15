"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureUserSession } from "@/lib/user-session-init";
import { useRouter } from "next/navigation";
import PromoSlot from "@/components/PromoSlot";
import BrandLogo from "@/components/BrandLogo";

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
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1rem] border border-white/10 bg-[#0b2119] shadow-[0_14px_34px_rgba(0,0,0,0.25)]">
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
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white shadow-sm">
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
        <p className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-emerald-400">
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
            <span className="text-[9px] font-black text-emerald-600 sm:text-[10px]">
              ({discountPercent}% OFF)
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-300">
            {mode === "RESELLER"
              ? "Bulk Ready"
              : product.isNewArrival
                ? "Fresh Drop"
                : product.isTrending
                  ? "Trending"
                  : "AR Pick"}
          </span>

          <span className="text-[8px] font-bold text-emerald-400">
            {product.isFeatured
              ? "Signature Edit"
              : "Curated Style"}
          </span>
        </div>

        {mode === "RESELLER" && product.resellerPrice !== null && (
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
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
          <p className="mb-2 text-[8px] font-black uppercase tracking-[0.28em] text-emerald-700">
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
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f2f0eb] text-sm font-black text-emerald-700">
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
      className="mx-3 overflow-hidden rounded-[1.8rem] border border-emerald-300/10 bg-[#010906] py-8 text-white shadow-[0_30px_80px_rgba(0,0,0,0.42)] sm:mx-6 sm:py-10 lg:mx-auto lg:max-w-7xl"
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-px w-5 bg-emerald-300" />

              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-300">
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
                <div className="flex h-full items-center justify-center bg-gradient-to-b from-emerald-900 to-black">
                  <span className="text-4xl">
                    ▶
                  </span>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.16em] text-emerald-300 backdrop-blur">
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

                <p className="mt-2 text-[15px] font-black text-emerald-300">
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
                        ? "border-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.22)]"
                        : "border-white/10"
                    }`}
                  >
                    <div className="relative aspect-[9/14] bg-[#071710]">
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
                        <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#124b38] to-black">
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
                              ? "bg-emerald-300 text-[#03140e]"
                              : "bg-white/90 text-black"
                          }`}
                        >
                          ▶
                        </span>
                      </div>

                      {active && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-300 px-1.5 py-0.5 text-[6px] font-black uppercase text-[#03140e]">
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
              <p className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-300">
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
              className="mt-8 w-full rounded-2xl bg-emerald-300 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-[#03140e]"
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
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-[1.2rem] border border-emerald-300/15 bg-emerald-300/[0.07] p-4 text-left lg:hidden"
        >
          <div className="min-w-0">
            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-300">
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

            <p className="mt-1 text-[8px] font-black text-emerald-300">
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

  const [mode, setMode] = useState<Mode>("RETAIL");

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
          setMode("RETAIL");
          return;
        }

        const data =
          await response.json();

        setMode(
          data.user?.isReseller ===
            true
            ? "RESELLER"
            : "RETAIL",
        );
      } catch {
        setMode("RETAIL");
      }
    }

    loadAccountMode();
  }, []);

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

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.name.toLowerCase().includes(query);

      const matchesCategory =
        category === "ALL" ||
        product.gender === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const heroProduct = useMemo(
    () =>
      visibleProducts.find((product) => product.media.length > 0) ??
      visibleProducts[0] ??
      products.find((product) => product.media.length > 0) ??
      products[0],
    [visibleProducts, products],
  );

  const featured = visibleProducts.filter(
    (product) => product.isFeatured,
  );

  const trending = visibleProducts.filter(
    (product) => product.isTrending,
  );

  const newArrivals = visibleProducts.filter(
    (product) => product.isNewArrival,
  );

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
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
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
    <main className="min-h-screen bg-[#061711] pb-24 text-white sm:pb-0">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#061711]/95 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 pb-3 pt-2 sm:px-6 lg:px-8">
          <div className="relative flex h-14 items-center justify-between">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("shop-categories")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              aria-label="Menu"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-xl text-white"
            >
              ☰
            </button>

            <div className="absolute left-1/2 -translate-x-1/2">
              <BrandLogo
                light
                compact
                onClick={() => router.push("/")}
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => router.push("/cart")}
                aria-label="Bag"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-lg text-white"
              >
                ♢
              </button>
            </div>
          </div>

          <div className="mt-1 flex items-center rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5">
            <span className="mr-2 text-base text-emerald-300">
              ⌕
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search the AR collection..."
              className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-white outline-none placeholder:text-white/35 sm:text-xs"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-xs font-black text-white"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </header>

      {siteSettings.storeNotice ? (
        <div className="border-b border-emerald-700/20 bg-emerald-600 px-4 py-2.5 text-center text-[11px] font-bold text-white">
          {siteSettings.storeNotice}
        </div>
      ) : null}

      {/* ACCOUNT SALES CHANNEL */}
      <section className="border-b border-white/[0.06] bg-[#071b14]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                mode === "RESELLER"
                  ? "bg-emerald-400"
                  : "bg-white/60"
              }`}
            />

            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/70">
              {mode === "RESELLER"
                ? "Approved Reseller Account"
                : "Retail Shopping"}
            </p>
          </div>

          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-300/70">
            Wear Your Story
          </p>
        </div>
      </section>

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
      {/* HERO */}
      <section className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8">
        <div
          className="relative min-h-[520px] overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#04120d] shadow-[0_30px_70px_rgba(0,0,0,0.35)] sm:min-h-[620px] sm:rounded-[2rem]"
          style={{
            background:
              activeBanner?.backgroundGradient ||
              activeBanner?.backgroundColor ||
              undefined,
          }}
        >
          {activeBanner?.contentType !== "GRAPHIC" && (
            <div className="absolute inset-0">
              {activeBanner?.contentType === "VIDEO" &&
              (activeBanner.videoUrl ||
                activeBanner.mobileVideoUrl) ? (
                <>
                  {activeBanner.mobileVideoUrl && (
                    <video
                      src={activeBanner.mobileVideoUrl}
                      muted
                      autoPlay
                      loop
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover sm:hidden"
                    />
                  )}

                  <video
                    src={
                      activeBanner?.videoUrl ||
                      activeBanner?.mobileVideoUrl ||
                      undefined
                    }
                    muted
                    autoPlay
                    loop
                    playsInline
                    className={`absolute inset-0 h-full w-full object-cover ${
                      activeBanner?.mobileVideoUrl
                        ? "hidden sm:block"
                        : ""
                    }`}
                  />
                </>
              ) : activeBanner?.contentType === "IMAGE" &&
                (activeBanner.imageUrl ||
                  activeBanner.mobileImageUrl) ? (
                <picture>
                  {activeBanner.mobileImageUrl && (
                    <source
                      media="(max-width: 639px)"
                      srcSet={activeBanner.mobileImageUrl}
                    />
                  )}

                  <img
                    src={
                      activeBanner.imageUrl ||
                      activeBanner.mobileImageUrl ||
                      ""
                    }
                    alt={activeBanner.title || "AR Fashions"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </picture>
              ) : heroProduct?.media?.[0] ? (
                heroProduct.media[0].type === "VIDEO" ? (
                  <video
                    src={heroProduct.media[0].url}
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={heroProduct.media[0].url}
                    alt={heroProduct.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )
              ) : null}

              <div className="absolute inset-0 bg-gradient-to-t from-[#04120d] via-black/15 to-black/15 sm:bg-gradient-to-r sm:from-[#04120d]/90 sm:via-black/20 sm:to-black/15" />
            </div>
          )}

          <div className="pointer-events-none absolute left-5 top-20 z-10 hidden sm:block">
            <p className="font-serif text-[8rem] leading-[0.66] tracking-[-0.08em] text-white/10">
              A
              <br />
              R
            </p>
          </div>

          <div className="absolute left-5 top-8 z-20 border-l border-emerald-300/60 pl-3 sm:left-8 sm:top-10">
            <p className="max-w-[90px] text-[7px] font-black uppercase leading-4 tracking-[0.28em] text-white/75">
              Wear
              <br />
              Your
              <br />
              Story
            </p>
          </div>

          <div className="relative z-20 flex min-h-[520px] items-end p-5 pb-8 sm:min-h-[620px] sm:items-center sm:p-10 lg:p-14">
            <div className="max-w-xl">
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-300">
                The AR Runway · New Drop
              </p>

              <h1 className="mt-4 max-w-lg font-serif text-[3rem] font-normal leading-[0.88] tracking-[-0.045em] text-white sm:text-7xl">
                {activeBanner?.title ||
                  "Style takes the spotlight."}
              </h1>

              <p className="mt-5 max-w-sm text-[11px] leading-5 text-white/65 sm:text-sm">
                {activeBanner?.subtitle ||
                  "Curated fashion for women, men and kids — made to be noticed."}
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
                className="mt-6 inline-flex items-center gap-3 rounded-full border border-emerald-300/35 bg-black/35 px-5 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-white backdrop-blur"
              >
                Explore Drop
                <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400 text-[#04120d]">
                  →
                </span>
              </button>
            </div>
          </div>

          <div className="absolute bottom-7 right-4 z-20 hidden w-[105px] space-y-2 sm:block lg:right-8 lg:w-[125px]">
            {products
              .filter(
                (item) =>
                  item.media.some(
                    (media) =>
                      media.type === "IMAGE",
                  ),
              )
              .slice(0, 2)
              .map((item, index) => {
                const image =
                  item.media.find(
                    (media) =>
                      media.type === "IMAGE",
                  )?.url;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/products/${item.id}?mode=${mode.toLowerCase()}`,
                      )
                    }
                    className="relative block w-full overflow-hidden rounded-xl border border-white/20 bg-black/25 text-left backdrop-blur"
                  >
                    <div className="aspect-[4/5] overflow-hidden">
                      {image && (
                        <img
                          src={image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                      <p className="truncate text-[7px] font-black text-white">
                        {index === 0
                          ? "Festive Edit"
                          : "Everyday Edit"}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>

          {banners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-1.5">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() =>
                    setBannerIndex(index)
                  }
                  className={`h-1 rounded-full transition-all ${
                    index === bannerIndex
                      ? "w-7 bg-emerald-300"
                      : "w-2 bg-white/35"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CATEGORIES */}
      <section
        id="shop-categories"
        className="mx-auto max-w-7xl scroll-mt-36 px-4 py-9 sm:px-6 sm:py-11 lg:px-8"
      >
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-400">
              The Runway
            </p>

            <h2 className="mt-2 font-serif text-[1.8rem] leading-none text-white sm:text-3xl">
              Choose your edit
            </h2>
          </div>

          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/35">
            AR · 2026
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {[
            ["WOMEN", "Women", "For Her"],
            ["MEN", "Men", "For Him"],
            ["KIDS", "Kids", "Little Ones"],
            ["UNISEX", "Accessories", "Final Touch"],
          ].map(([value, label, caption]) => {
            const sampleProduct =
              products.find(
                (item) =>
                  item.gender === value &&
                  item.media.length > 0,
              );

            const sampleMedia =
              sampleProduct?.media.find(
                (item) =>
                  item.type === "IMAGE",
              ) ??
              sampleProduct?.media[0];

            const active =
              category === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setCategory(value)
                }
                className={`group overflow-hidden rounded-xl border text-left transition ${
                  active
                    ? "border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]"
                    : "border-white/10"
                }`}
              >
                <div className="relative aspect-[3/4] bg-[#0b2119]">
                  {sampleMedia?.type === "IMAGE" ? (
                    <img
                      src={sampleMedia.url}
                      alt={label}
                      className="h-full w-full object-cover"
                    />
                  ) : null}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <p className="font-serif text-[10px] text-white sm:text-base">
                      {caption}
                    </p>

                    <p className="mt-0.5 text-[6px] font-black uppercase tracking-[0.12em] text-emerald-300">
                      {label}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between border-y border-white/[0.07] py-3">
          {[
            "New Drop",
            "Premium",
            mode === "RESELLER"
              ? "Bulk Ready"
              : "COD",
            "AR Curated",
          ].map((item) => (
            <span
              key={item}
              className="text-[7px] font-black uppercase tracking-[0.12em] text-white/50"
            >
              {item}
            </span>
          ))}
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
            <p className="font-serif text-[2.25rem] leading-[0.82] tracking-[-0.05em] text-[#0a251c] sm:text-5xl">
              AR
              <br />
              Edit
            </p>

            <p className="mt-4 max-w-[180px] text-[8px] font-black uppercase leading-4 tracking-[0.16em] text-[#315a4c]">
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
              className="mt-5 w-fit rounded-full bg-[#0a251c] px-5 py-2.5 text-[8px] font-black uppercase tracking-[0.08em] text-white"
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
        <div className="relative overflow-hidden rounded-[1.7rem] border border-emerald-300/15 bg-gradient-to-br from-[#0b3528] via-[#073024] to-[#031710] text-white shadow-[0_30px_70px_rgba(0,0,0,0.32)]">
          <div className="pointer-events-none absolute right-[-60px] top-[-80px] h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative grid gap-6 p-6 sm:p-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-300">
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

          <p className="mt-1 text-[7px] font-black uppercase tracking-[0.35em] text-emerald-300">
            Fashions
          </p>

          <p className="mt-4 text-[8px] uppercase tracking-[0.22em] text-white/30">
            Wear · Share · Belong
          </p>

          <div className="mt-6 flex justify-center gap-5 text-[9px] font-semibold text-white/45">
            <button onClick={() => setCategory("WOMEN")}>
              Women
            </button>
            <button onClick={() => setCategory("MEN")}>
              Men
            </button>
            <button onClick={() => setCategory("KIDS")}>
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
      <nav className="fixed bottom-2 left-3 right-3 z-50 rounded-[1.35rem] border border-emerald-200/10 bg-[#03140e]/95 px-1 pb-1.5 pt-1 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:hidden">
        <div className="grid grid-cols-5 items-end">
          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-emerald-300"
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
            <span className="-mt-7 grid h-14 w-14 place-items-center rounded-full border-[4px] border-[#03140e] bg-emerald-400 font-serif text-[15px] font-black text-[#03140e] shadow-[0_0_28px_rgba(52,211,153,0.3)]">
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

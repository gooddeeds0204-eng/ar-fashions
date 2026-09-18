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

type BenefitKey =
  | "QUALITY"
  | "COD"
  | "RESELLER"
  | "SUPPORT";
type ProductTransitionPreview = {
  id: string;
  name: string;
  category: string;
  image: string | null;
  price: string | number | null;
  mrp: string | number | null;
  mode: Mode;
};

function saveProductTransitionPreview(
  preview: ProductTransitionPreview,
) {
  try {
    sessionStorage.setItem(
      "ar-fashions-product-transition",
      JSON.stringify({
        ...preview,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Navigation still works if storage is unavailable.
  }
}


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

function StoreIcon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "menu"
    | "search"
    | "heart"
    | "bag"
    | "user"
    | "home"
    | "grid"
    | "play"
    | "truck"
    | "shield"
    | "box"
    | "users";
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "menu") {
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg {...common}>
        <path d="M20.8 4.7a5.3 5.3 0 0 0-7.5 0L12 6l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.8a5.3 5.3 0 0 0 0-7.5Z" />
      </svg>
    );
  }

  if (name === "bag") {
    return (
      <svg {...common}>
        <path d="M6.5 8h11l1 12h-13l1-12Z" />
        <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" />
      </svg>
    );
  }

  if (name === "truck") {
    return (
      <svg {...common}>
        <path d="M3 6h11v10H3z" />
        <path d="M14 10h3l3 3v3h-6z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 19 6v5c0 4.5-2.7 7.6-7 10-4.3-2.4-7-5.5-7-10V6l7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "box") {
    return (
      <svg {...common}>
        <path d="m4 7 8-4 8 4-8 4-8-4Z" />
        <path d="M4 7v10l8 4 8-4V7" />
        <path d="M12 11v10" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3.5 20c.6-3.8 2.5-5.6 5.5-5.6s4.9 1.8 5.5 5.6" />
        <path d="M14.5 15c2.9-.2 4.9 1.4 5.7 4.2" />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m4 11 8-7 8 7" />
        <path d="M6.5 10.5V20h11v-9.5" />
      </svg>
    );
  }

  if (name === "grid") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6" height="6" rx="1.2" />
        <rect x="14" y="4" width="6" height="6" rx="1.2" />
        <rect x="4" y="14" width="6" height="6" rx="1.2" />
        <rect x="14" y="14" width="6" height="6" rx="1.2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m9 7 8 5-8 5V7Z" />
    </svg>
  );
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
        const userId = await ensureUserSession();
        if (!userId) return;

        const response = await fetch("/api/wishlist", {
          cache: "no-store",
        });
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
        console.error("Wishlist state failed:", error);
      }
    }

    loadWishlistState();
  }, [product.id]);

  async function toggleWishlist() {
    if (wishlistLoading) return;

    const userId = await ensureUserSession();
    if (!userId) {
      alert("Please login to use Wishlist.");
      return;
    }

    try {
      setWishlistLoading(true);
      const response = await fetch("/api/wishlist", {
        method: wishlisted ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      if (!response.ok) {
        throw new Error("Wishlist update failed.");
      }

      setWishlisted((current) => !current);
    } catch (error) {
      console.error("Wishlist toggle failed:", error);
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

  function openProduct() {
    saveProductTransitionPreview({
      id: product.id,
      name: product.name,
      category: product.category.name,
      image:
        media?.type === "IMAGE"
          ? media.url
          : media?.thumbnailUrl ?? null,
      price,
      mrp: product.mrp,
      mode,
    });

    router.push(
      `/products/${product.id}?mode=${mode.toLowerCase()}`,
    );
  }

  return (
    <article
      onClick={openProduct}
      onPointerEnter={() =>
        router.prefetch(
          `/products/${product.id}?mode=${mode.toLowerCase()}`,
        )
      }
      onTouchStart={() =>
        router.prefetch(
          `/products/${product.id}?mode=${mode.toLowerCase()}`,
        )
      }
      className="group min-w-0 cursor-pointer"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[0.8rem] bg-[#EDE2D2]">
        {media?.type === "VIDEO" ? (
          <video
            src={media.url}
            muted
            autoPlay
            loop
            playsInline
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
          />
        ) : media ? (
          <img
            src={media.url}
            alt={media.altText ?? product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#E8DCCB] font-serif text-3xl text-[#9A7B4A]">
            AR
          </div>
        )}

        <button
          type="button"
          disabled={wishlistLoading}
          onClick={(event) => {
            event.stopPropagation();
            toggleWishlist();
          }}
          aria-label={
            wishlisted
              ? "Remove from Wishlist"
              : "Add to Wishlist"
          }
          className={`absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-[#FFFDF9]/94 shadow-[0_5px_18px_rgba(0,0,0,0.12)] ${
            wishlisted ? "text-[#7C3A45]" : "text-[#211C18]"
          } ${
            wishlistLoading ? "opacity-45" : ""
          }`}
        >
          <StoreIcon
            name="heart"
            className="h-[19px] w-[19px]"
          />
        </button>

        <span className="absolute bottom-2 left-2 rounded-sm bg-[#6E392A]/92 px-2 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-white">
          {mode === "RESELLER"
            ? "Wholesale"
            : product.isFeatured
              ? "Premium"
              : product.isNewArrival
                ? "New"
                : product.isTrending
                  ? "Trending"
                  : "AR Pick"}
        </span>
      </div>

      <div className="pt-2.5">
        <h3 className="line-clamp-1 text-[12px] font-semibold leading-4 text-[#211C18] sm:text-sm">
          {product.name}
        </h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[13px] font-black text-[#211C18] sm:text-[15px]">
            {money(price)}
          </span>

          {product.mrp &&
            Number(product.mrp) > Number(price) && (
              <span className="text-[10px] text-[#9A9289] line-through">
                {money(product.mrp)}
              </span>
            )}

          {discountPercent > 0 && (
            <span className="rounded-[0.28rem] bg-[#0F5A38] px-1.5 py-1 text-[7px] font-black text-white">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[8px] font-semibold text-[#7B7066]">
            {product.category.name}
          </span>

          <button
            type="button"
            aria-label="Open product"
            onClick={(event) => {
              event.stopPropagation();
              openProduct();
            }}
            className="grid h-8 w-8 place-items-center rounded-[0.55rem] bg-[#041B14] text-[#FFF9ED]"
          >
            <StoreIcon
              name="bag"
              className="h-[16px] w-[16px]"
            />
          </button>
        </div>

        {mode === "RESELLER" &&
          product.resellerPrice !== null && (
          <p className="mt-1 text-[9px] font-bold text-[#7C3A45]">
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
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[8px] font-black uppercase tracking-[0.32em] text-[#3D3A37]">
            Trending now
          </p>

          <h2 className="font-serif text-[2.15rem] font-normal leading-none tracking-[-0.03em] text-[#211C18] sm:text-[2.6rem]">
            {title}
          </h2>

          <p className="mt-2 text-[10px] font-medium text-[#7B7066] sm:text-xs">
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
          className="hidden items-center gap-2 text-[10px] font-black text-[#211C18] sm:inline-flex"
        >
          View All  →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {products.slice(0, 4).map((product) => (
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
  const reelCount = reels.length;

  const [reelTrackIndex, setReelTrackIndex] =
    useState(() => (reelCount > 1 ? reelCount : 0));

  const [reelTouchStartX, setReelTouchStartX] =
    useState<number | null>(null);

  const [animateTrack, setAnimateTrack] =
    useState(false);

  useEffect(() => {
    setAnimateTrack(false);
    setReelTrackIndex(
      reelCount > 1 ? reelCount : 0,
    );
  }, [reelCount]);

  useEffect(() => {
    if (reelCount <= 1) return;

    const reducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

    if (reducedMotion.matches) return;

    const timer = window.setInterval(() => {
      setAnimateTrack(true);
      setReelTrackIndex(
        (current) => current + 1,
      );
    }, 3200);

    return () =>
      window.clearInterval(timer);
  }, [reelCount]);

  if (reelCount === 0) return null;

  const carouselReels =
    reelCount > 1
      ? Array.from(
          { length: reelCount * 3 },
          (_, index) =>
            reels[index % reelCount],
        )
      : reels;

  const activeReelIndex =
    reelCount > 0
      ? ((reelTrackIndex % reelCount) +
          reelCount) %
        reelCount
      : 0;

  function moveReel(direction: number) {
    if (reelCount <= 1) return;

    setAnimateTrack(true);
    setReelTrackIndex(
      (current) =>
        current + direction,
    );
  }

  function openReel(
    reel: Reel,
    virtualIndex: number,
  ) {
    if (
      reelCount > 1 &&
      virtualIndex !== reelTrackIndex
    ) {
      setAnimateTrack(true);
      setReelTrackIndex(virtualIndex);
      return;
    }

    router.push(
      `/reels?mode=${mode.toLowerCase()}&reel=${reel.id}`,
    );
  }

  function finishTrackTransition() {
    if (
      reelCount <= 1 ||
      !animateTrack
    ) {
      return;
    }

    if (
      reelTrackIndex >=
      reelCount * 2
    ) {
      setAnimateTrack(false);
      setReelTrackIndex(reelCount);
      return;
    }

    if (reelTrackIndex < reelCount) {
      setAnimateTrack(false);
      setReelTrackIndex(
        reelCount * 2 - 1,
      );
    }
  }

  function finishSwipe(
    endX: number,
  ) {
    if (reelTouchStartX === null) {
      return;
    }

    const distance =
      endX - reelTouchStartX;

    setReelTouchStartX(null);

    if (Math.abs(distance) < 45) {
      return;
    }

    moveReel(
      distance < 0 ? 1 : -1,
    );
  }

  return (
    <section
      id="fashion-reels"
      className="overflow-hidden border-y border-[#E7DBCC] bg-[#F8F1E7]"
    >
      <div className="mx-auto max-w-7xl py-10 sm:py-12">
        <div className="mb-6 flex items-end justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.32em] text-[#6B5435]">
              Watch · Discover · Shop
            </p>

            <h2 className="mt-2 font-serif text-[2.15rem] leading-none tracking-[-0.03em] text-[#211C18] sm:text-[2.6rem]">
              {title ||
                "Fashion Reels"}
            </h2>

            <p className="mt-2 text-[10px] text-[#7B7066] sm:text-xs">
              {subtitle ||
                "See the look in motion"}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/reels?mode=${mode.toLowerCase()}`,
              )
            }
            className="shrink-0 text-[9px] font-black uppercase tracking-[0.1em] text-[#211C18] active:scale-[0.98]"
          >
            View all →
          </button>
        </div>

        <div
          className="relative h-[405px] overflow-hidden"
          onTouchStart={(event) =>
            setReelTouchStartX(
              event.touches[0]?.clientX ??
                null,
            )
          }
          onTouchEnd={(event) =>
            finishSwipe(
              event.changedTouches[0]
                ?.clientX ?? 0,
            )
          }
        >
          <div
            onTransitionEnd={
              finishTrackTransition
            }
            className={`absolute left-1/2 top-0 flex gap-3 will-change-transform ${
              animateTrack
                ? "transition-transform duration-300 ease-out"
                : "transition-none"
            }`}
            style={{
              transform: `translate3d(-${
                reelTrackIndex * 272 +
                130
              }px, 0, 0)`,
            }}
          >
            {carouselReels.map(
              (reel, virtualIndex) => {
                const distance =
                  Math.abs(
                    virtualIndex -
                      reelTrackIndex,
                  );

                const isActive =
                  virtualIndex ===
                  reelTrackIndex;

                const isNear =
                  distance <= 1;

                const thumb =
                  reel.thumbnailUrl ??
                  reel.product.image ??
                  null;

                const price =
                  mode ===
                    "RESELLER" &&
                  reel.product
                    .resellerPrice !==
                    null
                    ? reel.product
                        .resellerPrice
                    : reel.product
                        .retailPrice;

                return (
                  <button
                    key={`${virtualIndex}-${reel.id}`}
                    type="button"
                    tabIndex={
                      isNear ? 0 : -1
                    }
                    onClick={() =>
                      openReel(
                        reel,
                        virtualIndex,
                      )
                    }
                    className={`group relative w-[260px] shrink-0 overflow-hidden rounded-[1.1rem] bg-[#0A2119] text-left shadow-[0_16px_38px_rgba(55,41,28,0.16)] transition-[transform,opacity] duration-300 active:scale-[0.98] ${
                      isNear
                        ? "pointer-events-auto"
                        : "pointer-events-none"
                    }`}
                    style={{
                      aspectRatio: "9 / 14",
                      transform: isActive
                        ? "scale(1)"
                        : distance === 1
                          ? "scale(0.88)"
                          : "scale(0.8)",
                      opacity: isActive
                        ? 1
                        : distance === 1
                          ? 0.58
                          : 0.18,
                    }}
                  >
                    {reel.source ===
                    "UPLOAD" ? (
                      isActive ? (
                        <video
                          src={reel.url}
                          poster={
                            thumb ??
                            undefined
                          }
                          muted
                          autoPlay
                          loop
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : thumb ? (
                        <img
                          src={thumb}
                          alt={
                            reel.caption ||
                            reel.product.name
                          }
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <video
                          src={reel.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      )
                    ) : thumb ? (
                      <img
                        src={thumb}
                        alt={
                          reel.caption ||
                          reel.product.name
                        }
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#0B2A20,#04140F)] text-white">
                        <StoreIcon
                          name="play"
                          className="h-8 w-8"
                        />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/10" />

                    <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
                      Reel
                    </span>

                    <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-[#FFF8EC]/94 text-[#092019] shadow-sm">
                      <StoreIcon
                        name="play"
                        className="h-4 w-4"
                      />
                    </span>

                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="line-clamp-1 text-[11px] font-black text-white">
                        {
                          reel.product
                            .name
                        }
                      </p>

                      <p className="mt-1.5 text-[11px] font-black text-[#F0D7A9]">
                        {money(price)}
                      </p>

                      {isActive ? (
                        <span className="mt-3 inline-flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.12em] text-white/80">
                          Tap to shop
                          <span>→</span>
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              },
            )}
          </div>

          {reelCount > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous reel"
                onClick={() =>
                  moveReel(-1)
                }
                className="absolute left-2 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[#08251C]/82 text-lg text-white shadow-lg backdrop-blur transition-[transform,opacity] duration-300 active:scale-[0.98] sm:left-6"
              >
                ‹
              </button>

              <button
                type="button"
                aria-label="Next reel"
                onClick={() =>
                  moveReel(1)
                }
                className="absolute right-2 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[#08251C]/82 text-lg text-white shadow-lg backdrop-blur transition-[transform,opacity] duration-300 active:scale-[0.98] sm:right-6"
              >
                ›
              </button>
            </>
          ) : null}
        </div>

        {reelCount > 1 ? (
          <div className="mt-4 flex justify-center gap-1.5">
            {reels.map(
              (reel, index) => (
                <button
                  key={reel.id}
                  type="button"
                  aria-label={`Go to reel ${
                    index + 1
                  }`}
                  onClick={() => {
                    setAnimateTrack(true);
                    setReelTrackIndex(
                      reelCount + index,
                    );
                  }}
                  className={`h-1.5 rounded-full transition-[transform,opacity] duration-300 ${
                    activeReelIndex ===
                    index
                      ? "w-6 bg-[#173D30]"
                      : "w-1.5 bg-[#B9A895]"
                  }`}
                />
              ),
            )}
          </div>
        ) : null}
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
    homeCategoryImages,
    setHomeCategoryImages,
  ] = useState<
    Record<string, string>
  >({});

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

  const [
    selectedBenefit,
    setSelectedBenefit,
  ] = useState<BenefitKey | null>(
    null,
  );

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

          setHomeCategoryImages(
            data.homeCategoryImages &&
            typeof data.homeCategoryImages ===
              "object"
              ? data.homeCategoryImages
              : {},
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

    const timer =
      window.setTimeout(
        loadReels,
        500,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, []);

  useEffect(() => {
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

    const sectionsTimer =
      window.setTimeout(
        loadHomeSections,
        450,
      );

    return () =>
      window.clearTimeout(
        sectionsTimer,
      );
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

    const bannerTimer =
      window.setTimeout(
        loadHeroBanners,
        550,
      );

    return () => {
      cancelled = true;
      window.clearTimeout(
        bannerTimer,
      );
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

  function navigateGenderCategory(
    value:
      | "WOMEN"
      | "MEN"
      | "KIDS",
  ) {
    applyGenderCategory(
      value,
    );

    window.setTimeout(() => {
      document
        .getElementById(
          "shop-categories",
        )
        ?.scrollIntoView({
          behavior:
            "smooth",
        });
    }, 50);
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

    saveProductTransitionPreview({
      id: heroSlideProduct.id,
      name: heroSlideProduct.name,
      category:
        heroSlideProduct.category.name,
      image:
        heroSlideMedia?.type ===
        "IMAGE"
          ? heroSlideMedia.url
          : heroSlideMedia?.thumbnailUrl ??
            null,
      price: heroSlidePrice,
      mrp: heroSlideProduct.mrp,
      mode,
    });

    const href =
      `/products/${heroSlideProduct.id}?mode=${mode.toLowerCase()}`;

    router.prefetch(href);
    router.push(href);
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
    type HomeCategoryItem = {
      key: string;
      name: string;
      imageUrl: string | null;
      ids: string[];
    };

    const fixedNames = [
      "Women",
      "Men",
      "Kids",
      "Kurtis",
      "Jeans",
      "Girls Dresses",
    ];

    const allItems: HomeCategoryItem[] =
      [];

    menuCategories.forEach(
      (main) => {
        allItems.push({
          key:
            `main-${main.id}`,
          name:
            main.name,
          imageUrl:
            main.imageUrl,
          ids: [
            main.id,
            ...main.children.map(
              (child) =>
                child.id,
            ),
          ],
        });

        main.children.forEach(
          (child) => {
            allItems.push({
              key:
                `child-${child.id}`,
              name:
                child.name,
              imageUrl:
                child.imageUrl,
              ids: [
                child.id,
              ],
            });
          },
        );
      },
    );

    const items:
      Array<
        HomeCategoryItem | null
      > =
      fixedNames.map(
        (name) => {
          const wanted =
            name
              .trim()
              .toLowerCase();

          const matches =
            allItems.filter(
              (item) =>
                item.name
                  .trim()
                  .toLowerCase() ===
                wanted,
            );

          if (
            matches.length === 0
          ) {
            return null;
          }

          const ids =
            Array.from(
              new Set(
                matches.flatMap(
                  (item) =>
                    item.ids,
                ),
              ),
            );

          const dedicatedImage =
            homeCategoryImages[
              wanted
            ] ?? null;

          const fallbackImage =
            matches.find(
              (item) =>
                Boolean(
                  item.imageUrl,
                ),
            )?.imageUrl ??
            null;

          return {
            key:
              `home-${wanted}`,
            name,
            imageUrl:
              dedicatedImage ??
              fallbackImage,
            ids,
          };
        },
      );

    return items.filter(
      (
        item,
      ): item is HomeCategoryItem =>
        item !== null,
    );
  }, [
    menuCategories,
    homeCategoryImages,
  ]);

  const defaultHomeSections:
    HomeSection[] = [
      {
        id: "default-new-arrivals",
        title: "Fresh Drops",
        subtitle:
          "New season favourites, curated for now",
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

  const contentSections = useMemo(() => {
    const source =
      homeSectionsConfigured
        ? homeSections
        : defaultHomeSections;

    const unique = new Map<
      HomeSection["sectionType"],
      HomeSection
    >();

    [...source]
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder,
      )
      .forEach((section) => {
        if (
          !unique.has(
            section.sectionType,
          )
        ) {
          unique.set(
            section.sectionType,
            section,
          );
        }
      });

    return Array.from(
      unique.values(),
    );
  }, [
    homeSections,
    homeSectionsConfigured,
  ]);

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

  const benefitItems: Array<{
    key: BenefitKey;
    icon: string;
    title: string;
    subtitle: string;
    description: string;
  }> = [
    {
      key: "QUALITY",
      icon: "✦",
      title: "Premium Quality",
      subtitle:
        "AR curated fashion",
      description:
        "AR Fashions collections are curated for quality, style and wearable everyday fashion. Open the collection to explore currently available products.",
    },
    {
      key: "COD",
      icon: "▣",
      title:
        siteSettings.codEnabled
          ? "Cash on Delivery"
          : "Easy Checkout",
      subtitle:
        siteSettings.codEnabled
          ? "COD available"
          : "Simple checkout",
      description:
        siteSettings.codEnabled
          ? "Cash on Delivery is currently available on eligible AR Fashions orders. Final availability is confirmed during checkout."
          : "Checkout is currently configured with the payment options enabled by AR Fashions.",
    },
    {
      key: "RESELLER",
      icon: "↻",
      title:
        "Retail + Reseller",
      subtitle:
        "Two shopping modes",
      description:
        "Shop normally as a retail customer or apply for approved reseller access to unlock wholesale pricing, MOQ ordering and reseller sets.",
    },
    {
      key: "SUPPORT",
      icon: "◉",
      title:
        "Customer Support",
      subtitle:
        siteSettings.supportPhone ||
        "AR Fashions support",
      description:
        "Need help with products, orders, delivery or reseller access? Contact AR Fashions customer support using the available contact options.",
    },
  ];

  const selectedBenefitItem =
    benefitItems.find(
      (item) =>
        item.key ===
        selectedBenefit,
    ) ?? null;

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
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#211C18] sm:pb-0">
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

      {/* AR PREMIUM EDITORIAL HEADER */}
      <header className="sticky top-0 z-50 bg-[#031B14] text-[#FFF8EC] shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
        <div className="mx-auto max-w-7xl px-4 pb-3 pt-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menu"
              className="grid h-10 w-10 shrink-0 place-items-center text-[#FFF8EC]"
            >
              <StoreIcon
                name="menu"
                className="h-6 w-6"
              />
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex min-w-0 items-center gap-2 text-left"
            >
              <span className="font-serif text-[2.15rem] leading-none tracking-[-0.08em] text-[#FFF8EC] sm:text-[2.5rem]">
                AR
              </span>
              <span className="min-w-0">
                <span className="block truncate font-serif text-[1rem] tracking-[0.18em] text-[#FFF8EC] sm:text-[1.15rem]">
                  FASHIONS
                </span>
                <span className="mt-0.5 block text-[5px] font-black uppercase tracking-[0.42em] text-[#D9C29A]">
                  Wear your story
                </span>
              </span>
            </button>

            <nav className="ml-5 hidden items-center gap-5 lg:flex">
              {[
                ["Home", "/"],
                ["Reels", `/reels?mode=${mode.toLowerCase()}`],
                [
                  "Reseller",
                  mode === "RESELLER"
                    ? "/reseller-sets"
                    : "/account",
                ],
              ].map(([label, href]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => router.push(href)}
                  className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/70 hover:text-white"
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => router.push("/wishlist")}
                aria-label="Wishlist"
                className="grid h-10 w-10 place-items-center rounded-full text-[#FFF8EC]"
              >
                <StoreIcon
                  name="heart"
                  className="h-[22px] w-[22px]"
                />
              </button>

              <button
                type="button"
                onClick={() => router.push("/cart")}
                aria-label="Cart"
                className="relative grid h-10 w-10 place-items-center rounded-full text-[#FFF8EC]"
              >
                <StoreIcon
                  name="bag"
                  className="h-[22px] w-[22px]"
                />
                <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#E3C79A] px-1 text-[7px] font-black text-[#031B14]">
                  0
                </span>
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center rounded-full border border-white/35 bg-white/[0.06] px-4 py-3 backdrop-blur">
            <StoreIcon
              name="search"
              className="h-[18px] w-[18px] shrink-0 text-[#FFF8EC]"
            />
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search for dresses, tops, kurta sets, co-ord sets..."
              className="ml-3 min-w-0 flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-white/55 sm:text-sm"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="ml-2 grid h-7 w-7 place-items-center rounded-full border border-white/20 text-sm text-white/75"
              >
                ×
              </button>
            ) : null}
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
      {/* CINEMATIC EDITORIAL HERO */}
      <section className="bg-[#031B14]">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div
            className="relative h-[390px] touch-pan-y overflow-hidden bg-[#082219] sm:h-[500px] sm:rounded-b-[2rem]"
            onTouchStart={(event) => {
              setHeroTouchStartX(
                event.touches[0]?.clientX ?? null,
              );
            }}
            onTouchEnd={(event) => {
              if (heroTouchStartX === null) return;
              const endX =
                event.changedTouches[0]?.clientX ??
                heroTouchStartX;
              const distance =
                endX - heroTouchStartX;
              setHeroTouchStartX(null);

              if (Math.abs(distance) >= 45) {
                moveHeroSlide(distance < 0 ? 1 : -1);
              }
            }}
          >
            <div className="absolute inset-0">
              {heroSlideMedia ? (
                heroSlideMedia.type === "VIDEO" ? (
                  <video
                    key={heroSlideProduct?.id}
                    src={heroSlideMedia.url}
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    key={heroSlideProduct?.id}
                    src={heroSlideMedia.url}
                    alt={
                      heroSlideMedia.altText ??
                      heroSlideProduct?.name ??
                      "AR Fashions"
                    }
                    className="h-full w-full object-cover"
                  />
                )
              ) : activeBanner?.imageUrl ||
                activeBanner?.mobileImageUrl ? (
                <picture>
                  {activeBanner.mobileImageUrl ? (
                    <source
                      media="(max-width: 639px)"
                      srcSet={activeBanner.mobileImageUrl}
                    />
                  ) : null}
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
                <div className="h-full w-full bg-[radial-gradient(circle_at_72%_24%,rgba(197,161,105,0.24),transparent_28%),linear-gradient(135deg,#082B20,#031B14_58%,#020B08)]" />
              )}

              <div className="absolute inset-0 bg-gradient-to-r from-[#02150F]/95 via-[#02150F]/60 to-black/12" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#02150F]/72 via-transparent to-transparent" />
            </div>

            {heroSlideProduct ? (
              <button
                type="button"
                onClick={openHeroProduct}
                aria-label={`View ${heroSlideProduct.name}`}
                className="absolute inset-0 z-10"
              />
            ) : null}

            <div className="pointer-events-none relative z-20 flex h-full items-end p-6 pb-14 sm:items-center sm:p-10 lg:p-14">
              <div className="max-w-[560px]">
                <p className="text-[8px] font-black uppercase tracking-[0.42em] text-[#F4E8D6] sm:text-[10px]">
                  New Season
                </p>

                <h1 className="mt-3 max-w-[520px] font-serif text-[2.9rem] leading-[0.9] tracking-[-0.045em] text-white sm:text-[4.8rem]">
                  Tradition
                  <br />
                  Reimagined
                </h1>

                <p className="mt-4 max-w-[340px] font-serif text-[1.02rem] leading-6 text-white/88 sm:text-[1.3rem]">
                  Ethnic looks for your modern era
                </p>

                <div className="pointer-events-auto mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (heroSlideProduct) {
                        openHeroProduct();
                      } else {
                        document
                          .getElementById("shop-categories")
                          ?.scrollIntoView({
                            behavior: "smooth",
                          });
                      }
                    }}
                    className="inline-flex items-center gap-4 rounded-[0.2rem] bg-[#FFF8EC] px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.13em] text-[#17130F] shadow-[0_12px_30px_rgba(0,0,0,0.16)]"
                  >
                    Shop the collection
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute right-6 top-16 z-20 hidden border-l border-[#C79C55]/75 pl-5 text-right sm:block">
              <p className="font-serif text-[1.55rem] italic leading-8 text-white/90">
                Your Story
                <br />
                in Every Drape
              </p>
              <p className="mt-6 text-[7px] font-black uppercase tracking-[0.32em] text-white/65">
                Ethnic · Fusion
                <br />
                Everyday Luxe
              </p>
            </div>

            {heroProducts.length > 1 ? (
              <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
                {heroProducts.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    aria-label={`Show ${product.name}`}
                    onClick={() => setHeroSlideIndex(index)}
                    className={`h-2 w-2 rounded-full border border-white/70 ${
                      index ===
                      heroSlideIndex % heroProducts.length
                        ? "bg-white"
                        : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ARCH CATEGORY RAIL */}
      <section
        id="shop-categories"
        className="border-b border-[#E8DED0] bg-[#FFF8EE]"
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
            {homeCategoryItems.map((item) => {
              const active =
                selectedMenuCategoryName === item.name;

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
                    className={`relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-t-[999px] rounded-b-[0.75rem] border bg-[#EADBC7] ${
                      active
                        ? "border-[#7C3A45]"
                        : "border-[#E1D3C0]"
                    }`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#E9D9C4,#CDBB9F)]">
                        <span className="font-serif text-3xl text-[#6D5431]">
                          AR
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="mt-2 truncate text-[8px] font-black uppercase tracking-[0.08em] text-[#211C18] sm:text-[9px]">
                    {item.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-b border-[#E6DBCD] bg-[#F8F1E7]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
          {[
            {
              key: "COD" as BenefitKey,
              icon: "truck" as const,
              title: siteSettings.codEnabled
                ? "Cash on Delivery"
                : "Easy Checkout",
              subtitle: siteSettings.codEnabled
                ? "Pay when delivered"
                : "Simple order flow",
            },
            {
              key: "QUALITY" as BenefitKey,
              icon: "shield" as const,
              title: "Premium Quality",
              subtitle: "AR curated fashion",
            },
            {
              key: "RESELLER" as BenefitKey,
              icon: "box" as const,
              title: "Retail + Reseller",
              subtitle: "Two shopping modes",
            },
            {
              key: "SUPPORT" as BenefitKey,
              icon: "users" as const,
              title: "Customer Support",
              subtitle: "Help when you need it",
            },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setSelectedBenefit(item.key)
              }
              className="flex min-h-[78px] items-center gap-3 border-[#E5D9C9] px-2 py-4 text-left even:border-l sm:min-h-[86px] sm:border-l sm:px-5 sm:first:border-l-0"
            >
              <StoreIcon
                name={item.icon}
                className="h-7 w-7 shrink-0 text-[#1F1A16]"
              />
              <span>
                <span className="block text-[9px] font-black text-[#211C18] sm:text-[10px]">
                  {item.title}
                </span>
                <span className="mt-1 block text-[7px] font-medium text-[#7B7066] sm:text-[8px]">
                  {item.subtitle}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>


      <PromoSlot
        placement="SHOP_TOP"
        audience={mode}
        className="py-4"
      />

      {loading ? (
        <section
          aria-busy="true"
          className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">
                AR Fashions
              </p>

              <h2 className="mt-2 font-serif text-[1.9rem] text-[#211C18]">
                Preparing your latest styles
              </h2>

              <p className="mt-2 text-[10px] text-white/40">
                New arrivals are coming into view...
              </p>
            </div>

            <div className="flex gap-1.5">
              <span className="h-1.5 w-1.5 ar-skeleton rounded-full bg-[#D4AF37]" />
              <span className="h-1.5 w-1.5 ar-skeleton rounded-full bg-[#D4AF37]/60" />
              <span className="h-1.5 w-1.5 ar-skeleton rounded-full bg-[#D4AF37]/30" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-[1rem]"
                >
                  <div className="ar-skeleton aspect-[3/4] rounded-[1rem] border border-[#E4D7C4]" />

                  <div className="mt-3 h-2 w-16 ar-skeleton rounded-full bg-[#D4AF37]/15" />
                  <div className="ar-skeleton mt-2 h-3 w-4/5 rounded-full" />
                  <div className="ar-skeleton mt-2 h-3 w-1/3 rounded-full" />
                </div>
              ),
            )}
          </div>
        </section>
      ) : (
        <>
          {contentSections
            .filter(
              (section) =>
                section.sectionType ===
                "NEW_ARRIVALS",
            )
            .map((section) => (
              <ProductSection
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                products={newArrivals}
                mode={mode}
              />
            ))}

          <FashionReelsSection
            title={
              contentSections.find(
                (section) =>
                  section.sectionType ===
                  "REELS",
              )?.title ?? "Fashion Reels"
            }
            subtitle={
              contentSections.find(
                (section) =>
                  section.sectionType ===
                  "REELS",
              )?.subtitle ??
              "Watch the look. Shop the look."
            }
            reels={videoReels}
            mode={mode}
          />

          {contentSections
            .filter(
              (section) =>
                section.sectionType !==
                  "NEW_ARRIVALS" &&
                section.sectionType !==
                  "REELS",
            )
            .map((section) => {
              if (
                section.sectionType ===
                "TRENDING"
              ) {
                return (
                  <ProductSection
                    key={section.id}
                    title={section.title}
                    subtitle={section.subtitle}
                    products={trending}
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
                    title={section.title}
                    subtitle={section.subtitle}
                    products={featured}
                    mode={mode}
                  />
                );
              }

              return null;
            })}
        </>
      )}

      <PromoSlot
        placement="HOME_MIDDLE"
        audience={mode}
        className="py-6"
      />

      {/* EDITORIAL + RESELLER PROMOS */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/reels?mode=${mode.toLowerCase()}`,
              )
            }
            className="group relative min-h-[190px] overflow-hidden rounded-[0.95rem] bg-[#042219] text-left text-white sm:min-h-[240px]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(215,188,145,0.22),transparent_28%),linear-gradient(135deg,#0A382B,#042219_56%,#03140F)]" />
            <div className="absolute right-[-26px] top-1/2 h-52 w-40 -translate-y-1/2 rotate-[7deg] border border-white/10 bg-white/[0.04] shadow-[0_18px_40px_rgba(0,0,0,0.22)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#032018] via-[#032018]/88 to-transparent" />
            <div className="relative z-10 flex min-h-[190px] max-w-[66%] flex-col justify-center p-6 sm:min-h-[240px] sm:p-8">
              <p className="text-[8px] font-black uppercase tracking-[0.34em] text-[#D9C29A]">
                AR Edit
              </p>
              <h3 className="mt-3 font-serif text-[2rem] leading-none sm:text-[2.65rem]">
                Stories in Style
              </h3>
              <p className="mt-3 text-[10px] text-white/72">
                Real people. Real looks.
              </p>
              <span className="mt-6 text-[9px] font-black uppercase tracking-[0.12em]">
                Explore now  →
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                mode === "RESELLER"
                  ? "/reseller-sets"
                  : "/account",
              )
            }
            className="relative min-h-[190px] overflow-hidden rounded-[0.95rem] border border-[#DECDB6] bg-[linear-gradient(120deg,#F3E7D5,#E5D1B6)] text-left text-[#211C18] sm:min-h-[240px]"
          >
            <div className="absolute -right-7 bottom-[-20px] grid h-44 w-36 rotate-[4deg] place-items-center border border-[#B99E79] bg-[#EFE1CB] shadow-[0_16px_30px_rgba(92,67,42,0.16)] sm:h-52 sm:w-44">
              <span className="font-serif text-5xl text-[#6B5435]">
                AR
              </span>
            </div>
            <div className="relative z-10 flex min-h-[190px] max-w-[62%] flex-col justify-center p-6 sm:min-h-[240px] sm:p-8">
              <p className="text-[8px] font-black uppercase tracking-[0.34em] text-[#6B5435]">
                Reseller Studio
              </p>
              <h3 className="mt-3 font-serif text-[2rem] leading-none sm:text-[2.65rem]">
                Grow Together
              </h3>
              <p className="mt-3 text-[10px] leading-4 text-[#5F5145]">
                Exclusive prices for bulk buyers.
              </p>
              <span className="mt-6 text-[9px] font-black uppercase tracking-[0.12em]">
                Join now  →
              </span>
            </div>
          </button>
        </div>
      </section>

      <PromoSlot
        placement="HOME_BOTTOM"
        audience={mode}
        className="pb-10"
      />


      {/* FOOTER */}
      <footer className="border-t border-[#E4D7C4] bg-[#F4EBDD]">
        <div className="mx-auto max-w-7xl px-5 py-10 text-center sm:px-6 lg:px-8">
          <p className="font-serif text-[1.8rem] tracking-[0.08em] text-[#211C18]">
            AR
          </p>

          <p className="mt-1 text-[7px] font-black uppercase tracking-[0.35em] text-[#D4AF37]">
            Fashions
          </p>

          <p className="mt-4 text-[8px] uppercase tracking-[0.22em] text-[#7B7066]">
            Wear · Share · Belong
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-3 text-[9px] font-semibold text-[#7B7066]">
            <button
              type="button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior:
                    "smooth",
                })
              }
              className="transition hover:text-[#D4AF37]"
            >
              Home
            </button>

            <button
              type="button"
              onClick={() =>
                navigateGenderCategory(
                  "WOMEN",
                )
              }
              className="transition hover:text-[#D4AF37]"
            >
              Women
            </button>

            <button
              type="button"
              onClick={() =>
                navigateGenderCategory(
                  "MEN",
                )
              }
              className="transition hover:text-[#D4AF37]"
            >
              Men
            </button>

            <button
              type="button"
              onClick={() =>
                navigateGenderCategory(
                  "KIDS",
                )
              }
              className="transition hover:text-[#D4AF37]"
            >
              Kids
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
              className="transition hover:text-[#D4AF37]"
            >
              Reseller
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedBenefit(
                  "SUPPORT",
                )
              }
              className="transition hover:text-[#D4AF37]"
            >
              Support
            </button>
          </div>

          <p className="mt-8 text-[7px] text-[#7B7066]">
            © 2026 AR Fashions
          </p>
        </div>
      </footer>

      {selectedBenefitItem ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"
          onClick={() =>
            setSelectedBenefit(
              null,
            )
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) =>
              event.stopPropagation()
            }
            className="w-full max-w-md overflow-hidden rounded-[1.8rem] border border-[#E4D7C4] bg-[#FFFDF9] text-[#211C18] shadow-[0_30px_90px_rgba(61,48,37,0.22)]"
          >
            <div className="border-b border-[#E4D7C4] p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/[0.06] text-lg text-[#D4AF37]">
                  {
                    selectedBenefitItem.icon
                  }
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedBenefit(
                      null,
                    )
                  }
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#E4D7C4] bg-[#FAF7F0] text-sm text-[#7B7066]"
                  aria-label="Close details"
                >
                  ×
                </button>
              </div>

              <p className="mt-5 text-[8px] font-black uppercase tracking-[0.24em] text-[#D4AF37]">
                AR Fashions
              </p>

              <h3 className="mt-2 font-serif text-3xl text-[#211C18]">
                {
                  selectedBenefitItem.title
                }
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#7B7066]">
                {
                  selectedBenefitItem.description
                }
              </p>
            </div>

            <div className="p-5">
              {selectedBenefit ===
              "QUALITY" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBenefit(
                      null,
                    );

                    window.setTimeout(
                      () =>
                        document
                          .getElementById(
                            "shop-categories",
                          )
                          ?.scrollIntoView({
                            behavior:
                              "smooth",
                          }),
                      50,
                    );
                  }}
                  className="w-full rounded-2xl bg-[#D4AF37] py-4 text-[9px] font-black uppercase tracking-[0.1em] text-[#080B0D]"
                >
                  Explore Collection →
                </button>
              ) : null}

              {selectedBenefit ===
              "COD" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBenefit(
                      null,
                    );

                    window.setTimeout(
                      () =>
                        document
                          .getElementById(
                            "shop-categories",
                          )
                          ?.scrollIntoView({
                            behavior:
                              "smooth",
                          }),
                      50,
                    );
                  }}
                  className="w-full rounded-2xl bg-[#D4AF37] py-4 text-[9px] font-black uppercase tracking-[0.1em] text-[#080B0D]"
                >
                  Start Shopping →
                </button>
              ) : null}

              {selectedBenefit ===
              "RESELLER" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBenefit(
                      null,
                    );

                    router.push(
                      mode ===
                        "RESELLER"
                        ? "/reseller-sets"
                        : "/account",
                    );
                  }}
                  className="w-full rounded-2xl bg-[#D4AF37] py-4 text-[9px] font-black uppercase tracking-[0.1em] text-[#080B0D]"
                >
                  {mode ===
                  "RESELLER"
                    ? "Open Wholesale →"
                    : "Explore Reseller Access →"}
                </button>
              ) : null}

              {selectedBenefit ===
              "SUPPORT" ? (
                <div className="space-y-3">
                  {siteSettings.supportPhone ? (
                    <a
                      href={`tel:${siteSettings.supportPhone}`}
                      className="flex w-full items-center justify-between rounded-2xl border border-[#E4D7C4] bg-[#FAF7F0] px-4 py-4 text-[10px] font-black text-[#211C18]"
                    >
                      <span>
                        Call Support
                      </span>
                      <span className="text-[#D4AF37]">
                        {
                          siteSettings.supportPhone
                        }
                      </span>
                    </a>
                  ) : null}

                  {siteSettings.whatsappNumber ? (
                    <a
                      href={`https://wa.me/${siteSettings.whatsappNumber.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-between rounded-2xl border border-[#B9D8C7] bg-[#EDF7F1] px-4 py-4 text-[10px] font-black text-[#0D5A38]"
                    >
                      <span>
                        WhatsApp
                      </span>
                      <span>Open →</span>
                    </a>
                  ) : null}

                  {siteSettings.supportEmail ? (
                    <a
                      href={`mailto:${siteSettings.supportEmail}`}
                      className="flex w-full items-center justify-between rounded-2xl border border-[#E4D7C4] bg-[#FAF7F0] px-4 py-4 text-[10px] font-black text-[#211C18]"
                    >
                      <span>Email</span>
                      <span className="max-w-[190px] truncate text-[#7B7066]">
                        {
                          siteSettings.supportEmail
                        }
                      </span>
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#031B14]/98 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 text-[#FFF8EC] shadow-[0_-14px_34px_rgba(0,0,0,0.18)] backdrop-blur-2xl sm:hidden">
        <div className="grid grid-cols-5">
          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-[#FFF1D8]"
          >
            <StoreIcon name="home" className="h-5 w-5" />
            <span className="text-[7px] font-bold">Home</span>
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
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-white/72"
          >
            <StoreIcon name="grid" className="h-5 w-5" />
            <span className="text-[7px] font-bold">Categories</span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/reels?mode=${mode.toLowerCase()}`,
              )
            }
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-white/72"
          >
            <StoreIcon name="play" className="h-5 w-5" />
            <span className="text-[7px] font-bold">Reels</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-white/72"
          >
            <StoreIcon name="bag" className="h-5 w-5" />
            <span className="text-[7px] font-bold">Cart</span>
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
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-white/72"
          >
            <StoreIcon name="user" className="h-5 w-5" />
            <span className="text-[7px] font-bold">Account</span>
          </button>
        </div>
      </nav>

        {/* SHOP CONTENT CLOSED CONDITIONAL END */}
        </>
      )}
    </main>
  );
}

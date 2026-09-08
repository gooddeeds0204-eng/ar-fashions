"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserId } from "@/lib/user-session";
import { ensureUserSession } from "@/lib/user-session-init";
import { useRouter } from "next/navigation";

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
  buttonText: string | null;
  buttonUrl: string | null;
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
        const userId = getUserId();

        if (!userId) return;

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

    const userId = getUserId();

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

  return (
    <article
      onClick={() => router.push(`/products/${product.id}?mode=${mode.toLowerCase()}`)}
      className="group min-w-[230px] cursor-pointer overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:min-w-0"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
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
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
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
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm backdrop-blur transition ${
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

      <div className="p-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          {product.category.name}
        </p>

        <h3 className="line-clamp-1 text-sm font-bold text-zinc-900">
          {product.name}
        </h3>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-base font-extrabold text-zinc-950">
            {money(price)}
          </span>

          {product.mrp && Number(product.mrp) > Number(price) && (
            <span className="text-xs text-zinc-400 line-through">
              {money(product.mrp)}
            </span>
          )}
        </div>

        {mode === "RESELLER" && product.resellerPrice !== null && (
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            MOQ {product.resellerMOQ ?? 1} pcs
          </p>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            router.push(`/products/${product.id}?mode=${mode.toLowerCase()}`);
          }}
          className="mt-4 w-full rounded-xl bg-zinc-950 py-3 text-xs font-bold text-white transition hover:bg-emerald-600"
        >
          {mode === "RESELLER" ? "Add to Bulk Set" : "View Product"}
        </button>
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
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">
            AR Fashions
          </p>

          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            {title}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
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
          className="hidden rounded-full border border-black/10 px-4 py-2 text-xs font-bold sm:block"
        >
          View All →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

  const [
    selectedReelId,
    setSelectedReelId,
  ] = useState<string | null>(
    reels[0]?.id ?? null,
  );

  useEffect(() => {
    if (
      reels.length > 0 &&
      !reels.some(
        (item) =>
          item.id ===
          selectedReelId,
      )
    ) {
      setSelectedReelId(
        reels[0].id,
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
    ) ?? reels[0];

  function openProduct(
    reel: Reel,
  ) {
    router.push(
      `/products/${reel.product.id}?mode=${mode.toLowerCase()}`,
    );
  }

  function selectReel(
    reel: Reel,
  ) {
    setSelectedReelId(
      reel.id,
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            "fashion-reels-viewer",
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block:
              "center",
          });
      },
      50,
    );
  }

  return (
    <section
      id="fashion-reels"
      className="bg-zinc-950 py-12 text-white"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
            Shop the Look
          </p>

          <h2 className="mt-2 text-3xl font-black">
            {title}
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            {subtitle}
          </p>
        </div>

        {/* SIDE-BY-SIDE REEL PREVIEWS */}
        <div className="-mx-4 overflow-x-auto px-4 pb-4">
          <div className="flex min-w-max gap-3">
            {reels
              .slice(0, 12)
              .map(
                (reel) => {
                  const active =
                    reel.id ===
                    selectedReel.id;

                  return (
                    <button
                      key={
                        reel.id
                      }
                      type="button"
                      onClick={() =>
                        selectReel(
                          reel,
                        )
                      }
                      className={`relative w-[112px] shrink-0 overflow-hidden rounded-2xl border text-left transition sm:w-[140px] ${
                        active
                          ? "border-emerald-400 ring-2 ring-emerald-400/30"
                          : "border-white/10"
                      }`}
                    >
                      <div className="relative aspect-[9/14] bg-zinc-900">
                        {reel.thumbnailUrl ? (
                          <img
                            src={
                              reel.thumbnailUrl
                            }
                            alt={
                              reel.caption
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : reel.source ===
                          "UPLOAD" ? (
                          <video
                            src={
                              reel.url
                            }
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-b from-fuchsia-700 via-rose-600 to-orange-500">
                            <span className="text-3xl">
                              ▶
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

                        <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[8px] font-black">
                          {reel.source ===
                          "INSTAGRAM"
                            ? "INSTAGRAM"
                            : "REEL"}
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-sm text-black shadow-lg">
                            ▶
                          </span>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-2">
                          <p className="line-clamp-2 text-[10px] font-black leading-4 text-white">
                            {
                              reel.product.name
                            }
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                },
              )}
          </div>
        </div>

        <p className="mb-5 text-center text-[10px] font-semibold text-zinc-500">
          Tap a reel above to watch
        </p>

        {/* SELECTED MAIN REEL */}
        <div
          id="fashion-reels-viewer"
          className="scroll-mt-24"
        >
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-[minmax(0,360px)_1fr] md:items-center">
            <button
              type="button"
              onClick={() =>
                openProduct(
                  selectedReel,
                )
              }
              className="group relative mx-auto block w-full max-w-[360px] overflow-hidden rounded-[2rem] bg-black text-left shadow-2xl"
              aria-label={`Shop ${selectedReel.product.name}`}
            >
              <div className="relative aspect-[9/14]">
                {selectedReel.source ===
                  "INSTAGRAM" &&
                selectedReel.instagramEmbedUrl ? (
                  <iframe
                    key={
                      selectedReel.id
                    }
                    src={
                      selectedReel.instagramEmbedUrl
                    }
                    title={
                      selectedReel.caption
                    }
                    className="pointer-events-none h-full w-full border-0 bg-white"
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <video
                    key={
                      selectedReel.id
                    }
                    src={
                      selectedReel.url
                    }
                    poster={
                      selectedReel.thumbnailUrl ??
                      undefined
                    }
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />

                <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1.5 text-[9px] font-black">
                  {selectedReel.source ===
                  "INSTAGRAM"
                    ? "INSTAGRAM REEL"
                    : "AR FASHIONS REEL"}
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
                  <p className="text-lg font-black">
                    {
                      selectedReel.product
                        .name
                    }
                  </p>

                  {selectedReel.caption ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-300">
                      {
                        selectedReel.caption
                      }
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-sm font-black">
                      {money(
                        mode ===
                          "RESELLER" &&
                          selectedReel
                            .product
                            .resellerPrice !==
                            null
                          ? selectedReel
                              .product
                              .resellerPrice
                          : selectedReel
                              .product
                              .retailPrice,
                      )}
                    </span>

                    <span className="rounded-full bg-white px-4 py-2 text-[10px] font-black text-black">
                      Shop Product →
                    </span>
                  </div>
                </div>
              </div>
            </button>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                Featured in this reel
              </p>

              <h3 className="mt-3 text-2xl font-black">
                {
                  selectedReel.product
                    .name
                }
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {selectedReel.caption}
              </p>

              <p className="mt-5 text-xl font-black">
                {money(
                  mode ===
                    "RESELLER" &&
                    selectedReel.product
                      .resellerPrice !==
                      null
                    ? selectedReel
                        .product
                        .resellerPrice
                    : selectedReel
                        .product
                        .retailPrice,
                )}
              </p>

              <button
                type="button"
                onClick={() =>
                  openProduct(
                    selectedReel,
                  )
                }
                className="mt-5 w-full rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black text-black"
              >
                Shop This Product
              </button>

              <p className="mt-3 text-center text-[10px] text-zinc-500">
                Tap the reel itself to open the product page
              </p>
            </div>
          </div>
        </div>
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
    videoReels,
    setVideoReels,
  ] = useState<Reel[]>([]);

  const [bannerIndex, setBannerIndex] =
    useState(0);

  const [mode, setMode] = useState<Mode>("RETAIL");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

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

    async function loadBanners() {
      try {
        const response =
          await fetch(
            "/api/banners",
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        setBanners(
          Array.isArray(
            data.banners,
          )
            ? data.banners
            : [],
        );
      } catch (error) {
        console.error(
          "Homepage banners failed:",
          error,
        );
      }
    }

    loadBanners();

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
    homeSections.length > 0
      ? homeSections
      : defaultHomeSections;

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <div className="mr-auto">
            <p className="text-xl font-black tracking-[-0.05em]">
              AR
              <span className="text-emerald-600">
                FASHIONS
              </span>
            </p>

            <p className="hidden text-[8px] font-semibold uppercase tracking-[0.25em] text-zinc-400 sm:block">
              Fashion · Retail · Wholesale
            </p>
          </div>



          <div className="hidden max-w-md flex-1 md:block">
            <div className="flex items-center rounded-full bg-zinc-100 px-4 py-2.5">
              <span className="mr-2 text-zinc-400">⌕</span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search dresses, kurtis, jeans..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>

          

          

          <button
            type="button"
            onClick={() => router.push("/account")}
            className="hidden rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold text-white sm:block"
          >
            Account
          </button>
        </div>
      </header>

      {/* MODE SWITCH */}
      <div className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold">
              Shop with AR Fashions
            </p>

            <p className="text-[10px] text-zinc-400">
              Choose your shopping mode
            </p>
          </div>

          <div className="flex rounded-full bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setMode("RETAIL")}
              className={`rounded-full px-4 py-2 text-[11px] font-bold transition ${
                mode === "RETAIL"
                  ? "bg-white shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              Retail
            </button>

            <button
              type="button"
              onClick={() => setMode("RESELLER")}
              className={`rounded-full px-4 py-2 text-[11px] font-bold transition ${
                mode === "RESELLER"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              Reseller
            </button>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden bg-zinc-950">
        <div className="mx-auto grid min-h-[500px] max-w-7xl lg:grid-cols-2">
          <div className="relative z-10 flex items-center px-5 py-16 sm:px-8 lg:px-12">
            <div className="max-w-xl text-white">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">
                AR Fashions · 2026 Collection
              </p>

              <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                {activeBanner?.title ? (
                  activeBanner.title
                ) : (
                  <>
                    Fashion that
                    <br />
                    <span className="text-emerald-400">
                      sells itself.
                    </span>
                  </>
                )}
              </h1>

              <p className="mt-6 max-w-md text-sm leading-6 text-zinc-400 sm:text-base">
                {activeBanner?.subtitle ??
                  "Discover ready-to-wear fashion for women, men and kids. Retail shopping and reseller bulk pricing in one place."}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const url =
                      activeBanner?.buttonUrl?.trim();

                    if (
                      url &&
                      url.startsWith("/")
                    ) {
                      router.push(url);
                      return;
                    }

                    setCategory("ALL");

                    window.scrollTo({
                      top: 650,
                      behavior: "smooth",
                    });
                  }}
                  className="rounded-full bg-white px-6 py-3 text-xs font-black text-zinc-950"
                >
                  {activeBanner?.buttonText ||
                    "Shop Collection"}{" "}
                  →
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMode("RESELLER")
                  }
                  className="rounded-full border border-white/20 px-6 py-3 text-xs font-bold text-white"
                >
                  Become a Reseller
                </button>
              </div>
            </div>
          </div>

          <div className="relative min-h-[360px] bg-zinc-900">
            {activeBanner?.videoUrl ? (
              <video
                key={activeBanner.id}
                src={
                  activeBanner.videoUrl
                }
                muted
                autoPlay
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-90"
              />
            ) : activeBanner?.imageUrl ? (
              <img
                key={activeBanner.id}
                src={
                  activeBanner.imageUrl
                }
                alt={
                  activeBanner.title ??
                  "AR Fashions banner"
                }
                className="absolute inset-0 h-full w-full object-cover opacity-90"
              />
            ) : heroProduct?.media?.[0] ? (
              heroProduct.media[0].type ===
              "VIDEO" ? (
                <video
                  src={
                    heroProduct
                      .media[0].url
                  }
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover opacity-80"
                />
              ) : (
                <img
                  src={
                    heroProduct
                      .media[0].url
                  }
                  alt={
                    heroProduct.name
                  }
                  className="absolute inset-0 h-full w-full object-cover opacity-80"
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-600">
                AR FASHIONS
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-transparent" />

            {!activeBanner &&
              heroProduct && (
                <div className="absolute bottom-6 left-5 right-5 rounded-2xl border border-white/10 bg-black/40 p-4 text-white backdrop-blur-xl sm:left-auto sm:w-72">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    Featured
                  </p>

                  <p className="mt-1 font-bold">
                    {heroProduct.name}
                  </p>

                  <p className="mt-1 text-sm text-zinc-300">
                    {money(
                      mode ===
                        "RESELLER" &&
                        heroProduct.resellerPrice !==
                          null
                        ? heroProduct.resellerPrice
                        : heroProduct.retailPrice,
                    )}
                  </p>
                </div>
              )}

            {banners.length > 1 && (
              <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                {banners.map(
                  (banner, index) => (
                    <button
                      key={banner.id}
                      type="button"
                      onClick={() =>
                        setBannerIndex(
                          index,
                        )
                      }
                      aria-label={`Show banner ${
                        index + 1
                      }`}
                      className={`h-2.5 rounded-full transition-all ${
                        index ===
                        bannerIndex
                          ? "w-7 bg-white"
                          : "w-2.5 bg-white/40"
                      }`}
                    />
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {[
            ["WOMEN", "Women", "👗"],
            ["MEN", "Men", "👔"],
            ["KIDS", "Kids", "🧸"],
            ["UNISEX", "Accessories", "✦"],
          ].map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={`group rounded-3xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                category === value
                  ? "border-emerald-500 ring-2 ring-emerald-100"
                  : "border-black/5"
              }`}
            >
              <span className="text-2xl">{icon}</span>

              <p className="mt-5 text-sm font-black">
                {label}
              </p>

              <p className="mt-1 text-[10px] text-zinc-400">
                Explore collection →
              </p>
            </button>
          ))}
        </div>
      </section>

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

      {/* RESELLER CTA */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-emerald-600 p-7 text-white sm:p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100">
                AR Fashions Reseller Zone
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Buy smart.
                <br />
                Sell more.
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-6 text-emerald-50">
                Get reseller pricing, minimum order quantities
                and ready-to-sell fashion collections designed
                for online and offline sellers.
              </p>
            </div>

            <div className="rounded-3xl bg-black/10 p-6">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-black">10+</p>
                  <p className="mt-1 text-[10px] text-emerald-100">
                    Piece Sets
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-black">₹300+</p>
                  <p className="mt-1 text-[10px] text-emerald-100">
                    Starting
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-black">24/7</p>
                  <p className="mt-1 text-[10px] text-emerald-100">
                    Ordering
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMode("RESELLER")}
                className="mt-6 w-full rounded-2xl bg-white py-3.5 text-xs font-black text-emerald-700"
              >
                Enter Reseller Zone →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <p className="text-xl font-black">
              AR<span className="text-emerald-600">FASHIONS</span>
            </p>

            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Fashion retail and wholesale made simple.
            </p>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest">
              Shop
            </p>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => setCategory("WOMEN")}
                className="block text-left text-xs text-zinc-500 hover:text-emerald-600"
              >
                Women
              </button>
              <button
                onClick={() => setCategory("MEN")}
                className="block text-left text-xs text-zinc-500 hover:text-emerald-600"
              >
                Men
              </button>
              <button
                onClick={() => setCategory("KIDS")}
                className="block text-left text-xs text-zinc-500 hover:text-emerald-600"
              >
                Kids
              </button>
              <button
                onClick={() => setCategory("UNISEX")}
                className="block text-left text-xs text-zinc-500 hover:text-emerald-600"
              >
                Accessories
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest">
              Business
            </p>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => setMode("RESELLER")}
                className="block text-left text-xs text-zinc-500 hover:text-emerald-600"
              >
                Reseller Zone
              </button>
              <button
                onClick={() => setMode("RESELLER")}
                className="block text-left text-xs text-zinc-500 hover:text-emerald-600"
              >
                Bulk Orders
              </button>
              <button
                onClick={() => setMode("RESELLER")}
                className="block text-left text-xs text-zinc-500 hover:text-emerald-600"
              >
                Become a Seller
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest">
              Help
            </p>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => alert("Contact page will be connected next.")}
                className="block text-left text-xs text-zinc-500 hover:text-emerald-600"
              >
                Contact Us
              </button>
              <button
                onClick={() => alert("Shipping information will be connected next.")}
                className="block text-left text-xs text-zinc-500 hover:text-emerald-600"
              >
                Shipping
              </button>
              <button
                onClick={() => alert("Returns information will be connected next.")}
                className="block text-left text-xs text-zinc-500 hover:text-emerald-600"
              >
                Returns
              </button>
              <button
                onClick={() => alert("Privacy page will be connected next.")}
                className="block text-left text-xs text-zinc-500 hover:text-emerald-600"
              >
                Privacy
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-black/5 py-5 text-center text-[10px] text-zinc-400">
          © 2026 AR Fashions. All rights reserved.
        </div>
      </footer>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 bg-white/95 px-2 py-2 backdrop-blur-xl sm:hidden">
        <div className="grid grid-cols-6 text-center">
          {[
            ["⌂", "Home", () => router.push("/")],
            [
              "⌕",
              "Search",
              () => {
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
                setTimeout(() => {
                  document.querySelector<HTMLInputElement>("input")?.focus();
                }, 300);
              },
            ],
            [
              "✦",
              "Reels",
              () =>
                router.push(
                  `/reels?mode=${mode.toLowerCase()}`,
                ),
            ],
            [
              "♡",
              "Wishlist",
              () => router.push("/wishlist"),
            ],
            ["🛍", "Cart", () => router.push("/cart")],
            ["👤", "Account", () => router.push("/account")],
          ].map(([icon, label, action]) => (
            <button
              key={label as string}
              type="button"
              onClick={action as () => void}
              className="py-1 text-zinc-500"
            >
              <span className="block text-lg">{icon as string}</span>
              <span className="text-[9px] font-semibold">
                {label as string}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

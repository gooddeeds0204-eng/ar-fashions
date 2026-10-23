"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

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

const TABS = [
  {
    key: "women",
    label: "Women",
    aliases: [
      "women",
      "woman",
      "womens",
      "ladies",
    ],
  },
  {
    key: "men",
    label: "Men",
    aliases: [
      "men",
      "man",
      "mens",
    ],
  },
  {
    key: "girl-kids",
    label: "Girl Kids",
    aliases: [
      "girl kids",
      "girls kids",
      "girl kid",
      "girls",
    ],
  },
  {
    key: "boy-kids",
    label: "Boy Kids",
    aliases: [
      "boy kids",
      "boys kids",
      "boy kid",
      "boys",
    ],
  },
] as const;

function normalizeName(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export default function CategoriesPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const requestedTab =
    searchParams.get(
      "tab",
    );

  const [
    categories,
    setCategories,
  ] = useState<
    StoreCategory[]
  >([]);

  const [
    activeTab,
    setActiveTab,
  ] = useState<
    | "women"
    | "men"
    | "girl-kids"
    | "boy-kids"
  >(
    requestedTab ===
      "men" ||
      requestedTab ===
        "girl-kids" ||
      requestedTab ===
        "boy-kids"
      ? requestedTab
      : "women",
  );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        const response =
          await fetch(
            "/api/storefront/categories",
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
          setCategories(
            Array.isArray(
              data.categories,
            )
              ? data.categories
              : [],
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      requestedTab ===
        "women" ||
      requestedTab ===
        "men" ||
      requestedTab ===
        "girl-kids" ||
      requestedTab ===
        "boy-kids"
    ) {
      setActiveTab(
        requestedTab,
      );
    }
  }, [requestedTab]);

  const activeConfig =
    TABS.find(
      (tab) =>
        tab.key ===
        activeTab,
    ) ?? TABS[0];

  const activeCategory =
    useMemo(() => {
      const wanted =
        new Set(
          activeConfig.aliases,
        );

      return (
        categories.find(
          (category) =>
            wanted.has(
              normalizeName(
                category.name,
              ) as any,
            ),
        ) ?? null
      );
    }, [
      categories,
      activeConfig,
    ]);

  function selectTab(
    key:
      | "women"
      | "men"
      | "girl-kids"
      | "boy-kids",
  ) {
    setActiveTab(
      key,
    );

    const next =
      new URL(
        window.location.href,
      );

    next.searchParams.set(
      "tab",
      key,
    );

    window.history.replaceState(
      {},
      "",
      next.pathname +
        next.search,
    );
  }

  function openSubcategory(
    subcategory:
      StoreCategoryChild,
  ) {
    router.push(
      `/?categoryId=${encodeURIComponent(
        subcategory.id,
      )}&categoryName=${encodeURIComponent(
        subcategory.name,
      )}`,
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF9F1] pb-24 text-[#211C18]">
      <header className="sticky top-0 z-40 border-b border-[#E8DED0] bg-[#FFFDF9]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="grid h-10 w-10 place-items-center rounded-full border border-[#E4D7C4] bg-white text-lg"
            aria-label="Back"
          >
            ←
          </button>

          <div className="min-w-0 flex-1">
            <BrandLogo />
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/cart",
              )
            }
            className="grid h-10 w-10 place-items-center rounded-full border border-[#E4D7C4] bg-white text-sm"
            aria-label="Cart"
          >
            ♡
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#7C3A45]">
            Browse collections
          </p>

          <h1 className="mt-1 font-serif text-[2rem] leading-none sm:text-[2.5rem]">
            Shop Categories
          </h1>

          <p className="mt-2 max-w-xl text-[11px] leading-5 text-[#7B7066]">
            Main category select chesi full subcategory list clean ga browse cheyyandi.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 rounded-2xl border border-[#E4D7C4] bg-white p-2 shadow-sm">
          {TABS.map(
            (tab) => {
              const active =
                tab.key ===
                activeTab;

              return (
                <button
                  key={
                    tab.key
                  }
                  type="button"
                  onClick={() =>
                    selectTab(
                      tab.key,
                    )
                  }
                  className={`rounded-xl px-2 py-3 text-[9px] font-black uppercase tracking-[0.04em] transition ${
                    active
                      ? "bg-[#031B14] text-[#FFF8EC]"
                      : "text-[#6B625A]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            },
          )}
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({
              length: 8,
            }).map(
              (_, index) => (
                <div
                  key={
                    index
                  }
                  className="animate-pulse overflow-hidden rounded-2xl border border-[#E4D7C4] bg-white"
                >
                  <div className="aspect-[4/5] bg-[#EFE5D8]" />
                  <div className="p-3">
                    <div className="h-3 w-2/3 rounded bg-[#EFE5D8]" />
                  </div>
                </div>
              ),
            )}
          </div>
        ) : activeCategory &&
          activeCategory.children
            .length > 0 ? (
          <>
            <div className="mt-7 flex items-end justify-between gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#9A8D80]">
                  Full collection
                </p>

                <h2 className="mt-1 font-serif text-2xl">
                  {
                    activeConfig.label
                  }
                </h2>
              </div>

              <span className="text-[9px] font-bold text-[#8A7E72]">
                {
                  activeCategory
                    .children.length
                }{" "}
                categories
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {activeCategory.children.map(
                (
                  subcategory,
                ) => (
                  <button
                    key={
                      subcategory.id
                    }
                    type="button"
                    onClick={() =>
                      openSubcategory(
                        subcategory,
                      )
                    }
                    className="group overflow-hidden rounded-[1.1rem] border border-[#E4D7C4] bg-white text-left shadow-[0_8px_24px_rgba(72,52,36,0.05)]"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-[#F1E6D8]">
                      {subcategory.imageUrl ? (
                        <img
                          src={
                            subcategory.imageUrl
                          }
                          alt={
                            subcategory.name
                          }
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#F2E7D9,#D8C5AE)]">
                          <span className="font-serif text-3xl text-[#6D5431]">
                            AS
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <p className="line-clamp-2 min-h-8 text-[10px] font-black uppercase leading-4 tracking-[0.03em] text-[#211C18]">
                        {
                          subcategory.name
                        }
                      </p>

                      <p className="mt-2 text-[8px] font-black uppercase tracking-[0.1em] text-[#7C3A45]">
                        Shop now →
                      </p>
                    </div>
                  </button>
                ),
              )}
            </div>
          </>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed border-[#DDD0BE] bg-white px-5 py-10 text-center">
            <p className="font-serif text-xl">
              No subcategories yet
            </p>

            <p className="mt-2 text-[10px] leading-5 text-[#8A7E72]">
              Admin lo ee main category ki subcategories add chesaka ikkada automatic ga kanipistayi.
            </p>
          </div>
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#031B14]/98 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 text-[#FFF8EC] shadow-[0_-14px_34px_rgba(0,0,0,0.18)] backdrop-blur-2xl sm:hidden">
        <div className="grid grid-cols-5">
          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-white/72"
          >
            <span className="text-base">⌂</span>
            <span className="text-[7px] font-bold">Home</span>
          </button>

          <button
            type="button"
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-[#FFF1D8]"
          >
            <span className="text-base">▦</span>
            <span className="text-[7px] font-bold">Categories</span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/reels",
              )
            }
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-white/72"
          >
            <span className="text-base">▷</span>
            <span className="text-[7px] font-bold">Reels</span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/cart",
              )
            }
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-white/72"
          >
            <span className="text-base">▢</span>
            <span className="text-[7px] font-bold">Cart</span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/account",
              )
            }
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 text-white/72"
          >
            <span className="text-base">○</span>
            <span className="text-[7px] font-bold">Account</span>
          </button>
        </div>
      </nav>
    </main>
  );
}

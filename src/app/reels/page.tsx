"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type Mode =
  | "RETAIL"
  | "RESELLER";

type Reel = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string;
  sortOrder: number;

  source:
    | "UPLOAD"
    | "INSTAGRAM";

  instagramEmbedUrl:
    | string
    | null;

  product: {
    id: string;
    name: string;
    sku: string | null;
    slug: string;

    retailPrice: number;

    resellerPrice:
      | number
      | null;

    salesMode:
      | "RETAIL"
      | "BULK"
      | "BOTH";

    image:
      | string
      | null;
  };
};

function money(
  value: number,
) {
  return `₹${Number(
    value || 0,
  ).toLocaleString(
    "en-IN",
  )}`;
}

function ReelVideo({
  reel,
}: {
  reel: Reel;
}) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  useEffect(() => {
    const video =
      videoRef.current;

    if (
      !video ||
      reel.source !==
        "UPLOAD"
    ) {
      return;
    }

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (
            entry.isIntersecting &&
            entry.intersectionRatio >=
              0.65
          ) {
            video
              .play()
              .catch(
                () => {},
              );
          } else {
            video.pause();
          }
        },
        {
          threshold: [
            0.25,
            0.65,
            0.9,
          ],
        },
      );

    observer.observe(
      video,
    );

    return () => {
      observer.disconnect();
    };
  }, [
    reel.id,
    reel.source,
  ]);

  if (
    reel.source ===
      "INSTAGRAM" &&
    reel.instagramEmbedUrl
  ) {
    return (
      <iframe
        src={
          reel.instagramEmbedUrl
        }
        title={
          reel.caption
        }
        className="pointer-events-none h-full w-full border-0 bg-black"
        allow="autoplay; encrypted-media"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={reel.url}
      poster={
        reel.thumbnailUrl ??
        undefined
      }
      muted
      loop
      playsInline
      preload="metadata"
      className="h-full w-full object-cover"
    />
  );
}

export default function ReelsPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const mode: Mode =
    searchParams.get(
      "mode",
    ) === "reseller"
      ? "RESELLER"
      : "RETAIL";

  const sharedReelId =
    searchParams.get(
      "reel",
    );

  const [
    reels,
    setReels,
  ] =
    useState<
      Reel[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    likedReels,
    setLikedReels,
  ] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(
          "ar-fashions-liked-reels",
        );

      if (!saved) {
        return;
      }

      const ids =
        JSON.parse(saved);

      if (
        Array.isArray(ids)
      ) {
        setLikedReels(
          new Set(
            ids.filter(
              (id) =>
                typeof id ===
                "string",
            ),
          ),
        );
      }
    } catch {
      // Ignore invalid local storage.
    }
  }, []);

  useEffect(() => {
    async function load() {
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

        setReels(
          Array.isArray(
            data.reels,
          )
            ? data.reels
            : [],
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load reels.",
        );
      } finally {
        setLoading(
          false,
        );
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (
      loading ||
      !sharedReelId ||
      reels.length === 0
    ) {
      return;
    }

    const exists =
      reels.some(
        (reel) =>
          reel.id ===
          sharedReelId,
      );

    if (!exists) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          document
            .getElementById(
              `reel-${sharedReelId}`,
            )
            ?.scrollIntoView({
              behavior:
                "auto",
              block:
                "start",
            });
        },
        100,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    loading,
    reels,
    sharedReelId,
  ]);

  function toggleLike(
    reelId: string,
  ) {
    setLikedReels(
      (current) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(
            reelId,
          )
        ) {
          next.delete(
            reelId,
          );
        } else {
          next.add(
            reelId,
          );
        }

        try {
          window.localStorage.setItem(
            "ar-fashions-liked-reels",
            JSON.stringify(
              Array.from(
                next,
              ),
            ),
          );
        } catch {
          // Like still works in current session.
        }

        return next;
      },
    );
  }

  async function shareReel(
    reel: Reel,
  ) {
    const shareUrl =
      `${window.location.origin}/reels` +
      `?mode=${mode.toLowerCase()}` +
      `&reel=${encodeURIComponent(
        reel.id,
      )}`;

    const shareData = {
      title:
        reel.product.name,
      text:
        `Check out ${reel.product.name} on AR Fashions`,
      url:
        shareUrl,
    };

    try {
      if (
        navigator.share
      ) {
        await navigator.share(
          shareData,
        );

        return;
      }

      if (
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(
          shareUrl,
        );

        window.alert(
          "Reel link copied ✅",
        );

        return;
      }

      window.prompt(
        "Copy this reel link:",
        shareUrl,
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name ===
          "AbortError"
      ) {
        return;
      }

      window.prompt(
        "Copy this reel link:",
        shareUrl,
      );
    }
  }

  function openProduct(
    reel: Reel,
  ) {
    router.push(
      `/products/${reel.product.id}?mode=${mode.toLowerCase()}`,
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />

          <p className="mt-4 text-sm text-zinc-400">
            Loading Fashion Reels...
          </p>
        </div>
      </main>
    );
  }

  if (
    error ||
    reels.length === 0
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-black">
            Fashion Reels
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            {error ||
              "No active reels available yet."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/?mode=${mode.toLowerCase()}`,
              )
            }
            className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-black text-black"
          >
            Back to Shop
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-black text-white">
      {/* FIXED HEADER */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 pb-4 pt-4">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-lg font-black backdrop-blur"
          >
            ←
          </button>

          <div className="pointer-events-none rounded-full bg-black/40 px-4 py-2 text-xs font-black backdrop-blur">
            FASHION REELS
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/cart",
              )
            }
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-sm backdrop-blur"
          >
            🛍
          </button>
        </div>
      </div>

      {/* VERTICAL REELS FEED */}
      <div className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain">
        {reels.map(
          (reel) => {
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
              <section
                key={
                  reel.id
                }
                id={`reel-${reel.id}`}
                className="relative mx-auto h-[100dvh] max-w-md snap-start snap-always overflow-hidden bg-zinc-950"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    openProduct(
                      reel,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                        "Enter" ||
                      event.key ===
                        " "
                    ) {
                      openProduct(
                        reel,
                      );
                    }
                  }}
                  className="absolute inset-0 cursor-pointer"
                >
                  <ReelVideo
                    reel={
                      reel
                    }
                  />
                </div>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/90" />

                {/* SOURCE BADGE */}
                <div className="pointer-events-none absolute left-4 top-20">
                  <span className="rounded-full bg-black/55 px-3 py-1.5 text-[9px] font-black backdrop-blur">
                    {reel.source ===
                    "INSTAGRAM"
                      ? "INSTAGRAM REEL"
                      : "AR FASHIONS"}
                  </span>
                </div>

                {/* REEL ACTIONS */}
                <div className="absolute right-3 bottom-48 z-30 flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={(
                      event,
                    ) => {
                      event.stopPropagation();

                      toggleLike(
                        reel.id,
                      );
                    }}
                    aria-label={
                      likedReels.has(
                        reel.id,
                      )
                        ? "Unlike reel"
                        : "Like reel"
                    }
                    className="flex flex-col items-center gap-1 text-white"
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-lg backdrop-blur ${
                        likedReels.has(
                          reel.id,
                        )
                          ? "bg-rose-500 text-white"
                          : "bg-black/55 text-white"
                      }`}
                    >
                      {likedReels.has(
                        reel.id,
                      )
                        ? "♥"
                        : "♡"}
                    </span>

                    <span className="text-[10px] font-black drop-shadow">
                      {likedReels.has(
                        reel.id,
                      )
                        ? "Liked"
                        : "Like"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(
                      event,
                    ) => {
                      event.stopPropagation();

                      void shareReel(
                        reel,
                      );
                    }}
                    aria-label="Share reel"
                    className="flex flex-col items-center gap-1 text-white"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-xl shadow-lg backdrop-blur">
                      ↗
                    </span>

                    <span className="text-[10px] font-black drop-shadow">
                      Share
                    </span>
                  </button>
                </div>

                {/* PRODUCT OVERLAY */}
                <div className="absolute inset-x-0 bottom-0 z-20 p-4 pb-7">
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                      Shop the Look
                    </p>

                    <h2 className="mt-2 max-w-[85%] text-xl font-black">
                      {
                        reel.product
                          .name
                      }
                    </h2>

                    {reel.caption ? (
                      <p className="mt-2 line-clamp-2 max-w-[90%] text-xs leading-5 text-zinc-300">
                        {
                          reel.caption
                        }
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={(
                      event,
                    ) => {
                      event.stopPropagation();

                      openProduct(
                        reel,
                      );
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/15 bg-black/65 p-3 text-left backdrop-blur-xl"
                  >
                    <div className="h-14 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                      {reel.product
                        .image ? (
                        <img
                          src={
                            reel.product
                              .image
                          }
                          alt={
                            reel.product
                              .name
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs">
                          AR
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black">
                        {
                          reel.product
                            .name
                        }
                      </p>

                      <p className="mt-1 text-sm font-black text-emerald-400">
                        {money(
                          price,
                        )}
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-4 py-2 text-[10px] font-black text-black">
                      Shop
                    </span>
                  </button>

                  <p className="mt-3 text-center text-[9px] font-semibold text-white/50">
                    Swipe up for next reel · Tap reel to shop
                  </p>
                </div>
              </section>
            );
          },
        )}
      </div>
    </main>
  );
}

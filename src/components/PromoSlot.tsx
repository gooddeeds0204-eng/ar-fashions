"use client";

import {
  useEffect,
  useState,
} from "react";

type Placement =
  | "HOME_MIDDLE"
  | "HOME_BOTTOM"
  | "SHOP_TOP"
  | "RESELLER_TOP";

type Audience =
  | "ALL"
  | "RETAIL"
  | "RESELLER";

type Promo = {
  id: string;
  title: string | null;
  subtitle: string | null;

  imageUrl: string | null;
  videoUrl: string | null;
  mobileImageUrl: string | null;
  mobileVideoUrl: string | null;

  buttonText: string | null;
  buttonUrl: string | null;

  contentType:
    | "IMAGE"
    | "VIDEO"
    | "GRAPHIC";

  backgroundColor: string | null;
  backgroundGradient: string | null;
  textColor: string | null;

  textAlign:
    | "LEFT"
    | "CENTER"
    | "RIGHT";

  overlayOpacity: number;
};

type Props = {
  placement: Placement;
  audience?: Audience;
  className?: string;
};

function safeHref(
  value: string | null,
) {
  if (!value) {
    return null;
  }

  const href = value.trim();

  if (href.startsWith("/")) {
    return href;
  }

  try {
    const url = new URL(href);

    if (
      url.protocol === "http:" ||
      url.protocol === "https:"
    ) {
      return href;
    }
  } catch {
    return null;
  }

  return null;
}

export default function PromoSlot({
  placement,
  audience = "ALL",
  className = "",
}: Props) {
  const [promos, setPromos] =
    useState<Promo[]>([]);

  const [index, setIndex] =
    useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPromos() {
      try {
        const params =
          new URLSearchParams({
            placement,
            audience,
          });

        const response =
          await fetch(
            `/api/banners?${params.toString()}`,
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
          setPromos(
            Array.isArray(
              data.banners,
            )
              ? data.banners
              : [],
          );

          setIndex(0);
        }
      } catch (error) {
        console.error(
          `Promo slot ${placement} failed:`,
          error,
        );
      }
    }

    loadPromos();

    return () => {
      cancelled = true;
    };
  }, [
    placement,
    audience,
  ]);

  useEffect(() => {
    if (promos.length <= 1) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setIndex(
            (current) =>
              (current + 1) %
              promos.length,
          );
        },
        6000,
      );

    return () =>
      window.clearInterval(timer);
  }, [promos.length]);

  if (promos.length === 0) {
    return null;
  }

  const promo =
    promos[
      index % promos.length
    ];

  const href =
    safeHref(
      promo.buttonUrl,
    );

  const alignment =
    promo.textAlign ===
    "CENTER"
      ? "items-center text-center"
      : promo.textAlign ===
          "RIGHT"
        ? "items-end text-right"
        : "items-start text-left";

  const background =
    promo.backgroundGradient ||
    promo.backgroundColor ||
    "#18181b";

  return (
    <section
      className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <div
        className="relative min-h-[220px] overflow-hidden rounded-3xl bg-zinc-950 sm:min-h-[260px]"
        style={{
          background,
        }}
      >
        {promo.contentType ===
          "IMAGE" && (
          <>
            {promo.imageUrl && (
              <img
                src={
                  promo.imageUrl
                }
                alt={
                  promo.title ??
                  "AR Fashions promotion"
                }
                className={`absolute inset-0 h-full w-full object-cover ${
                  promo.mobileImageUrl
                    ? "hidden sm:block"
                    : ""
                }`}
              />
            )}

            {promo.mobileImageUrl && (
              <img
                src={
                  promo.mobileImageUrl
                }
                alt={
                  promo.title ??
                  "AR Fashions promotion"
                }
                className="absolute inset-0 h-full w-full object-cover sm:hidden"
              />
            )}

            {!promo.imageUrl &&
              promo.mobileImageUrl && (
                <img
                  src={
                    promo.mobileImageUrl
                  }
                  alt={
                    promo.title ??
                    "AR Fashions promotion"
                  }
                  className="absolute inset-0 hidden h-full w-full object-cover sm:block"
                />
              )}
          </>
        )}

        {promo.contentType ===
          "VIDEO" && (
          <>
            {promo.videoUrl && (
              <video
                key={`${promo.id}-desktop`}
                src={
                  promo.videoUrl
                }
                muted
                autoPlay
                loop
                playsInline
                className={`absolute inset-0 h-full w-full object-cover ${
                  promo.mobileVideoUrl
                    ? "hidden sm:block"
                    : ""
                }`}
              />
            )}

            {promo.mobileVideoUrl && (
              <video
                key={`${promo.id}-mobile`}
                src={
                  promo.mobileVideoUrl
                }
                muted
                autoPlay
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover sm:hidden"
              />
            )}

            {!promo.videoUrl &&
              promo.mobileVideoUrl && (
                <video
                  key={`${promo.id}-mobile-fallback`}
                  src={
                    promo.mobileVideoUrl
                  }
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="absolute inset-0 hidden h-full w-full object-cover sm:block"
                />
              )}
          </>
        )}

        <div
          className="absolute inset-0 bg-black"
          style={{
            opacity:
              Math.min(
                100,
                Math.max(
                  0,
                  promo.overlayOpacity ??
                    40,
                ),
              ) / 100,
          }}
        />

        <div
          className={`absolute inset-0 z-10 flex flex-col justify-center p-6 sm:p-10 ${alignment}`}
          style={{
            color:
              promo.textColor ||
              "#ffffff",
          }}
        >
          {promo.title && (
            <h2 className="max-w-2xl text-2xl font-black leading-tight sm:text-4xl">
              {promo.title}
            </h2>
          )}

          {promo.subtitle && (
            <p className="mt-3 max-w-xl text-sm font-medium opacity-90 sm:text-base">
              {promo.subtitle}
            </p>
          )}

          {promo.buttonText &&
            href && (
              <a
                href={href}
                className="mt-5 inline-flex w-fit rounded-xl bg-white px-5 py-3 text-xs font-black text-zinc-950 shadow-lg"
              >
                {
                  promo.buttonText
                }
              </a>
            )}
        </div>

        {promos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {promos.map(
              (
                item,
                itemIndex,
              ) => (
                <button
                  key={
                    item.id
                  }
                  type="button"
                  onClick={() =>
                    setIndex(
                      itemIndex,
                    )
                  }
                  aria-label={`Show promo ${
                    itemIndex + 1
                  }`}
                  className={`h-2.5 rounded-full transition-all ${
                    itemIndex ===
                    index
                      ? "w-7 bg-white"
                      : "w-2.5 bg-white/50"
                  }`}
                />
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type CampaignVariant = {
  id: string;
  stock: number;
  color: {
    id: string;
    name: string;
  };
  size: {
    id: string;
    name: string;
  };
};

type CampaignOffer = {
  id: string;
  title: string;
  subtitle: string | null;
  announcementText: string | null;
  badgeText: string;
  buttonText: string;
  requiredReferrals: number;
  whatsappShareRequired: boolean;
  whatsappGroupJoinRequired: boolean;
  whatsappGroupUrl: string | null;
  startsAt: string;
  endsAt: string;
  showCountdown: boolean;
  maxClaims: number | null;
  claimedCount: number;
  deliveryChargeEnabled: boolean;
  useStoreDeliveryRules: boolean;
  fixedDeliveryCharge: number | null;
  codAllowed: boolean;
  onlinePaymentAllowed: boolean;
  status:
    | "SCHEDULED"
    | "LIVE"
    | "ENDED"
    | "SOLD_OUT";
  availableStock: number;
  product: {
    id: string;
    name: string;
    slug: string;
    retailPrice: number;
    mrp: number | null;
    media: Array<{
      id: string;
      type: "IMAGE" | "VIDEO";
      url: string;
      thumbnailUrl: string | null;
      altText: string | null;
    }>;
    variants: CampaignVariant[];
  };
  progress: {
    loggedIn: boolean;
    referralCode: string | null;
    qualifiedReferrals: number;
    requiredReferrals: number;
    groupJoinAcknowledged: boolean;
    referralsComplete: boolean;
    groupComplete: boolean;
    alreadyClaimed: boolean;
    claimInProgress: boolean;
    unlocked: boolean;
  };
};

type StoredCartItem = {
  campaignOfferId?: string;
};

function timeParts(target: string, now: number) {
  const remaining = Math.max(
    0,
    new Date(target).getTime() - now,
  );

  const totalSeconds = Math.floor(remaining / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function readStoredCart() {
  try {
    const raw = localStorage.getItem(
      "ar-fashions-cart",
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export default function CampaignOfferSection() {
  const router = useRouter();

  const [campaign, setCampaign] =
    useState<CampaignOffer | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [now, setNow] =
    useState(0);

  const [rewardInCart, setRewardInCart] =
    useState(false);

  const [
    variantPickerOpen,
    setVariantPickerOpen,
  ] = useState(false);

  const loadCampaign =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/campaign-offers",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Failed to load offer.",
          );
        }

        setCampaign(
          data.campaign ?? null,
        );
      } catch (error) {
        console.error(
          "Campaign offer load failed:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    const tick = () =>
      setNow(Date.now());

    const kickoff =
      window.setTimeout(
        tick,
        0,
      );

    const timer =
      window.setInterval(
        tick,
        1000,
      );

    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const url =
      new URL(
        window.location.href,
      );

    const referralCode =
      url.searchParams.get("ref");

    if (!referralCode) {
      return;
    }

    const seenKey =
      "ar-campaign-ref-" +
      referralCode;

    if (
      sessionStorage.getItem(
        seenKey,
      ) === "1"
    ) {
      return;
    }

    sessionStorage.setItem(
      seenKey,
      "1",
    );

    void fetch(
      "/api/campaign-offers",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        credentials:
          "same-origin",
        body: JSON.stringify({
          action: "visit",
          referralCode,
        }),
      },
    )
      .then(() => loadCampaign())
      .catch((error) =>
        console.error(
          "Campaign referral visit failed:",
          error,
        ),
      );

    url.searchParams.delete("ref");

    window.history.replaceState(
      {},
      "",
      url.pathname +
        url.search +
        url.hash,
    );
  }, [loadCampaign]);

  useEffect(() => {
    if (!campaign) return;

    const inCart =
      readStoredCart().some(
        (
          item:
            StoredCartItem,
        ) =>
          item.campaignOfferId ===
          campaign.id,
      );

    const timer =
      window.setTimeout(
        () =>
          setRewardInCart(
            inCart,
          ),
        0,
      );

    return () =>
      window.clearTimeout(timer);
  }, [campaign]);

  useEffect(() => {
    if (
      !campaign ||
      !campaign.progress.loggedIn ||
      campaign.status !== "LIVE" ||
      campaign.progress.alreadyClaimed ||
      campaign.progress.claimInProgress
    ) {
      return;
    }

    const poller = window.setInterval(
      () => {
        void loadCampaign();
      },
      5000,
    );

    return () =>
      window.clearInterval(poller);
  }, [
    campaign,
    loadCampaign,
  ]);

  const countdown = useMemo(() => {
    if (
      !campaign ||
      now === 0
    ) {
      return null;
    }

    return timeParts(
      campaign.status ===
        "SCHEDULED"
        ? campaign.startsAt
        : campaign.endsAt,
      now,
    );
  }, [campaign, now]);

  useEffect(() => {
    if (
      !campaign ||
      !campaign.progress.unlocked ||
      campaign.progress.alreadyClaimed ||
      campaign.progress.claimInProgress ||
      rewardInCart
    ) {
      return;
    }

    const availableVariants =
      campaign.product.variants.filter(
        (variant) =>
          variant.stock > 0,
      );

    if (availableVariants.length === 0) {
      return;
    }

    const timer = window.setTimeout(
      () => {
        if (availableVariants.length === 1) {
          const variant =
            availableVariants[0];

          const current =
            readStoredCart();

          const alreadyThere =
            current.some(
              (
                item:
                  StoredCartItem,
              ) =>
                item.campaignOfferId ===
                campaign.id,
            );

          if (alreadyThere) {
            setRewardInCart(true);
            return;
          }

          const media =
            campaign.product.media.find(
              (item) =>
                item.type === "IMAGE",
            ) ??
            campaign.product.media[0];

          const next =
            current.filter(
              (
                item:
                  StoredCartItem,
              ) =>
                item.campaignOfferId !==
                campaign.id,
            );

          next.push({
            id:
              "campaign-" +
              campaign.id +
              "-" +
              variant.id,
            productId:
              campaign.product.id,
            productName:
              campaign.product.name,
            image:
              media?.thumbnailUrl ??
              media?.url ??
              null,
            variantId:
              variant.id,
            colorId:
              variant.color.id,
            colorName:
              variant.color.name,
            sizeId:
              variant.size.id,
            sizeName:
              variant.size.name,
            price: 0,
            quantity: 1,
            mode: "RETAIL",
            campaignOfferId:
              campaign.id,
            campaignReward: true,
            campaignDeliveryChargeEnabled:
              campaign.deliveryChargeEnabled,
            campaignUseStoreDeliveryRules:
              campaign.useStoreDeliveryRules,
            campaignFixedDeliveryCharge:
              campaign.fixedDeliveryCharge,
            campaignCodAllowed:
              campaign.codAllowed,
            campaignOnlinePaymentAllowed:
              campaign.onlinePaymentAllowed,
          });

          localStorage.setItem(
            "ar-fashions-cart",
            JSON.stringify(next),
          );

          setRewardInCart(true);

          window.dispatchEvent(
            new Event(
              "ar-fashions-cart-updated",
            ),
          );

          return;
        }

        setVariantPickerOpen(true);
      },
      0,
    );

    return () =>
      window.clearTimeout(timer);
  }, [
    campaign,
    rewardInCart,
  ]);

  if (
    loading ||
    !campaign
  ) {
    return null;
  }

  const activeCampaign =
    campaign;

  const image =
    activeCampaign.product.media.find(
      (item) =>
        item.type === "IMAGE",
    ) ??
    activeCampaign.product.media[0];

  const progressPercent =
    Math.min(
      100,
      Math.round(
        (
          activeCampaign.progress
            .qualifiedReferrals /
          Math.max(
            1,
            activeCampaign
              .requiredReferrals,
          )
        ) *
          100,
      ),
    );

  const remainingClaims =
    activeCampaign.maxClaims === null
      ? null
      : Math.max(
          0,
          activeCampaign.maxClaims -
            activeCampaign.claimedCount,
        );

  const deliveryText =
    !activeCampaign
      .deliveryChargeEnabled
      ? "Free delivery"
      : activeCampaign
          .useStoreDeliveryRules
        ? "Normal delivery"
        : "Delivery ₹" +
          Number(
            activeCampaign
              .fixedDeliveryCharge ??
              0,
          ).toLocaleString(
            "en-IN",
          );

  function addRewardToCart(
    variant: CampaignVariant,
  ) {
    const current =
      readStoredCart();

    const next =
      current.filter(
        (
          item:
            StoredCartItem,
        ) =>
          item.campaignOfferId !==
          activeCampaign.id,
      );

    next.push({
      id:
        "campaign-" +
        activeCampaign.id +
        "-" +
        variant.id,
      productId:
        activeCampaign.product.id,
      productName:
        activeCampaign.product.name,
      image:
        image?.thumbnailUrl ??
        image?.url ??
        null,
      variantId:
        variant.id,
      colorId:
        variant.color.id,
      colorName:
        variant.color.name,
      sizeId:
        variant.size.id,
      sizeName:
        variant.size.name,
      price: 0,
      quantity: 1,
      mode: "RETAIL",
      campaignOfferId:
        activeCampaign.id,
      campaignReward: true,
      campaignDeliveryChargeEnabled:
        activeCampaign
          .deliveryChargeEnabled,
      campaignUseStoreDeliveryRules:
        activeCampaign
          .useStoreDeliveryRules,
      campaignFixedDeliveryCharge:
        activeCampaign
          .fixedDeliveryCharge,
      campaignCodAllowed:
        activeCampaign.codAllowed,
      campaignOnlinePaymentAllowed:
        activeCampaign
          .onlinePaymentAllowed,
    });

    localStorage.setItem(
      "ar-fashions-cart",
      JSON.stringify(next),
    );

    setRewardInCart(true);
    setVariantPickerOpen(false);

    window.dispatchEvent(
      new Event(
        "ar-fashions-cart-updated",
      ),
    );
  }

  function handleUnlockedReward() {
    if (rewardInCart) {
      router.push("/cart");
      return;
    }

    const variants =
      activeCampaign.product
        .variants.filter(
          (variant) =>
            variant.stock > 0,
        );

    if (variants.length === 1) {
      addRewardToCart(
        variants[0],
      );
      return;
    }

    setVariantPickerOpen(
      true,
    );
  }

  async function shareOffer() {
    if (
      !activeCampaign.progress
        .loggedIn
    ) {
      router.push("/login");
      return;
    }

    if (
      activeCampaign.status !==
      "LIVE"
    ) {
      return;
    }

    try {
      setActionLoading(true);

      const response =
        await fetch(
          "/api/campaign-offers",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              action: "share",
              campaignId:
                activeCampaign.id,
            }),
          },
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to create share link.",
        );
      }

      const shareUrl =
        window.location.origin +
        "/?ref=" +
        encodeURIComponent(
          data.referralCode,
        ) +
        "#campaign-offer";

      const text = [
        activeCampaign.title,
        activeCampaign.subtitle ||
          "Open this AS Fashions offer.",
        "Open my link:",
        shareUrl,
      ].join("\n");

      window.location.href =
        "https://wa.me/?text=" +
        encodeURIComponent(text);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to share offer.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function joinGroup() {
    if (
      !activeCampaign.progress
        .loggedIn
    ) {
      router.push("/login");
      return;
    }

    if (
      activeCampaign
        .whatsappGroupUrl
    ) {
      window.open(
        activeCampaign
          .whatsappGroupUrl,
        "_blank",
        "noopener,noreferrer",
      );
    }

    try {
      setActionLoading(true);

      const response =
        await fetch(
          "/api/campaign-offers",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              action: "group-ack",
              campaignId:
                activeCampaign.id,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to update group step.",
        );
      }

      await loadCampaign();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to update group step.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  const unlocked =
    activeCampaign.progress
      .unlocked;

  const compactTime =
    countdown
      ? [
          countdown.days > 0
            ? String(countdown.days) +
              "d"
            : null,
          pad(
            countdown.hours,
          ) +
            ":" +
            pad(
              countdown.minutes,
            ) +
            ":" +
            pad(
              countdown.seconds,
            ),
        ]
          .filter(Boolean)
          .join(" ")
      : "";

  return (
    <section
      id="campaign-offer"
      className="mx-auto max-w-7xl px-4 pb-5 sm:px-6 lg:px-8"
    >
      {activeCampaign
        .announcementText ? (
        <div className="mb-2 flex min-h-8 items-center justify-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#06261D] px-3 text-center text-[7px] font-black uppercase tracking-[0.16em] text-[#DFC995]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
          {
            activeCampaign
              .announcementText
          }
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#06261D] text-white shadow-[0_14px_34px_rgba(0,0,0,0.14)]">
        <div className="flex gap-3 p-3 sm:items-center sm:p-4">
          <div className="relative h-[112px] w-[88px] shrink-0 overflow-hidden rounded-[0.9rem] bg-[#15372D] sm:h-[126px] sm:w-[100px]">
            {image?.type ===
            "VIDEO" ? (
              <video
                src={image.url}
                muted
                autoPlay
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : image ? (
              <img
                src={image.url}
                alt={
                  image.altText ??
                  activeCampaign
                    .product.name
                }
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center font-serif text-3xl text-[#D9C29A]">
                AS
              </div>
            )}

            <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[6px] font-black uppercase tracking-[0.1em] backdrop-blur">
              {
                activeCampaign
                  .badgeText
              }
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[7px] font-black uppercase tracking-[0.18em] text-[#D4AF37]">
                  Free Gift Offer
                </p>

                <h2 className="mt-1 truncate font-serif text-[1.45rem] leading-none">
                  {
                    activeCampaign
                      .title
                  }
                </h2>

                <p className="mt-1 truncate text-[9px] text-white/48">
                  {
                    activeCampaign
                      .product.name
                  }{" "}
                  <span className="line-through">
                    ₹
                    {activeCampaign.product.retailPrice.toLocaleString(
                      "en-IN",
                    )}
                  </span>
                  <span className="ml-1 font-black text-[#D4AF37]">
                    FREE
                  </span>
                </p>
              </div>

              {activeCampaign
                .showCountdown &&
              compactTime ? (
                <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-2 text-right">
                  <p className="text-[6px] font-black uppercase tracking-[0.12em] text-white/35">
                    {activeCampaign.status ===
                    "SCHEDULED"
                      ? "Opens"
                      : "Ends"}
                  </p>
                  <p className="mt-0.5 text-[10px] font-black text-[#F4E7C8]">
                    {compactTime}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[8px] font-bold">
                <span className="text-white/52">
                  {
                    activeCampaign
                      .progress
                      .qualifiedReferrals
                  }
                  /
                  {
                    activeCampaign
                      .requiredReferrals
                  }{" "}
                  friends
                </span>
                <span className="text-[#D4AF37]">
                  {progressPercent}%
                </span>
              </div>

              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#D4AF37] transition-all duration-500"
                  style={{
                    width:
                      progressPercent +
                      "%",
                  }}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {activeCampaign.progress
                .alreadyClaimed ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/my-orders",
                    )
                  }
                  className="min-h-10 w-full rounded-xl bg-emerald-300/15 px-4 text-[9px] font-black uppercase tracking-[0.07em] text-emerald-200"
                >
                  Reward Claimed ✓ · View Order
                </button>
              ) : activeCampaign
                  .progress
                  .claimInProgress ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/my-orders",
                    )
                  }
                  className="min-h-10 w-full rounded-xl border border-[#D9C29A]/25 bg-white/[0.05] px-4 text-[9px] font-black uppercase tracking-[0.07em] text-[#E5D0AC]"
                >
                  Claim Started · View Order
                </button>
              ) : !unlocked ? (
                <>
                  <button
                    type="button"
                    disabled={
                      actionLoading ||
                      activeCampaign
                        .status !==
                        "LIVE"
                    }
                    onClick={
                      shareOffer
                    }
                    className="min-h-9 flex-1 rounded-xl bg-[#25D366] px-3 text-[8px] font-black uppercase tracking-[0.06em] text-[#052014] disabled:opacity-40"
                  >
                    {activeCampaign
                      .progress
                      .loggedIn
                      ? "Share on WhatsApp"
                      : "Login to Unlock"}
                  </button>

                  {activeCampaign
                    .whatsappGroupJoinRequired ? (
                    <button
                      type="button"
                      disabled={
                        actionLoading ||
                        activeCampaign
                          .status !==
                          "LIVE"
                      }
                      onClick={
                        joinGroup
                      }
                      className="min-h-9 flex-1 rounded-xl border border-[#D9C29A]/25 bg-white/[0.04] px-3 text-[8px] font-black uppercase tracking-[0.05em] text-[#E5D0AC] disabled:opacity-40"
                    >
                      {activeCampaign
                        .progress
                        .groupJoinAcknowledged
                        ? "Group ✓"
                        : "Join Group"}
                    </button>
                  ) : null}
                </>
              ) : (
                <button
                  type="button"
                  onClick={
                    handleUnlockedReward
                  }
                  className="min-h-10 w-full rounded-xl bg-[#D4AF37] px-4 text-[9px] font-black uppercase tracking-[0.07em] text-[#031B14]"
                >
                  {rewardInCart
                    ? "Reward in Cart · View Cart →"
                    : activeCampaign
                          .product
                          .variants
                          .length > 1
                      ? "Unlocked · Choose Size →"
                      : "Unlocked · Add Free Gift →"}
                </button>
              )}
            </div>
          </div>
        </div>

        {variantPickerOpen &&
        unlocked &&
        !rewardInCart ? (
          <div className="border-t border-white/10 px-3 py-3 sm:px-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#D9C29A]">
                Select colour / size
              </p>

              <button
                type="button"
                onClick={() =>
                  setVariantPickerOpen(
                    false,
                  )
                }
                className="text-[9px] text-white/40"
              >
                Close
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {activeCampaign.product.variants
                .filter(
                  (variant) =>
                    variant.stock >
                    0,
                )
                .map(
                  (variant) => (
                    <button
                      key={
                        variant.id
                      }
                      type="button"
                      onClick={() =>
                        addRewardToCart(
                          variant,
                        )
                      }
                      className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-2 text-[8px] font-bold text-white/75"
                    >
                      {
                        variant
                          .color
                          .name
                      }{" "}
                      ·{" "}
                      {
                        variant.size
                          .name
                      }
                    </button>
                  ),
                )}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.07] px-3 py-2 text-[6.5px] font-bold uppercase tracking-[0.08em] text-white/35 sm:px-4">
          <span>
            {deliveryText}
          </span>

          {remainingClaims !==
          null ? (
            <span>
              {remainingClaims} left
            </span>
          ) : null}

          <span>
            {
              activeCampaign
                .availableStock
            }{" "}
            pcs
          </span>

          {rewardInCart ? (
            <span className="text-emerald-300">
              ✓ Added to cart
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

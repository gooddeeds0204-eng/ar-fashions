"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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
  };
  progress: {
    loggedIn: boolean;
    referralCode: string | null;
    qualifiedReferrals: number;
    requiredReferrals: number;
    groupJoinAcknowledged: boolean;
    referralsComplete: boolean;
    groupComplete: boolean;
    unlocked: boolean;
  };
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

export default function CampaignOfferSection() {
  const router = useRouter();
  const [campaign, setCampaign] =
    useState<CampaignOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [now, setNow] = useState(0);

  const loadCampaign = useCallback(async () => {
    try {
      const response = await fetch("/api/campaign-offers", {
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to load offer.",
        );
      }

      setCampaign(data.campaign ?? null);
    } catch (error) {
      console.error("Campaign offer load failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    const tick = () => setNow(Date.now());

    const kickoff = window.setTimeout(
      tick,
      0,
    );

    const timer = window.setInterval(
      tick,
      1000,
    );

    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const referralCode = url.searchParams.get("ref");

    if (!referralCode) {
      return;
    }

    const seenKey = "ar-campaign-ref-" + referralCode;

    if (sessionStorage.getItem(seenKey) === "1") {
      return;
    }

    sessionStorage.setItem(seenKey, "1");

    void fetch("/api/campaign-offers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        action: "visit",
        referralCode,
      }),
    })
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
      url.pathname + url.search + url.hash,
    );
  }, [loadCampaign]);

  const countdown = useMemo(() => {
    if (!campaign || now === 0) return null;

    return timeParts(
      campaign.status === "SCHEDULED"
        ? campaign.startsAt
        : campaign.endsAt,
      now,
    );
  }, [campaign, now]);

  if (loading || !campaign) {
    return null;
  }

  const activeCampaign = campaign;

  const image =
    campaign.product.media.find(
      (item) => item.type === "IMAGE",
    ) ?? campaign.product.media[0];

  const remainingClaims =
    campaign.maxClaims === null
      ? null
      : Math.max(
          0,
          campaign.maxClaims - campaign.claimedCount,
        );

  const deliveryText =
    !campaign.deliveryChargeEnabled
      ? "FREE DELIVERY"
      : campaign.useStoreDeliveryRules
        ? "DELIVERY AS PER STORE RULES"
        : "DELIVERY ₹" +
          Number(
            campaign.fixedDeliveryCharge ?? 0,
          ).toLocaleString("en-IN");

  const progressPercent = Math.min(
    100,
    Math.round(
      (campaign.progress.qualifiedReferrals /
        Math.max(1, campaign.requiredReferrals)) *
        100,
    ),
  );

  async function shareOffer() {
    if (!activeCampaign.progress.loggedIn) {
      router.push("/login");
      return;
    }

    if (activeCampaign.status !== "LIVE") {
      return;
    }

    try {
      setActionLoading(true);

      const response = await fetch("/api/campaign-offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "share",
          campaignId: activeCampaign.id,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to create share link.",
        );
      }

      const shareUrl =
        window.location.origin +
        "/?ref=" +
        encodeURIComponent(data.referralCode) +
        "#campaign-offer";

      const text = [
        activeCampaign.title,
        activeCampaign.subtitle ||
          "Open this AR Fashions offer.",
        "Open my link to help me unlock the offer:",
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
    if (!activeCampaign.progress.loggedIn) {
      router.push("/login");
      return;
    }

    if (activeCampaign.whatsappGroupUrl) {
      window.open(
        activeCampaign.whatsappGroupUrl,
        "_blank",
        "noopener,noreferrer",
      );
    }

    try {
      setActionLoading(true);

      const response = await fetch("/api/campaign-offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "group-ack",
          campaignId: activeCampaign.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to update group step.",
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

  return (
    <section
      id="campaign-offer"
      className="border-y border-[#D9C29A]/20 bg-[#031B14] px-4 py-8 text-[#FFF8EC] sm:px-6 sm:py-12"
    >
      <div className="mx-auto max-w-7xl">
        {campaign.announcementText ? (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-full border border-[#D9C29A]/20 bg-[#D9C29A]/[0.08] px-4 py-2 text-center text-[8px] font-black uppercase tracking-[0.18em] text-[#E5D0AC]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
            {campaign.announcementText}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[radial-gradient(circle_at_80%_8%,rgba(212,175,55,0.16),transparent_30%),linear-gradient(145deg,#0B3528,#031B14_68%)] shadow-[0_28px_80px_rgba(0,0,0,0.24)]">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[330px] overflow-hidden bg-[#102B22] sm:min-h-[440px]">
              {image?.type === "VIDEO" ? (
                <video
                  src={image.url}
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : image ? (
                <img
                  src={image.url}
                  alt={image.altText ?? campaign.product.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(145deg,#183D30,#09231B)] font-serif text-7xl text-[#D9C29A]">
                  AS
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[#031B14]/85 via-transparent to-black/10" />

              <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] backdrop-blur">
                {campaign.badgeText}
              </div>

              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#D9C29A]">
                  Selected Reward
                </p>
                <h3 className="mt-2 font-serif text-3xl leading-none">
                  {campaign.product.name}
                </h3>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-white/55 line-through">
                    ₹
                    {campaign.product.retailPrice.toLocaleString(
                      "en-IN",
                    )}
                  </span>
                  <span className="rounded-full bg-[#D4AF37] px-3 py-1 text-[10px] font-black text-[#031B14]">
                    PRODUCT ₹0
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8 lg:p-10">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">
                Limited Campaign
              </p>

              <h2 className="mt-3 font-serif text-[2.45rem] leading-[0.95] sm:text-[3.2rem]">
                {campaign.title}
              </h2>

              {campaign.subtitle ? (
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/58">
                  {campaign.subtitle}
                </p>
              ) : null}

              {campaign.showCountdown && countdown ? (
                <div className="mt-6">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/42">
                    {campaign.status === "SCHEDULED"
                      ? "Opens in"
                      : campaign.status === "LIVE"
                        ? "Ends in"
                        : "Campaign"}
                  </p>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[
                      [countdown.days, "Days"],
                      [countdown.hours, "Hours"],
                      [countdown.minutes, "Min"],
                      [countdown.seconds, "Sec"],
                    ].map(([value, label]) => (
                      <div
                        key={String(label)}
                        className="rounded-2xl border border-white/10 bg-white/[0.05] px-2 py-3 text-center"
                      >
                        <div className="font-serif text-2xl text-[#FFF8EC]">
                          {pad(Number(value))}
                        </div>
                        <div className="mt-1 text-[7px] font-black uppercase tracking-wider text-white/35">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-black/15 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/40">
                      Friend Unlock
                    </p>
                    <p className="mt-1 text-sm font-black">
                      {campaign.progress.qualifiedReferrals} /{" "}
                      {campaign.requiredReferrals} friends opened your link
                    </p>
                  </div>

                  <span className="text-lg font-black text-[#D4AF37]">
                    {progressPercent}%
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#D4AF37] transition-all duration-500"
                    style={{
                      width: progressPercent + "%",
                    }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-[0.08em]">
                  <span
                    className={
                      campaign.progress.referralsComplete
                        ? "rounded-full bg-emerald-400/15 px-3 py-1.5 text-emerald-300"
                        : "rounded-full bg-white/[0.06] px-3 py-1.5 text-white/45"
                    }
                  >
                    {campaign.progress.referralsComplete
                      ? "✓ Friends Complete"
                      : "Share with " + campaign.requiredReferrals}
                  </span>

                  {campaign.whatsappGroupJoinRequired ? (
                    <span
                      className={
                        campaign.progress.groupJoinAcknowledged
                          ? "rounded-full bg-emerald-400/15 px-3 py-1.5 text-emerald-300"
                          : "rounded-full bg-white/[0.06] px-3 py-1.5 text-white/45"
                      }
                    >
                      {campaign.progress.groupJoinAcknowledged
                        ? "✓ Group Step Done"
                        : "Join WhatsApp Group"}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={
                    actionLoading ||
                    campaign.status !== "LIVE"
                  }
                  onClick={shareOffer}
                  className="rounded-2xl bg-[#25D366] px-4 py-4 text-[10px] font-black uppercase tracking-[0.08em] text-[#052014] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {campaign.progress.loggedIn
                    ? "Share on WhatsApp →"
                    : "Login to Unlock →"}
                </button>

                {campaign.whatsappGroupJoinRequired ? (
                  <button
                    type="button"
                    disabled={
                      actionLoading ||
                      campaign.status !== "LIVE"
                    }
                    onClick={joinGroup}
                    className="rounded-2xl border border-[#D9C29A]/25 bg-[#D9C29A]/[0.08] px-4 py-4 text-[10px] font-black uppercase tracking-[0.08em] text-[#E5D0AC] disabled:opacity-40"
                  >
                    {campaign.progress.groupJoinAcknowledged
                      ? "Group Step ✓"
                      : "Join WhatsApp Group →"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/products/" + campaign.product.id,
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-[10px] font-black uppercase tracking-[0.08em] text-white/75"
                  >
                    View Product →
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[8px] font-bold uppercase tracking-[0.1em] text-white/38">
                <span>{deliveryText}</span>
                {remainingClaims !== null ? (
                  <span>{remainingClaims} claims left</span>
                ) : null}
                <span>{campaign.availableStock} pcs available</span>
              </div>

              {campaign.status === "SCHEDULED" ? (
                <p className="mt-4 rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06] px-4 py-3 text-[10px] font-semibold leading-5 text-[#E5D0AC]">
                  Sharing opens automatically when the campaign timer reaches
                  zero.
                </p>
              ) : null}

              {campaign.status === "SOLD_OUT" ? (
                <p className="mt-4 rounded-xl border border-red-300/15 bg-red-300/[0.06] px-4 py-3 text-[10px] font-semibold text-red-100">
                  All campaign claims have been used.
                </p>
              ) : null}

              {campaign.progress.unlocked ? (
                <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-4">
                  <p className="text-sm font-black text-emerald-200">
                    Reward unlocked ✓
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-white/48">
                    Your referral and WhatsApp steps are complete. Your
                    protected claim checkout is the next campaign step.
                  </p>
                </div>
              ) : null}

              <p className="mt-5 text-[8px] leading-4 text-white/30">
                Unique visitors are counted once per campaign. Self-referrals
                and repeat opens do not increase progress.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

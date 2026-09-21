"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type ProductOption = {
  id: string;
  name: string;
  status: string;
  retailPrice: number;
  media: { url: string; type: string }[];
  variants: {
    id: string;
    stock: number;
    color: { name: string };
    size: { name: string };
  }[];
};

type Campaign = {
  id: string;
  title: string;
  subtitle: string | null;
  announcementText: string | null;
  badgeText: string;
  buttonText: string;
  productId: string;
  variantIds: string[];
  requiredReferrals: number;
  whatsappShareRequired: boolean;
  whatsappGroupJoinRequired: boolean;
  whatsappGroupUrl: string | null;
  startsAt: string;
  endsAt: string;
  showCountdown: boolean;
  maxClaims: number | null;
  oneClaimPerCustomer: boolean;
  deliveryChargeEnabled: boolean;
  useStoreDeliveryRules: boolean;
  fixedDeliveryCharge: number | null;
  codAllowed: boolean;
  onlinePaymentAllowed: boolean;
  isActive: boolean;
  isArchived: boolean;
  qualifiedReferralCount: number;
  claimedCount: number;
  product: {
    id: string;
    name: string;
    slug: string;
    retailPrice: number;
    media: { url: string; type: string }[];
  };
};

type FormState = {
  title: string;
  subtitle: string;
  announcementText: string;
  badgeText: string;
  buttonText: string;
  productId: string;
  variantIds: string[];
  requiredReferrals: string;
  whatsappShareRequired: boolean;
  whatsappGroupJoinRequired: boolean;
  whatsappGroupUrl: string;
  startsAt: string;
  endsAt: string;
  showCountdown: boolean;
  maxClaims: string;
  oneClaimPerCustomer: boolean;
  deliveryChargeEnabled: boolean;
  useStoreDeliveryRules: boolean;
  fixedDeliveryCharge: string;
  codAllowed: boolean;
  onlinePaymentAllowed: boolean;
  isActive: boolean;
};

const emptyForm: FormState = {
  title: "",
  subtitle: "",
  announcementText: "",
  badgeText: "FREE DROP",
  buttonText: "Unlock Now",
  productId: "",
  variantIds: [],
  requiredReferrals: "5",
  whatsappShareRequired: true,
  whatsappGroupJoinRequired: false,
  whatsappGroupUrl: "",
  startsAt: "",
  endsAt: "",
  showCountdown: true,
  maxClaims: "",
  oneClaimPerCustomer: true,
  deliveryChargeEnabled: false,
  useStoreDeliveryRules: false,
  fixedDeliveryCharge: "",
  codAllowed: true,
  onlinePaymentAllowed: true,
  isActive: true,
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50";

function toLocalInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return local.toISOString().slice(0, 16);
}

function campaignStatus(campaign: Campaign) {
  if (campaign.isArchived) return "ARCHIVED";
  if (!campaign.isActive) return "PAUSED";

  const now = Date.now();
  const start = new Date(campaign.startsAt).getTime();
  const end = new Date(campaign.endsAt).getTime();

  if (now < start) return "SCHEDULED";
  if (now > end) return "ENDED";
  return "LIVE";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminCampaignOffersPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId),
    [products, form.productId],
  );

  async function loadData() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/campaign-offers", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load campaign offers.");
      }

      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load campaign offers.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function editCampaign(campaign: Campaign) {
    setEditingId(campaign.id);
    setForm({
      title: campaign.title,
      subtitle: campaign.subtitle ?? "",
      announcementText: campaign.announcementText ?? "",
      badgeText: campaign.badgeText,
      buttonText: campaign.buttonText,
      productId: campaign.productId,
      variantIds: campaign.variantIds ?? [],
      requiredReferrals: String(campaign.requiredReferrals),
      whatsappShareRequired: campaign.whatsappShareRequired,
      whatsappGroupJoinRequired: campaign.whatsappGroupJoinRequired,
      whatsappGroupUrl: campaign.whatsappGroupUrl ?? "",
      startsAt: toLocalInput(campaign.startsAt),
      endsAt: toLocalInput(campaign.endsAt),
      showCountdown: campaign.showCountdown,
      maxClaims:
        campaign.maxClaims === null ? "" : String(campaign.maxClaims),
      oneClaimPerCustomer: campaign.oneClaimPerCustomer,
      deliveryChargeEnabled: campaign.deliveryChargeEnabled,
      useStoreDeliveryRules: campaign.useStoreDeliveryRules,
      fixedDeliveryCharge:
        campaign.fixedDeliveryCharge === null
          ? ""
          : String(campaign.fixedDeliveryCharge),
      codAllowed: campaign.codAllowed,
      onlinePaymentAllowed: campaign.onlinePaymentAllowed,
      isActive: campaign.isActive,
    });

    requestAnimationFrame(() => {
      document.getElementById("campaign-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function toggleVariant(variantId: string) {
    setForm((current) => ({
      ...current,
      variantIds: current.variantIds.includes(variantId)
        ? current.variantIds.filter((id) => id !== variantId)
        : [...current.variantIds, variantId],
    }));
  }

  async function saveCampaign(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);

      const response = await fetch("/api/admin/campaign-offers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          ...form,
          startsAt: form.startsAt
            ? new Date(form.startsAt).toISOString()
            : "",
          endsAt: form.endsAt
            ? new Date(form.endsAt).toISOString()
            : "",
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save campaign.");
      }

      resetForm();
      await loadData();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to save campaign.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function archiveCampaign(campaign: Campaign) {
    if (
      !confirm(
        "Archive '" +
          campaign.title +
          "'? History, referrals and claims will be kept.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/admin/campaign-offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: campaign.id, archive: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to archive campaign.");
      }

      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to archive campaign.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#0B1613] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0B1613]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5"
          >
            ←
          </button>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-emerald-400">
              AR Fashions Admin
            </p>
            <h1 className="text-lg font-black">Campaign Offers</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-7 px-4 py-6">
        <section className="rounded-[28px] border border-emerald-300/10 bg-gradient-to-br from-[#12352B] to-[#07110E] p-5 shadow-2xl sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-emerald-300">
            Reusable Growth Campaigns
          </p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">
            Change product, title, timer and rules anytime.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            Campaigns are archived instead of deleted, so referral and claim
            history stays safe.
          </p>
        </section>

        <form
          id="campaign-form"
          onSubmit={saveCampaign}
          className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl sm:p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                Campaign Builder
              </p>
              <h2 className="mt-1 text-xl font-black">
                {editingId ? "Edit Campaign" : "Create Campaign"}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/60"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Campaign Title">
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Festive Free Drop"
                className={inputClass}
              />
            </Field>

            <Field label="Badge Text">
              <input
                value={form.badgeText}
                onChange={(event) =>
                  setForm({ ...form, badgeText: event.target.value })
                }
                placeholder="FREE DROP"
                className={inputClass}
              />
            </Field>

            <Field label="Subtitle">
              <input
                value={form.subtitle}
                onChange={(event) =>
                  setForm({ ...form, subtitle: event.target.value })
                }
                placeholder="Invite friends. Unlock your gift."
                className={inputClass}
              />
            </Field>

            <Field label="Button Text">
              <input
                value={form.buttonText}
                onChange={(event) =>
                  setForm({ ...form, buttonText: event.target.value })
                }
                placeholder="Unlock Now"
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Announcement Text">
                <input
                  value={form.announcementText}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      announcementText: event.target.value,
                    })
                  }
                  placeholder="Limited stock · Unlocks Friday 7 PM"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Offer Product">
                <select
                  required
                  value={form.productId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      productId: event.target.value,
                      variantIds: [],
                    })
                  }
                  className={inputClass}
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name +
                        " · ₹" +
                        product.retailPrice.toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {selectedProduct && (
            <section className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                {selectedProduct.media[0]?.type === "IMAGE" &&
                selectedProduct.media[0]?.url ? (
                  <img
                    src={selectedProduct.media[0].url}
                    alt=""
                    className="h-16 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="grid h-16 w-14 place-items-center rounded-xl bg-white/5 text-xl">
                    ◇
                  </div>
                )}
                <div>
                  <p className="font-black">{selectedProduct.name}</p>
                  <p className="mt-1 text-xs text-white/45">
                    Leave all variants unchecked to allow every active variant.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {selectedProduct.variants.map((variant) => (
                  <label
                    key={variant.id}
                    className={
                      form.variantIds.includes(variant.id)
                        ? "flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-400/50 bg-emerald-400/10 p-3 text-xs"
                        : "flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs"
                    }
                  >
                    <input
                      type="checkbox"
                      checked={form.variantIds.includes(variant.id)}
                      onChange={() => toggleVariant(variant.id)}
                    />
                    <span className="font-bold">
                      {variant.color.name + " · " + variant.size.name}
                    </span>
                    <span className="ml-auto text-white/40">
                      {variant.stock + " pcs"}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Required Referrals">
              <input
                required
                min="1"
                type="number"
                value={form.requiredReferrals}
                onChange={(event) =>
                  setForm({
                    ...form,
                    requiredReferrals: event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Maximum Claims">
              <input
                min="1"
                type="number"
                value={form.maxClaims}
                onChange={(event) =>
                  setForm({ ...form, maxClaims: event.target.value })
                }
                placeholder="Unlimited"
                className={inputClass}
              />
            </Field>

            <Field label="Starts At">
              <input
                required
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) =>
                  setForm({ ...form, startsAt: event.target.value })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Ends At">
              <input
                required
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) =>
                  setForm({ ...form, endsAt: event.target.value })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <SectionTitle title="Referral & WhatsApp Rules" />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToggleCard
              title="WhatsApp Share"
              description="Show WhatsApp share as part of unlock flow."
              checked={form.whatsappShareRequired}
              onChange={(checked) =>
                setForm({ ...form, whatsappShareRequired: checked })
              }
            />
            <ToggleCard
              title="WhatsApp Group"
              description="Require the group-join step in the campaign."
              checked={form.whatsappGroupJoinRequired}
              onChange={(checked) =>
                setForm({
                  ...form,
                  whatsappGroupJoinRequired: checked,
                })
              }
            />
            <ToggleCard
              title="One Claim / Customer"
              description="Prevent repeat free-product claims."
              checked={form.oneClaimPerCustomer}
              onChange={(checked) =>
                setForm({
                  ...form,
                  oneClaimPerCustomer: checked,
                })
              }
            />
          </div>

          {form.whatsappGroupJoinRequired && (
            <div className="mt-4">
              <Field label="WhatsApp Group Link">
                <input
                  required
                  type="url"
                  value={form.whatsappGroupUrl}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      whatsappGroupUrl: event.target.value,
                    })
                  }
                  placeholder="https://chat.whatsapp.com/..."
                  className={inputClass}
                />
              </Field>
              <p className="mt-2 text-[11px] leading-5 text-amber-200/60">
                WhatsApp membership itself cannot be reliably verified by the
                website. We track the group-join step without pretending the
                membership was technically verified.
              </p>
            </div>
          )}

          <SectionTitle title="Delivery & Payment" />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToggleCard
              title="Apply Delivery Charge"
              description="OFF means free delivery for this campaign."
              checked={form.deliveryChargeEnabled}
              onChange={(checked) =>
                setForm({
                  ...form,
                  deliveryChargeEnabled: checked,
                  useStoreDeliveryRules: checked
                    ? form.useStoreDeliveryRules
                    : false,
                  fixedDeliveryCharge: checked
                    ? form.fixedDeliveryCharge
                    : "",
                })
              }
            />
            <ToggleCard
              title="COD Allowed"
              description="Allow cash on delivery when a charge is due."
              checked={form.codAllowed}
              onChange={(checked) =>
                setForm({ ...form, codAllowed: checked })
              }
            />
            <ToggleCard
              title="Online Payment"
              description="Allow online payment when a charge is due."
              checked={form.onlinePaymentAllowed}
              onChange={(checked) =>
                setForm({ ...form, onlinePaymentAllowed: checked })
              }
            />
          </div>

          {form.deliveryChargeEnabled && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <label className="flex items-center gap-3 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={form.useStoreDeliveryRules}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      useStoreDeliveryRules: event.target.checked,
                    })
                  }
                />
                Use existing store delivery rules
              </label>

              {!form.useStoreDeliveryRules && (
                <div className="mt-4 max-w-sm">
                  <Field label="Fixed Delivery Charge ₹">
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.fixedDeliveryCharge}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          fixedDeliveryCharge: event.target.value,
                        })
                      }
                      placeholder="49"
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          <SectionTitle title="Display & Status" />

          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleCard
              title="Countdown Timer"
              description="Show open/end countdown to customers."
              checked={form.showCountdown}
              onChange={(checked) =>
                setForm({ ...form, showCountdown: checked })
              }
            />
            <ToggleCard
              title="Campaign Active"
              description="Pause instantly without losing campaign data."
              checked={form.isActive}
              onChange={(checked) =>
                setForm({ ...form, isActive: checked })
              }
            />
          </div>

          <button
            disabled={saving}
            className="mt-7 w-full rounded-2xl bg-emerald-400 py-4 text-sm font-black text-[#062017] transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Campaign"
                : "Create Campaign"}
          </button>
        </form>

        <section>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                Campaign History
              </p>
              <h2 className="mt-1 text-xl font-black">Existing Campaigns</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
              {campaigns.length + " total"}
            </span>
          </div>

          {loading ? (
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/50">
              Loading campaigns...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-sm text-white/50">
              No campaign created yet.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {campaigns.map((campaign) => {
                const status = campaignStatus(campaign);
                const image = campaign.product.media[0];

                return (
                  <article
                    key={campaign.id}
                    className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.05]"
                  >
                    <div className="flex gap-4 p-4">
                      {image?.type === "IMAGE" ? (
                        <img
                          src={image.url}
                          alt=""
                          className="h-28 w-24 shrink-0 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="grid h-28 w-24 shrink-0 place-items-center rounded-2xl bg-white/5 text-2xl">
                          ◇
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">
                              {campaign.badgeText}
                            </p>
                            <h3 className="mt-1 truncate text-lg font-black">
                              {campaign.title}
                            </h3>
                          </div>
                          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-black">
                            {status}
                          </span>
                        </div>

                        <p className="mt-2 truncate text-xs text-white/55">
                          {campaign.product.name}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                          <div className="rounded-xl bg-black/20 p-2.5">
                            <span className="text-white/35">Unlock</span>
                            <div className="mt-1 font-black">
                              {campaign.requiredReferrals + " referrals"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-black/20 p-2.5">
                            <span className="text-white/35">Claims</span>
                            <div className="mt-1 font-black">
                              {campaign.claimedCount +
                                (campaign.maxClaims
                                  ? " / " + campaign.maxClaims
                                  : "")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 px-4 py-3 text-[10px] leading-5 text-white/45">
                      {formatDate(campaign.startsAt) +
                        " → " +
                        formatDate(campaign.endsAt)}
                      <br />
                      {"Delivery: " +
                        (!campaign.deliveryChargeEnabled
                          ? "FREE"
                          : campaign.useStoreDeliveryRules
                            ? "Store rules"
                            : "₹" + (campaign.fixedDeliveryCharge ?? 0))}
                    </div>

                    {!campaign.isArchived && (
                      <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-4">
                        <button
                          type="button"
                          onClick={() => editCampaign(campaign)}
                          className="rounded-xl bg-white px-3 py-3 text-xs font-black text-[#0B1613]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => archiveCampaign(campaign)}
                          className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-3 text-xs font-black text-amber-200"
                        >
                          Archive
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs font-bold text-white/55">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-3 mt-7 flex items-center gap-3">
      <h3 className="text-sm font-black">{title}</h3>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={
        checked
          ? "flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4"
          : "flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      }
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1"
      />
      <span>
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-1 block text-[11px] leading-5 text-white/40">
          {description}
        </span>
      </span>
    </label>
  );
}

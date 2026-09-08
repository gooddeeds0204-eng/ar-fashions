"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type Audience =
  | "ALL"
  | "RETAIL"
  | "RESELLER"
  | "INDIVIDUAL";

type CampaignStatus =
  | "DRAFT"
  | "SENT";

type Campaign = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  audience: Audience;
  targetUserId: string | null;
  status: CampaignStatus;
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  isReseller: boolean;
};

const emptyForm = {
  title: "",
  message: "",
  link: "",
  audience: "ALL" as Audience,
  targetUserId: "",
};

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Date(
    value,
  ).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}

function audienceLabel(
  value: Audience,
) {
  switch (value) {
    case "ALL":
      return "All Customers";
    case "RETAIL":
      return "Retail";
    case "RESELLER":
      return "Resellers";
    case "INDIVIDUAL":
      return "Individual";
  }
}

export default function AdminNotificationsPage() {
  const router =
    useRouter();

  const [
    campaigns,
    setCampaigns,
  ] =
    useState<Campaign[]>(
      [],
    );

  const [
    customers,
    setCustomers,
  ] =
    useState<Customer[]>(
      [],
    );

  const [
    form,
    setForm,
  ] =
    useState(
      emptyForm,
    );

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  async function loadData() {
    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/admin/notifications",
          {
            cache: "no-store",
            credentials:
              "same-origin",
          },
        );

      if (
        response.status ===
        401
      ) {
        router.replace(
          "/admin/login",
        );
        return;
      }

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "Failed to load notifications.",
        );
      }

      setCampaigns(
        Array.isArray(
          data.campaigns,
        )
          ? data.campaigns
          : [],
      );

      setCustomers(
        Array.isArray(
          data.customers,
        )
          ? data.customers
          : [],
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const visibleCampaigns =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return campaigns;
      }

      return campaigns.filter(
        (item) =>
          [
            item.title,
            item.message,
            item.audience,
            item.status,
          ]
            .join(" ")
            .toLowerCase()
            .includes(
              query,
            ),
      );
    }, [
      campaigns,
      search,
    ]);

  const activeCustomers =
    useMemo(
      () =>
        customers.filter(
          (item) =>
            item.status ===
            "ACTIVE",
        ),
      [customers],
    );

  function resetForm() {
    setForm(
      emptyForm,
    );
    setEditingId(
      null,
    );
  }

  function editCampaign(
    campaign: Campaign,
  ) {
    if (
      campaign.status ===
      "SENT"
    ) {
      return;
    }

    setEditingId(
      campaign.id,
    );

    setForm({
      title:
        campaign.title,
      message:
        campaign.message,
      link:
        campaign.link ??
        "",
      audience:
        campaign.audience,
      targetUserId:
        campaign.targetUserId ??
        "",
    });

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  async function saveCampaign(
    action:
      | "SAVE_DRAFT"
      | "SEND",
  ) {
    if (
      !form.title.trim() ||
      !form.message.trim()
    ) {
      setMessage(
        "Title and message are required.",
      );
      return;
    }

    if (
      form.audience ===
        "INDIVIDUAL" &&
      !form.targetUserId
    ) {
      setMessage(
        "Select a customer.",
      );
      return;
    }

    if (
      action ===
      "SEND"
    ) {
      const confirmed =
        window.confirm(
          "Send this notification now? Sent notifications cannot be edited.",
        );

      if (!confirmed) {
        return;
      }
    }

    try {
      setSaving(true);
      setMessage("");

      const response =
        await fetch(
          "/api/admin/notifications",
          {
            method:
              editingId
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                ...(editingId
                  ? {
                      id:
                        editingId,
                    }
                  : {}),

                title:
                  form.title.trim(),

                message:
                  form.message.trim(),

                link:
                  form.link.trim(),

                audience:
                  form.audience,

                targetUserId:
                  form.audience ===
                  "INDIVIDUAL"
                    ? form.targetUserId
                    : "",

                action,
              }),
          },
        );

      const data =
        await response.json();

      if (
        response.status ===
        401
      ) {
        router.replace(
          "/admin/login",
        );
        return;
      }

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "Notification save failed.",
        );
      }

      setMessage(
        data.message ??
          "Notification saved.",
      );

      resetForm();
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Notification save failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendDraft(
    campaign: Campaign,
  ) {
    const confirmed =
      window.confirm(
        `Send "${campaign.title}" now?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response =
        await fetch(
          "/api/admin/notifications",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                id:
                  campaign.id,
                action:
                  "SEND",
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "Send failed.",
        );
      }

      setMessage(
        data.message ??
          "Notification sent.",
      );

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Send failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteDraft(
    campaign: Campaign,
  ) {
    const confirmed =
      window.confirm(
        `Delete draft "${campaign.title}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/admin/notifications",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                id:
                  campaign.id,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "Delete failed.",
        );
      }

      setMessage(
        data.message ??
          "Draft deleted.",
      );

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Delete failed.",
      );
    }
  }

  const sentCount =
    campaigns.filter(
      (item) =>
        item.status ===
        "SENT",
    ).length;

  const draftCount =
    campaigns.filter(
      (item) =>
        item.status ===
        "DRAFT",
    ).length;

  const totalRecipients =
    campaigns.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.recipientCount,
      0,
    );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
            AR FASHIONS
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-950">
            Notifications
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Send store updates, offers and important messages to customers.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [
              "Campaigns",
              campaigns.length,
            ],
            [
              "Sent",
              sentCount,
            ],
            [
              "Drafts",
              draftCount,
            ],
            [
              "Recipients",
              totalRecipients,
            ],
          ].map(
            ([
              label,
              value,
            ]) => (
              <div
                key={
                  label
                }
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {
                    label
                  }
                </p>

                <p className="mt-2 text-3xl font-black text-slate-950">
                  {
                    value
                  }
                </p>
              </div>
            ),
          )}
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                {editingId
                  ? "Edit Draft"
                  : "Create Notification"}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Save as draft or send immediately.
              </p>
            </div>

            {editingId ? (
              <button
                type="button"
                onClick={
                  resetForm
                }
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-xs font-black text-slate-600">
                Title
              </label>

              <input
                value={
                  form.title
                }
                maxLength={
                  120
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    title:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="New collection is live"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black text-slate-600">
                Audience
              </label>

              <select
                value={
                  form.audience
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    audience:
                      event
                        .target
                        .value as Audience,
                    targetUserId:
                      "",
                  })
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400"
              >
                <option value="ALL">
                  All Customers
                </option>

                <option value="RETAIL">
                  Retail Customers
                </option>

                <option value="RESELLER">
                  Resellers
                </option>

                <option value="INDIVIDUAL">
                  Individual Customer
                </option>
              </select>
            </div>

            {form.audience ===
            "INDIVIDUAL" ? (
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-black text-slate-600">
                  Customer
                </label>

                <select
                  value={
                    form.targetUserId
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      targetUserId:
                        event
                          .target
                          .value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400"
                >
                  <option value="">
                    Select customer
                  </option>

                  {activeCustomers.map(
                    (
                      customer,
                    ) => (
                      <option
                        key={
                          customer.id
                        }
                        value={
                          customer.id
                        }
                      >
                        {customer.name ??
                          "Customer"}
                        {" · "}
                        {customer.phone ??
                          customer.email ??
                          customer.id}
                        {customer.isReseller
                          ? " · Reseller"
                          : " · Retail"}
                      </option>
                    ),
                  )}
                </select>
              </div>
            ) : null}

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-black text-slate-600">
                Message
              </label>

              <textarea
                value={
                  form.message
                }
                maxLength={
                  1000
                }
                rows={
                  5
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    message:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="Write your notification message..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:bg-white"
              />

              <p className="mt-1 text-right text-[10px] font-bold text-slate-400">
                {
                  form.message
                    .length
                }
                /1000
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-black text-slate-600">
                Internal Link
              </label>

              <input
                value={
                  form.link
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    link:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="/products/... or /reels"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:bg-white"
              />

              <p className="mt-1 text-[10px] text-slate-400">
                Optional. Must start with /
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                saveCampaign(
                  "SAVE_DRAFT",
                )
              }
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {saving
                ? "Working..."
                : editingId
                  ? "Update Draft"
                  : "Save Draft"}
            </button>

            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                saveCampaign(
                  "SEND",
                )
              }
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving
                ? "Working..."
                : "Send Now"}
            </button>
          </div>
        </section>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {
              message
            }
          </div>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-black text-slate-950">
                Campaign History
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Drafts and sent notifications.
              </p>
            </div>

            <input
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Search notifications..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400 md:w-80"
            />
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm font-bold text-slate-500">
              Loading notifications...
            </div>
          ) : visibleCampaigns.length ===
            0 ? (
            <div className="p-10 text-center">
              <p className="font-black text-slate-900">
                No notification campaigns yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create your first notification above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleCampaigns.map(
                (
                  campaign,
                ) => (
                  <div
                    key={
                      campaign.id
                    }
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">

                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black ${
                              campaign.status ===
                              "SENT"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {
                              campaign.status
                            }
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
                            {audienceLabel(
                              campaign.audience,
                            )}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-black text-slate-950">
                          {
                            campaign.title
                          }
                        </h3>

                        <p className="mt-1 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {
                            campaign.message
                          }
                        </p>

                        {campaign.link ? (
                          <p className="mt-2 text-xs font-bold text-emerald-700">
                            Link:{" "}
                            {
                              campaign.link
                            }
                          </p>
                        ) : null}

                        <p className="mt-3 text-[11px] font-semibold text-slate-400">
                          Created{" "}
                          {formatDate(
                            campaign.createdAt,
                          )}

                          {campaign.status ===
                          "SENT"
                            ? ` · Sent ${formatDate(
                                campaign.sentAt,
                              )} · ${campaign.recipientCount} recipient(s)`
                            : ""}
                        </p>
                      </div>

                      {campaign.status ===
                      "DRAFT" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              editCampaign(
                                campaign,
                              )
                            }
                            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={
                              saving
                            }
                            onClick={() =>
                              sendDraft(
                                campaign,
                              )
                            }
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                          >
                            Send
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteDraft(
                                campaign,
                              )
                            }
                            className="rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

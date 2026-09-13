"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type NotificationFilter =
  | "ALL"
  | "NEW"
  | "ORDERS"
  | "OFFERS";

type ToastState = {
  type: "SUCCESS" | "ERROR";
  title: string;
  message: string;
} | null;

function formatDate(
  value: string,
) {
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

function getNotificationType(
  item: NotificationItem,
) {
  const text = `${
    item.title
  } ${
    item.message
  } ${
    item.link ?? ""
  }`.toLowerCase();

  if (
    text.includes("order") ||
    text.includes("ship") ||
    text.includes("deliver") ||
    text.includes("payment") ||
    text.includes("/my-orders")
  ) {
    return "ORDER";
  }

  if (
    text.includes("offer") ||
    text.includes("sale") ||
    text.includes("discount") ||
    text.includes("coupon") ||
    text.includes("promo")
  ) {
    return "OFFER";
  }

  if (
    text.includes("wishlist") ||
    text.includes("saved")
  ) {
    return "WISHLIST";
  }

  return "UPDATE";
}

function typeLabel(
  type: ReturnType<
    typeof getNotificationType
  >,
) {
  if (type === "ORDER") {
    return "Order";
  }

  if (type === "OFFER") {
    return "Offer";
  }

  if (type === "WISHLIST") {
    return "Saved Look";
  }

  return "Update";
}

function typeIcon(
  type: ReturnType<
    typeof getNotificationType
  >,
) {
  if (type === "ORDER") {
    return "◫";
  }

  if (type === "OFFER") {
    return "%";
  }

  if (type === "WISHLIST") {
    return "♡";
  }

  return "✦";
}

function typeTone(
  type: ReturnType<
    typeof getNotificationType
  >,
) {
  if (type === "ORDER") {
    return {
      icon:
        "bg-emerald-500 text-[#032017]",
      badge:
        "bg-emerald-50 text-emerald-700",
    };
  }

  if (type === "OFFER") {
    return {
      icon:
        "bg-amber-300 text-amber-950",
      badge:
        "bg-amber-50 text-amber-700",
    };
  }

  if (type === "WISHLIST") {
    return {
      icon:
        "bg-rose-100 text-rose-700",
      badge:
        "bg-rose-50 text-rose-700",
    };
  }

  return {
    icon:
      "bg-zinc-100 text-zinc-700",
    badge:
      "bg-zinc-100 text-zinc-600",
  };
}

export default function NotificationsPage() {
  const router =
    useRouter();

  const [
    notifications,
    setNotifications,
  ] = useState<
    NotificationItem[]
  >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    selectedId,
    setSelectedId,
  ] = useState<
    string | null
  >(null);

  const [
    filter,
    setFilter,
  ] =
    useState<NotificationFilter>(
      "ALL",
    );

  const [
    toast,
    setToast,
  ] =
    useState<ToastState>(
      null,
    );

  function notify(
    type:
      | "SUCCESS"
      | "ERROR",
    title: string,
    message: string,
  ) {
    setToast({
      type,
      title,
      message,
    });

    window.setTimeout(
      () => {
        setToast(null);
      },
      3000,
    );
  }

  async function loadNotifications() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response =
        await fetch(
          "/api/notifications",
          {
            cache: "no-store",
            credentials:
              "same-origin",
          },
        );

      const data =
        await response.json();

      if (
        response.status ===
        401
      ) {
        setNotifications(
          [],
        );

        setUnreadCount(
          0,
        );

        setErrorMessage(
          "Please use your customer account to view notifications.",
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to load notifications.",
        );
      }

      setNotifications(
        Array.isArray(
          data.notifications,
        )
          ? data.notifications
          : [],
      );

      setUnreadCount(
        Number(
          data.unreadCount ??
            0,
        ) || 0,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function markRead(
    item: NotificationItem,
  ) {
    if (item.isRead) {
      return true;
    }

    try {
      const response =
        await fetch(
          "/api/notifications",
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
                action:
                  "MARK_READ",
                id:
                  item.id,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to mark notification as read.",
        );
      }

      setNotifications(
        (current) =>
          current.map(
            (
              notification,
            ) =>
              notification.id ===
              item.id
                ? {
                    ...notification,
                    isRead:
                      true,
                    readAt:
                      new Date().toISOString(),
                  }
                : notification,
          ),
      );

      setUnreadCount(
        (current) =>
          Math.max(
            0,
            current - 1,
          ),
      );

      return true;
    } catch (error) {
      notify(
        "ERROR",
        "Could Not Update",
        error instanceof Error
          ? error.message
          : "Failed to update notification.",
      );

      return false;
    }
  }

  async function openNotification(
    item: NotificationItem,
  ) {
    await markRead(
      item,
    );

    setSelectedId(
      (current) =>
        current ===
        item.id
          ? null
          : item.id,
    );
  }

  function openLinkedPage(
    link: string,
  ) {
    if (
      link.startsWith(
        "/",
      ) &&
      !link.startsWith(
        "//",
      )
    ) {
      router.push(
        link,
      );
    }
  }

  async function markAllRead() {
    if (
      unreadCount <= 0
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/notifications",
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
                action:
                  "MARK_ALL_READ",
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to mark all notifications as read.",
        );
      }

      setNotifications(
        (current) =>
          current.map(
            (item) => ({
              ...item,
              isRead:
                true,
              readAt:
                item.readAt ??
                new Date().toISOString(),
            }),
          ),
      );

      setUnreadCount(
        0,
      );

      notify(
        "SUCCESS",
        "All Caught Up",
        "All notifications are now marked as read.",
      );
    } catch (error) {
      notify(
        "ERROR",
        "Could Not Update",
        error instanceof Error
          ? error.message
          : "Failed to update notifications.",
      );
    }
  }

  const counts =
    useMemo(() => {
      let orders = 0;
      let offers = 0;

      notifications.forEach(
        (item) => {
          const type =
            getNotificationType(
              item,
            );

          if (
            type === "ORDER"
          ) {
            orders += 1;
          }

          if (
            type === "OFFER"
          ) {
            offers += 1;
          }
        },
      );

      return {
        all:
          notifications.length,
        new:
          unreadCount,
        orders,
        offers,
      };
    }, [
      notifications,
      unreadCount,
    ]);

  const filteredNotifications =
    useMemo(() => {
      if (
        filter === "ALL"
      ) {
        return notifications;
      }

      if (
        filter === "NEW"
      ) {
        return notifications.filter(
          (item) =>
            !item.isRead,
        );
      }

      if (
        filter === "ORDERS"
      ) {
        return notifications.filter(
          (item) =>
            getNotificationType(
              item,
            ) === "ORDER",
        );
      }

      return notifications.filter(
        (item) =>
          getNotificationType(
            item,
          ) === "OFFER",
      );
    }, [
      filter,
      notifications,
    ]);

  const filterOptions: {
    id: NotificationFilter;
    label: string;
    count: number;
  }[] = [
    {
      id: "ALL",
      label: "All",
      count: counts.all,
    },
    {
      id: "NEW",
      label: "New",
      count: counts.new,
    },
    {
      id: "ORDERS",
      label: "Orders",
      count:
        counts.orders,
    },
    {
      id: "OFFERS",
      label: "Offers",
      count:
        counts.offers,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f5f1] pb-24 text-zinc-950 sm:pb-10">
      {/* PREMIUM TOAST */}
      {toast && (
        <div className="fixed left-1/2 top-[78px] z-[120] w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div
            className={`flex items-center gap-3 rounded-[1.35rem] border p-3.5 text-white shadow-[0_20px_55px_rgba(0,0,0,0.3)] backdrop-blur-xl ${
              toast.type ===
              "SUCCESS"
                ? "border-emerald-300/25 bg-[#063326]/95"
                : "border-red-300/25 bg-[#4a1111]/95"
            }`}
          >
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-black ${
                toast.type ===
                "SUCCESS"
                  ? "bg-emerald-400 text-[#032017]"
                  : "bg-red-400 text-white"
              }`}
            >
              {toast.type ===
              "SUCCESS"
                ? "✓"
                : "!"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                AR Fashions
              </p>

              <p className="mt-1 text-[13px] font-black">
                {
                  toast.title
                }
              </p>

              <p className="mt-0.5 text-[9px] font-semibold text-white/55">
                {
                  toast.message
                }
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setToast(
                  null,
                )
              }
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-5xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/[0.06] bg-white text-sm font-black"
          >
            ←
          </button>

          <BrandLogo
            compact
            onClick={() =>
              router.push(
                "/",
              )
            }
          />

          {unreadCount >
          0 ? (
            <button
              type="button"
              onClick={() =>
                void markAllRead()
              }
              className="ml-auto rounded-full bg-[#06261c] px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.08em] text-white"
            >
              Mark All Read
            </button>
          ) : (
            <span className="ml-auto rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-emerald-700">
              ✓ All Read
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#03140e] via-[#06261c] to-black p-5 text-white shadow-[0_26px_70px_rgba(0,0,0,0.22)] sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative flex items-end justify-between gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-300">
                AR Updates
              </p>

              <h1 className="mt-3 font-serif text-[2.7rem] leading-[0.88] tracking-[-0.04em] sm:text-5xl">
                Notification
                <br />
                Centre.
              </h1>

              <p className="mt-4 max-w-md text-[10px] leading-5 text-white/45 sm:text-sm">
                Orders, delivery updates, offers and important AR Fashions activity — all in one place.
              </p>
            </div>

            <div className="shrink-0 text-right">
              <div className="grid h-16 w-16 place-items-center rounded-full border border-emerald-300/20 bg-emerald-400/10">
                <span className="font-serif text-3xl text-emerald-300">
                  {
                    unreadCount
                  }
                </span>
              </div>

              <p className="mt-2 text-[7px] font-black uppercase tracking-[0.16em] text-white/35">
                Unread
              </p>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-2">
            <div className="rounded-[1.1rem] border border-white/[0.08] bg-white/[0.05] p-3">
              <p className="text-[1.35rem] font-black">
                {
                  counts.all
                }
              </p>

              <p className="mt-1 text-[7px] font-bold text-white/40">
                Total Updates
              </p>
            </div>

            <div className="rounded-[1.1rem] border border-white/[0.08] bg-white/[0.05] p-3">
              <p className="text-[1.35rem] font-black">
                {
                  counts.orders
                }
              </p>

              <p className="mt-1 text-[7px] font-bold text-white/40">
                Order Updates
              </p>
            </div>

            <div className="rounded-[1.1rem] border border-white/[0.08] bg-white/[0.05] p-3">
              <p className="text-[1.35rem] font-black">
                {
                  counts.offers
                }
              </p>

              <p className="mt-1 text-[7px] font-bold text-white/40">
                Offers
              </p>
            </div>
          </div>
        </section>

        {/* FILTERS */}
        {!loading &&
          notifications.length >
            0 && (
            <section className="mt-5 overflow-x-auto">
              <div className="flex min-w-max gap-2">
                {filterOptions.map(
                  (
                    option,
                  ) => (
                    <button
                      key={
                        option.id
                      }
                      type="button"
                      onClick={() =>
                        setFilter(
                          option.id,
                        )
                      }
                      className={`rounded-full px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.08em] transition ${
                        filter ===
                        option.id
                          ? "bg-[#06261c] text-white shadow-sm"
                          : "border border-black/[0.06] bg-white text-zinc-500"
                      }`}
                    >
                      {
                        option.label
                      }{" "}
                      <span className="ml-1 opacity-60">
                        {
                          option.count
                        }
                      </span>
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

        {/* ERROR */}
        {errorMessage ? (
          <section className="mt-5 rounded-[1.4rem] border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-red-500">
              Attention
            </p>

            <p className="mt-2 text-sm font-semibold leading-6 text-zinc-700">
              {
                errorMessage
              }
            </p>

            <button
              type="button"
              onClick={() =>
                void loadNotifications()
              }
              className="mt-4 rounded-full bg-zinc-950 px-4 py-2.5 text-[9px] font-black text-white"
            >
              Try Again
            </button>
          </section>
        ) : null}

        {/* CONTENT */}
        <section className="mt-5">
          {loading ? (
            <div className="rounded-[1.8rem] border border-black/[0.05] bg-white p-10 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-600" />

              <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
                Loading Updates
              </p>
            </div>
          ) : notifications.length ===
            0 ? (
            <div className="overflow-hidden rounded-[1.8rem] border border-black/[0.05] bg-white shadow-sm">
              <div className="p-8 text-center sm:p-12">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-700">
                  ✦
                </div>

                <p className="mt-5 text-[8px] font-black uppercase tracking-[0.24em] text-emerald-700">
                  AR Notification Centre
                </p>

                <h2 className="mt-2 font-serif text-[2rem] leading-none">
                  You&apos;re all caught up.
                </h2>

                <p className="mx-auto mt-3 max-w-sm text-[11px] leading-5 text-zinc-500">
                  Order progress, delivery alerts, store updates and special offers will appear here.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/",
                    )
                  }
                  className="mt-6 rounded-full bg-[#06261c] px-6 py-3 text-[9px] font-black uppercase tracking-[0.08em] text-white"
                >
                  Continue Shopping →
                </button>
              </div>
            </div>
          ) : filteredNotifications.length ===
            0 ? (
            <div className="rounded-[1.6rem] border border-black/[0.05] bg-white p-8 text-center shadow-sm">
              <p className="font-serif text-2xl">
                No updates here.
              </p>

              <p className="mt-2 text-[10px] text-zinc-500">
                Try another notification filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(
                (
                  item,
                ) => {
                  const type =
                    getNotificationType(
                      item,
                    );

                  const tone =
                    typeTone(
                      type,
                    );

                  const expanded =
                    selectedId ===
                    item.id;

                  return (
                    <article
                      key={
                        item.id
                      }
                      className={`overflow-hidden rounded-[1.45rem] border shadow-[0_10px_30px_rgba(0,0,0,0.035)] transition ${
                        item.isRead
                          ? "border-black/[0.05] bg-white"
                          : "border-emerald-200 bg-[#fbfffd]"
                      }`}
                    >
                      {!item.isRead && (
                        <div className="h-1 w-full bg-emerald-500" />
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          void openNotification(
                            item,
                          )
                        }
                        className="w-full p-4 text-left sm:p-5"
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] text-lg font-black ${tone.icon}`}
                          >
                            {
                              typeIcon(
                                type,
                              )
                            }
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.12em] ${tone.badge}`}
                                  >
                                    {
                                      typeLabel(
                                        type,
                                      )
                                    }
                                  </span>

                                  {!item.isRead && (
                                    <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.12em] text-white">
                                      New
                                    </span>
                                  )}
                                </div>

                                <h2 className="mt-2 text-[14px] font-black leading-5 text-zinc-950">
                                  {
                                    item.title
                                  }
                                </h2>
                              </div>

                              <span
                                className={`mt-1 text-sm text-zinc-300 transition ${
                                  expanded
                                    ? "rotate-90"
                                    : ""
                                }`}
                              >
                                →
                              </span>
                            </div>

                            <p
                              className={`mt-2 whitespace-pre-wrap text-[10px] leading-5 text-zinc-500 ${
                                expanded
                                  ? ""
                                  : "line-clamp-2"
                              }`}
                            >
                              {
                                item.message
                              }
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="text-[7px] font-bold text-zinc-400">
                                {formatDate(
                                  item.createdAt,
                                )}
                              </span>

                              <span className="h-1 w-1 rounded-full bg-zinc-300" />

                              <span
                                className={`text-[7px] font-black uppercase tracking-[0.08em] ${
                                  item.isRead
                                    ? "text-zinc-400"
                                    : "text-emerald-700"
                                }`}
                              >
                                {item.isRead
                                  ? "Read"
                                  : "Unread"}
                              </span>

                              {item.link && (
                                <>
                                  <span className="h-1 w-1 rounded-full bg-zinc-300" />

                                  <span className="text-[7px] font-black text-emerald-700">
                                    Linked Update
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {expanded && (
                        <div className="border-t border-black/[0.05] bg-[#faf9f6] p-4 sm:p-5">
                          <p className="text-[7px] font-black uppercase tracking-[0.18em] text-emerald-700">
                            Notification Details
                          </p>

                          <p className="mt-3 whitespace-pre-wrap text-[11px] leading-6 text-zinc-700">
                            {
                              item.message
                            }
                          </p>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {item.link && (
                              <button
                                type="button"
                                onClick={() =>
                                  openLinkedPage(
                                    item.link!,
                                  )
                                }
                                className="rounded-full bg-[#06261c] px-5 py-3 text-[8px] font-black uppercase tracking-[0.08em] text-white"
                              >
                                Open Linked Page →
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedId(
                                  null,
                                )
                              }
                              className="rounded-full border border-black/[0.08] bg-white px-5 py-3 text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-2 left-3 right-3 z-50 rounded-[1.35rem] border border-emerald-200/10 bg-[#03140e]/95 px-1 pb-1.5 pt-1 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:hidden">
        <div className="grid grid-cols-4">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/",
              )
            }
            className="flex min-h-[50px] flex-col items-center justify-center gap-1 text-white/40"
          >
            <span className="text-lg">
              ⌂
            </span>

            <span className="text-[7px] font-black">
              Home
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/wishlist",
              )
            }
            className="flex min-h-[50px] flex-col items-center justify-center gap-1 text-white/40"
          >
            <span className="text-lg">
              ♡
            </span>

            <span className="text-[7px] font-black">
              Wishlist
            </span>
          </button>

          <button
            type="button"
            className="flex min-h-[50px] flex-col items-center justify-center gap-1 text-emerald-300"
          >
            <span className="relative text-lg">
              ✦

              {unreadCount >
                0 && (
                <span className="absolute -right-3 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-emerald-400 px-1 text-[6px] font-black text-[#032017]">
                  {
                    unreadCount >
                    9
                      ? "9+"
                      : unreadCount
                  }
                </span>
              )}
            </span>

            <span className="text-[7px] font-black">
              Updates
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/account",
              )
            }
            className="flex min-h-[50px] flex-col items-center justify-center gap-1 text-white/40"
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
    </main>
  );
}

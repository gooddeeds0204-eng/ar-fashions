"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

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
    message,
    setMessage,
  ] = useState("");

  const [
    selectedId,
    setSelectedId,
  ] = useState<string | null>(null);

  async function loadNotifications() {
    try {
      setLoading(true);
      setMessage("");

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

        setMessage(
          "Please sign in or use your customer account to view notifications.",
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
    loadNotifications();
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
            (notification) =>
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
      setMessage(
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
        current === item.id
          ? null
          : item.id,
    );
  }

  function openLinkedPage(
    link: string,
  ) {
    if (
      link.startsWith("/") &&
      !link.startsWith("//")
    ) {
      router.push(link);
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

      setMessage(
        "All notifications marked as read.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update notifications.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] pb-24 text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.back()
              }
              className="rounded-full px-3 py-2 text-sm font-black"
            >
              ←
            </button>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
                AR FASHIONS
              </p>

              <h1 className="text-lg font-black">
                Notifications
              </h1>
            </div>
          </div>

          {unreadCount >
          0 ? (
            <button
              type="button"
              onClick={
                markAllRead
              }
              className="rounded-full bg-zinc-950 px-4 py-2 text-[11px] font-black text-white"
            >
              Mark all read
            </button>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-5">
        <section className="rounded-3xl bg-zinc-950 p-5 text-white shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-zinc-400">
                Unread updates
              </p>

              <p className="mt-1 text-4xl font-black">
                {
                  unreadCount
                }
              </p>
            </div>

            <div className="text-4xl">
              🔔
            </div>
          </div>
        </section>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {
              message
            }
          </div>
        ) : null}

        <section className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm font-bold text-zinc-500">
              Loading notifications...
            </div>
          ) : notifications.length ===
            0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl">
                🔔
              </div>

              <p className="mt-3 font-black">
                No notifications yet
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Store updates and offers will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {notifications.map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item.id
                    }
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      openNotification(
                        item,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        openNotification(item);
                      }
                    }}
                    className={`relative block w-full cursor-pointer p-5 text-left transition active:bg-zinc-50 ${
                      item.isRead
                        ? "bg-white"
                        : "bg-emerald-50/60"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                          item.isRead
                            ? "bg-zinc-100"
                            : "bg-emerald-500 text-white"
                        }`}
                      >
                        🔔
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className={`text-sm ${
                            item.isRead
                              ? "font-bold text-zinc-800"
                              : "font-black text-zinc-950"
                          }`}>
                            {
                              item.title
                            }
                          </h2>

                          {!item.isRead ? (
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                          ) : null}
                        </div>

                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                          {
                            item.message
                          }
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-zinc-400">
                          <span>
                            {formatDate(
                              item.createdAt,
                            )}
                          </span>

                          {item.link ? (
                            <span className="text-emerald-600">
                              · Tap to view
                            </span>
                          ) : null}

                          {item.isRead ? (
                            <span>
                              · Read
                            </span>
                          ) : (
                            <span className="text-emerald-600">
                              · New
                            </span>
                          )}
                        </div>

                        {selectedId === item.id ? (
                          <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                              Notification Details
                            </p>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                              {item.message}
                            </p>

                            {item.link ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openLinkedPage(item.link!);
                                }}
                                className="mt-4 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-black text-white"
                              >
                                Open linked page →
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
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

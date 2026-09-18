"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

type Address = {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  isDefault: boolean;
};

type Order = {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  totalAmount: number;
  createdAt: string;
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    pincode: string;
    landmark: string | null;
  } | null;
};

type WishlistItem = {
  id: string;
  productId: string;
};

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isReseller: boolean;
};

type AccountToast = {
  type: "SUCCESS" | "ERROR";
  title: string;
  message: string;
} | null;

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(value || 0);
}

function statusText(
  status: string,
) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase(),
    );
}

function formatDate(
  value: string,
) {
  return new Date(value).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}

function orderStepIndex(
  status: string,
) {
  const value =
    status.toUpperCase();

  if (value === "DELIVERED") {
    return 3;
  }

  if (
    value === "SHIPPED" ||
    value ===
      "OUT_FOR_DELIVERY"
  ) {
    return 2;
  }

  if (
    value === "CONFIRMED" ||
    value === "PROCESSING"
  ) {
    return 1;
  }

  return 0;
}

function statusTone(
  status: string,
) {
  const value =
    status.toUpperCase();

  if (value === "DELIVERED") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    value === "SHIPPED" ||
    value ===
      "OUT_FOR_DELIVERY" ||
    value === "CONFIRMED" ||
    value === "PROCESSING"
  ) {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  if (
    value === "CANCELLED" ||
    value === "FAILED"
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function AccountPage() {
  const router = useRouter();

  const [orders, setOrders] =
    useState<Order[]>([]);
  const [addresses, setAddresses] =
    useState<Address[]>([]);
  const [
    wishlistCount,
    setWishlistCount,
  ] = useState(0);
  const [cartCount, setCartCount] =
    useState(0);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [
    resellerApplicationStatus,
    setResellerApplicationStatus,
  ] = useState<
    "NONE" |
    "PENDING" |
    "APPROVED" |
    "REJECTED"
  >("NONE");

  const [
    editProfileOpen,
    setEditProfileOpen,
  ] = useState(false);

  const [
    profileSaving,
    setProfileSaving,
  ] = useState(false);

  const [
    profileName,
    setProfileName,
  ] = useState("");

  const [
    profilePhone,
    setProfilePhone,
  ] = useState("");

  const [
    profileEmail,
    setProfileEmail,
  ] = useState("");

  const [
    accountToast,
    setAccountToast,
  ] = useState<AccountToast>(
    null,
  );

  function showAccountToast(
    type: "SUCCESS" | "ERROR",
    title: string,
    message: string,
  ) {
    setAccountToast({
      type,
      title,
      message,
    });

    window.setTimeout(
      () => {
        setAccountToast(null);
      },
      3000,
    );
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        const response =
          await fetch(
            "/api/profile",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          return;
        }

        setProfile(
          data.user ?? null,
        );
      } catch (error) {
        console.error(
          "Profile load failed:",
          error,
        );
      }
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    async function loadResellerApplicationStatus() {
      try {
        const response =
          await fetch(
            "/api/reseller-application",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (
          data.isReseller === true
        ) {
          setResellerApplicationStatus(
            "APPROVED",
          );
          return;
        }

        const status =
          data.application?.status;

        if (
          status === "PENDING" ||
          status === "APPROVED" ||
          status === "REJECTED"
        ) {
          setResellerApplicationStatus(
            status,
          );
        } else {
          setResellerApplicationStatus(
            "NONE",
          );
        }
      } catch (error) {
        console.error(
          "Reseller application status load failed:",
          error,
        );
      }
    }

    void loadResellerApplicationStatus();
  }, []);

  useEffect(() => {
    async function loadAccount() {
      try {
        setLoading(true);
        setError("");

        const [
          ordersResult,
          addressesResult,
          wishlistResult,
        ] = await Promise.allSettled([
          fetch("/api/my-orders", {
            cache: "no-store",
            credentials:
              "same-origin",
          }),
          fetch("/api/addresses", {
            cache: "no-store",
            credentials:
              "same-origin",
          }),
          fetch("/api/wishlist", {
            cache: "no-store",
            credentials:
              "same-origin",
          }),
        ]);

        if (
          ordersResult.status ===
          "fulfilled"
        ) {
          const response =
            ordersResult.value;
          const data =
            await response
              .json()
              .catch(() => ({}));

          if (response.ok) {
            setOrders(
              Array.isArray(
                data.orders,
              )
                ? data.orders
                : [],
            );
          }
        }

        if (
          addressesResult.status ===
          "fulfilled"
        ) {
          const response =
            addressesResult.value;
          const data =
            await response
              .json()
              .catch(() => ({}));

          if (response.ok) {
            setAddresses(
              Array.isArray(
                data.addresses,
              )
                ? data.addresses
                : [],
            );
          }
        }

        if (
          wishlistResult.status ===
          "fulfilled"
        ) {
          const response =
            wishlistResult.value;
          const data =
            await response
              .json()
              .catch(() => ({}));

          if (response.ok) {
            const wishlist =
              Array.isArray(
                data.wishlist,
              )
                ? data.wishlist
                : [];

            setWishlistCount(
              wishlist.length,
            );
          }
        }

        if (
          typeof window !==
          "undefined"
        ) {
          const raw =
            localStorage.getItem(
              "ar-fashions-cart",
            );

          if (raw) {
            try {
              const parsed =
                JSON.parse(raw);

              setCartCount(
                Array.isArray(
                  parsed,
                )
                  ? parsed.length
                  : 0,
              );
            } catch {
              setCartCount(0);
            }
          } else {
            setCartCount(0);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load account.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, []);

  const primaryAddress =
    useMemo(() => {
      return (
        addresses.find(
          (item) =>
            item.isDefault,
        ) ??
        addresses[0] ??
        null
      );
    }, [addresses]);

  const latestOrderWithAddress =
    useMemo(() => {
      return (
        orders.find(
          (item) =>
            item.address,
        ) ?? null
      );
    }, [orders]);

  const customerName =
    profile?.name ||
    primaryAddress?.name ||
    latestOrderWithAddress
      ?.address?.name ||
    "AR Customer";

  const customerPhone =
    profile?.phone ||
    primaryAddress?.phone ||
    latestOrderWithAddress
      ?.address?.phone ||
    "Not added";

  const customerEmail =
    profile?.email ||
    "Not added";

  const customerType =
    profile?.isReseller
      ? "Reseller Customer"
      : "Retail Customer";

  function openProfileEditor() {
    setProfileName(
      profile?.name ??
        customerName ===
          "AR Customer"
        ? ""
        : profile?.name ??
          customerName,
    );

    setProfilePhone(
      profile?.phone ??
        (
          customerPhone ===
          "Not added"
            ? ""
            : customerPhone
        ),
    );

    setProfileEmail(
      profile?.email ?? "",
    );

    setEditProfileOpen(
      true,
    );
  }

  async function saveProfile(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      profileName.trim().length <
      2
    ) {
      showAccountToast(
        "ERROR",
        "Check Your Name",
        "Please enter your full name.",
      );

      return;
    }

    if (
      !/^[6-9]\d{9}$/.test(
        profilePhone.trim(),
      )
    ) {
      showAccountToast(
        "ERROR",
        "Check Mobile Number",
        "Enter a valid 10 digit mobile number.",
      );

      return;
    }

    try {
      setProfileSaving(true);

      const response =
        await fetch(
          "/api/profile",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              name:
                profileName.trim(),
              phone:
                profilePhone.trim(),
              email:
                profileEmail
                  .trim()
                  .toLowerCase(),
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update profile.",
        );
      }

      setProfile(
        data.user,
      );

      setEditProfileOpen(
        false,
      );

      showAccountToast(
        "SUCCESS",
        "Profile Updated",
        "Your personal information has been saved successfully.",
      );
    } catch (error) {
      showAccountToast(
        "ERROR",
        "Update Failed",
        error instanceof Error
          ? error.message
          : "Failed to update profile.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  const customerInitial =
    customerName
      .trim()
      .charAt(0)
      .toUpperCase() || "A";

  const totalSpend =
    orders.reduce(
      (sum, item) =>
        sum +
        Number(
          item.totalAmount || 0,
        ),
      0,
    );

  const recentOrders =
    orders.slice(0, 2);

  const latestOrder =
    recentOrders[0] ?? null;

  const quickLinks = [
    ...(profile?.isReseller
      ? [
          {
            title:
              "Reseller Dashboard",
            subtitle:
              "Wholesale stats, Smart Packs and business profile",
            icon: "◆",
            onClick: () =>
              router.push(
                "/reseller-dashboard",
              ),
          },
        ]
      : []),
    {
      title: "My Orders",
      subtitle:
        "Track retail and reseller orders",
      icon: "📦",
      onClick: () =>
        router.push(
          "/my-orders",
        ),
    },
    {
      title: "Saved Addresses",
      subtitle:
        "Manage delivery locations",
      icon: "📍",
      onClick: () =>
        router.push(
          "/addresses",
        ),
    },
    {
      title: "Wishlist",
      subtitle:
        "Open your saved looks",
      icon: "♡",
      onClick: () =>
        router.push(
          "/wishlist",
        ),
    },
    {
      title: "Shopping Cart",
      subtitle:
        "Continue your current bag",
      icon: "🛍️",
      onClick: () =>
        router.push("/cart"),
    },
  ];

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#211C18] sm:pb-10">
      {accountToast && (
        <div className="fixed left-1/2 top-[78px] z-[130] w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div
            className={`flex items-center gap-3 rounded-[1.35rem] border p-3.5 text-white shadow-[0_20px_55px_rgba(0,0,0,0.3)] backdrop-blur-xl ${
              accountToast.type ===
              "SUCCESS"
                ? "border-emerald-300/25 bg-[#031B14]/95"
                : "border-red-300/25 bg-[#7C3A45]/95"
            }`}
          >
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-black ${
                accountToast.type ===
                "SUCCESS"
                  ? "bg-emerald-400 text-[#031B14]"
                  : "bg-red-400 text-white"
              }`}
            >
              {accountToast.type ===
              "SUCCESS"
                ? "✓"
                : "!"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                AS Fashions
              </p>

              <p className="mt-1 text-[13px] font-black">
                {accountToast.title}
              </p>

              <p className="mt-0.5 text-[9px] font-semibold text-white/55">
                {accountToast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setAccountToast(null)
              }
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#E4D7C4] bg-[#FFFDF9]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="grid h-10 w-10 place-items-center rounded-full border border-black/[0.06] bg-white text-sm font-black"
          >
            ←
          </button>

          <BrandLogo
            compact
            onClick={() =>
              router.push("/")
            }
          />

          <span className="ml-auto rounded-full bg-[#F4EBDD] px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
            My Account
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {loading ? (
          <div className="rounded-[1.8rem] border border-black/[0.05] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-600" />

            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
              Loading Account
            </p>
          </div>
        ) : error ? (
          <div className="rounded-[1.8rem] border border-red-100 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-black">
              Could not load account
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="mt-5 rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white"
            >
              Go Home
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* CLEAN PROFILE HERO */}
            <section className="relative overflow-hidden rounded-[1.8rem] border border-[#E4D7C4] bg-[#FFFDF9] text-[#211C18] shadow-[0_20px_55px_rgba(61,48,37,0.08)]">
              <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#D9C29A]/35 blur-3xl" />
              <div className="pointer-events-none absolute bottom-[-90px] left-[-50px] h-48 w-48 rounded-full bg-[#D4AF37]/10 blur-3xl" />

              <div className="relative p-5 sm:p-7">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#D4AF37]/35 bg-[#F1E8DA] font-serif text-2xl text-[#D4AF37]">
                    {customerInitial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[7px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">
                      My AR Account
                    </p>

                    <h1 className="mt-1 truncate text-[1.65rem] font-black tracking-[-0.035em]">
                      {customerName}
                    </h1>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#7B7066]">
                      <span>{customerPhone}</span>
                      <span>•</span>
                      <span>{customerType}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openProfileEditor}
                    className="shrink-0 rounded-full border border-[#E4D7C4] bg-[#FAF7F0] px-3.5 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-white"
                  >
                    Edit
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-4 divide-x divide-[#E4D7C4] rounded-[1.1rem] border border-[#E4D7C4] bg-[#FAF7F0]">
                  {[
                    [
                      String(orders.length),
                      "Orders",
                    ],
                    [
                      String(wishlistCount),
                      "Wishlist",
                    ],
                    [
                      String(cartCount),
                      "Cart",
                    ],
                    [
                      formatMoney(totalSpend),
                      "Spent",
                    ],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="min-w-0 px-2 py-3 text-center"
                    >
                      <p className="truncate text-[13px] font-black text-[#211C18] sm:text-lg">
                        {value}
                      </p>

                      <p className="mt-1 text-[6px] font-black uppercase tracking-[0.12em] text-[#7B7066] sm:text-[7px]">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* QUICK ACTION TILES */}
            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-[7px] font-black uppercase tracking-[0.22em] text-[#7C3A45]">
                    Account
                  </p>

                  <h2 className="mt-1 text-[1.3rem] font-black tracking-[-0.03em]">
                    Quick Access
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {quickLinks.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={item.onClick}
                    className="group min-h-[112px] rounded-[1.25rem] border border-black/[0.06] bg-white p-4 text-left shadow-[0_7px_20px_rgba(0,0,0,0.035)] transition active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f7f3ee] text-base">
                        {item.icon}
                      </div>

                      <span className="text-sm text-zinc-300 transition group-hover:translate-x-0.5">
                        →
                      </span>
                    </div>

                    <p className="mt-3 text-[13px] font-black leading-tight">
                      {item.title}
                    </p>

                    <p className="mt-1 line-clamp-2 text-[8px] leading-4 text-zinc-400">
                      {item.subtitle}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* ORDER + ACCOUNT INFO */}
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              {/* LATEST ORDER */}
              <section className="overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[#7C3A45]">
                      Orders
                    </p>

                    <h2 className="mt-1 text-[1.2rem] font-black">
                      Latest Order
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/my-orders",
                      )
                    }
                    className="rounded-full border border-black/[0.07] px-3 py-2 text-[8px] font-black uppercase tracking-[0.08em]"
                  >
                    View All
                  </button>
                </div>

                {latestOrder ? (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/my-orders",
                      )
                    }
                    className="w-full p-4 text-left sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-[0.14em] text-zinc-400">
                          Order ID
                        </p>

                        <p className="mt-1 truncate text-[13px] font-black">
                          {latestOrder.orderNumber}
                        </p>

                        <p className="mt-1 text-[9px] text-zinc-400">
                          {formatDate(
                            latestOrder.createdAt,
                          )}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.08em] ${statusTone(
                            latestOrder.status,
                          )}`}
                        >
                          {statusText(
                            latestOrder.status,
                          )}
                        </span>

                        <p className="mt-2 text-lg font-black">
                          {formatMoney(
                            latestOrder.totalAmount,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-[#FAF7F0] p-3">
                        <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                          Payment
                        </p>

                        <p className="mt-1 text-[10px] font-black">
                          {statusText(
                            latestOrder.paymentMethod,
                          )}{" "}
                          ·{" "}
                          {statusText(
                            latestOrder.paymentStatus,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#FAF7F0] p-3">
                        <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                          Delivery
                        </p>

                        <p className="mt-1 truncate text-[10px] font-black">
                          {latestOrder.address
                            ? `${latestOrder.address.city} · ${latestOrder.address.pincode}`
                            : "Address unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-xl bg-[#0b0b0c] px-4 py-3 text-white">
                      <span className="text-[8px] font-semibold text-white/55">
                        Track order details
                      </span>

                      <span className="text-[#D4AF37]">
                        →
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-sm font-black">
                      No orders yet
                    </p>

                    <p className="mt-1 text-[9px] text-zinc-400">
                      Your latest order will appear here.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        router.push("/")
                      }
                      className="mt-4 rounded-full bg-zinc-950 px-5 py-2.5 text-[9px] font-black text-white"
                    >
                      Start Shopping
                    </button>
                  </div>
                )}
              </section>

              {/* ACCOUNT INFORMATION */}
              <section className="overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[#7C3A45]">
                      Personal
                    </p>

                    <h2 className="mt-1 text-[1.2rem] font-black">
                      Account Details
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={openProfileEditor}
                    className="text-[8px] font-black uppercase tracking-[0.08em] text-[#7C3A45]"
                  >
                    Edit
                  </button>
                </div>

                <div className="divide-y divide-black/[0.05] px-4 sm:px-5">
                  <div className="py-4">
                    <p className="text-[7px] font-black uppercase tracking-[0.13em] text-zinc-400">
                      Email
                    </p>

                    <p className="mt-1 break-all text-[11px] font-black text-zinc-800">
                      {customerEmail}
                    </p>
                  </div>

                  <div className="py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[7px] font-black uppercase tracking-[0.13em] text-zinc-400">
                        Default Address
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            "/addresses",
                          )
                        }
                        className="text-[7px] font-black uppercase tracking-[0.08em] text-[#7C3A45]"
                      >
                        Manage
                      </button>
                    </div>

                    {primaryAddress ? (
                      <>
                        <p className="mt-2 text-[11px] font-black">
                          {primaryAddress.name}
                        </p>

                        <p className="mt-1 text-[9px] leading-4 text-zinc-500">
                          {primaryAddress.addressLine1}
                          {primaryAddress.addressLine2
                            ? `, ${primaryAddress.addressLine2}`
                            : ""}
                          ,{" "}
                          {primaryAddress.city},{" "}
                          {primaryAddress.state}{" "}
                          -{" "}
                          {primaryAddress.pincode}
                        </p>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            "/addresses",
                          )
                        }
                        className="mt-2 text-[10px] font-black text-[#7C3A45]"
                      >
                        + Add delivery address
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-[0.13em] text-zinc-400">
                        Account Type
                      </p>

                      <p className="mt-1 text-[11px] font-black">
                        {customerType}
                      </p>
                    </div>

                    <span className="rounded-full bg-[#f7f3ee] px-3 py-1.5 text-[7px] font-black uppercase tracking-[0.08em] text-[#7C3A45]">
                      Active
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* RESELLER */}
            <section className="relative overflow-hidden rounded-[1.5rem] border border-[#D9C29A] bg-gradient-to-r from-[#F1E8DA] via-[#FFF8ED] to-[#FFFDF9] p-5 text-[#211C18]">
              <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[#D4AF37]/10 blur-3xl" />

              <div className="relative flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[7px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                    AR Reseller
                  </p>

                  <h2 className="mt-2 font-serif text-[1.55rem] leading-none">
                    {profile?.isReseller
                      ? "Your wholesale workspace"
                      : "Wholesale shopping"}
                  </h2>

                  <p className="mt-2 max-w-xl text-[9px] leading-4 text-[#7B7066]">
                    {profile?.isReseller
                      ? "Manage reseller orders, bulk shopping and business activity."
                      : "Explore reseller pricing, MOQ-based quantities and bulk-friendly ordering."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      profile?.isReseller ||
                      resellerApplicationStatus ===
                        "APPROVED"
                    ) {
                      router.push(
                        "/reseller-sets",
                      );
                      return;
                    }

                    if (
                      resellerApplicationStatus ===
                        "PENDING" ||
                      resellerApplicationStatus ===
                        "REJECTED"
                    ) {
                      router.push(
                        "/reseller-status",
                      );
                      return;
                    }

                    router.push(
                      "/reseller-apply",
                    );
                  }}
                  className="shrink-0 rounded-full bg-[#D4AF37] px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.08em] text-black"
                >
                  {profile?.isReseller ||
                  resellerApplicationStatus ===
                    "APPROVED"
                    ? "Open Wholesale"
                    : resellerApplicationStatus ===
                        "PENDING"
                      ? "Check Status"
                      : resellerApplicationStatus ===
                          "REJECTED"
                        ? "Review"
                        : "Become a Reseller"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>


      {editProfileOpen && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4">
          <div className="mx-auto my-6 max-w-lg overflow-hidden rounded-[1.8rem] bg-[#FFFDF9] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
            <div className="bg-[#031B14] p-5 text-white sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-300">
                    AS Fashions · Account
                  </p>

                  <h2 className="mt-2 font-serif text-[2rem] leading-none">
                    Personal Information
                  </h2>

                  <p className="mt-3 max-w-sm text-[10px] leading-5 text-[#7B7066]">
                    Keep your account contact information accurate for orders and account communication.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditProfileOpen(
                      false,
                    )
                  }
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black"
                >
                  ✕
                </button>
              </div>
            </div>

            <form
              onSubmit={
                saveProfile
              }
              className="space-y-4 p-5 sm:p-6"
            >
              <div>
                <label className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500">
                  Full Name
                </label>

                <input
                  required
                  value={
                    profileName
                  }
                  onChange={(event) =>
                    setProfileName(
                      event.target.value,
                    )
                  }
                  maxLength={80}
                  placeholder="Enter full name"
                  className="mt-2 w-full rounded-[1rem] border border-black/[0.08] bg-white px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500">
                  Mobile Number
                </label>

                <div className="mt-2 flex overflow-hidden rounded-[1rem] border border-black/[0.08] bg-white focus-within:border-emerald-500">
                  <span className="flex items-center border-r border-black/[0.06] bg-[#FAF7F0] px-4 text-sm font-black text-zinc-500">
                    +91
                  </span>

                  <input
                    required
                    value={
                      profilePhone
                    }
                    onChange={(event) =>
                      setProfilePhone(
                        event.target.value
                          .replace(
                            /\D/g,
                            "",
                          )
                          .slice(
                            0,
                            10,
                          ),
                      )
                    }
                    inputMode="numeric"
                    placeholder="10 digit number"
                    className="min-w-0 flex-1 px-4 py-3.5 text-sm font-semibold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500">
                  Email Address
                </label>

                <input
                  type="email"
                  value={
                    profileEmail
                  }
                  onChange={(event) =>
                    setProfileEmail(
                      event.target.value,
                    )
                  }
                  maxLength={160}
                  placeholder="name@example.com"
                  className="mt-2 w-full rounded-[1rem] border border-black/[0.08] bg-white px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-emerald-500"
                />

                <p className="mt-2 text-[8px] leading-4 text-zinc-400">
                  Email is optional. Mobile number must be unique to your account.
                </p>
              </div>

              <div className="rounded-[1rem] border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-[9px] font-black text-emerald-800">
                  ✓ Secure profile update
                </p>

                <p className="mt-1 text-[8px] leading-4 text-emerald-700/65">
                  Updating personal information does not change your saved delivery addresses. Those can be managed separately.
                </p>
              </div>

              <div className="grid grid-cols-[0.8fr_1.2fr] gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setEditProfileOpen(
                      false,
                    )
                  }
                  className="min-h-[50px] rounded-[1rem] border border-black/[0.08] bg-white text-[10px] font-black uppercase tracking-[0.08em] text-zinc-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    profileSaving
                  }
                  className="min-h-[50px] rounded-[1rem] bg-emerald-600 px-4 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-emerald-600/15 transition active:scale-[0.98] disabled:bg-zinc-300"
                >
                  {profileSaving
                    ? "Saving..."
                    : "Save Changes →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE NAV */}
      <nav className="fixed bottom-2 left-3 right-3 z-50 rounded-[1.35rem] border border-[#E4D7C4] bg-[#FFFDF9]/95 px-1 pb-1.5 pt-1 shadow-[0_18px_55px_rgba(61,48,37,0.14)] backdrop-blur-2xl sm:hidden">
        <div className="grid grid-cols-5 items-end">
          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-[#7B7066]"
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
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-[#7B7066]"
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
            onClick={() =>
              router.push(
                "/my-orders",
              )
            }
            className="relative flex min-h-[52px] flex-col items-center justify-center"
          >
            <span className="-mt-7 grid h-14 w-14 place-items-center rounded-full border-[4px] border-[#031B14] bg-emerald-400 font-serif text-[14px] font-black text-[#031B14] shadow-[0_0_28px_rgba(52,211,153,0.3)]">
              AS
            </span>

            <span className="mt-0.5 text-[7px] font-black text-white">
              Orders
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/cart")
            }
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-[#7B7066]"
          >
            <span className="text-lg">
              🛍
            </span>
            <span className="text-[7px] font-black">
              Cart
            </span>
          </button>

          <button
            type="button"
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-emerald-300"
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

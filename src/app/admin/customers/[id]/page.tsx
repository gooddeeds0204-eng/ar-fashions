"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

type Address = {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2:
    | string
    | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  isDefault: boolean;
  createdAt: string;
};

type Order = {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  paymentStatus: string;
  paymentMethod:
    | string
    | null;
  subtotal: string | number;
  discountAmount:
    | string
    | number;
  deliveryCharge:
    | string
    | number;
  totalAmount:
    | string
    | number;
  couponCode:
    | string
    | null;
  notes: string | null;
  createdAt: string;
  address: {
    name: string;
    phone: string;
    addressLine1:
      string;
    addressLine2:
      | string
      | null;
    city: string;
    state: string;
    pincode: string;
    landmark:
      | string
      | null;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    colorName:
      | string
      | null;
    sizeName:
      | string
      | null;
    quantity: number;
    unitPrice:
      | string
      | number;
    totalPrice:
      | string
      | number;
  }>;
};

type WishlistItem = {
  id: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    status: string;
    retailPrice:
      | string
      | number;
    resellerPrice:
      | string
      | number
      | null;
    category: {
      name: string;
    };
    media: Array<{
      type:
        | "IMAGE"
        | "VIDEO";
      url: string;
      thumbnailUrl:
        | string
        | null;
    }>;
  };
};

type Review = {
  id: string;
  rating: number;
  title:
    | string
    | null;
  comment:
    | string
    | null;
  status: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
  };
};

type ResellerApplication = {
  id: string;
  businessName: string;
  businessPhone:
    | string
    | null;
  gstNumber:
    | string
    | null;
  addressLine:
    | string
    | null;
  city: string;
  state: string;
  pincode:
    | string
    | null;
  mapsUrl:
    | string
    | null;
  latitude:
    | number
    | null;
  longitude:
    | number
    | null;
  locationAccuracy:
    | number
    | null;
  locationCapturedAt:
    | string
    | null;
  visitingCardUrl:
    | string
    | null;
  shopPhotoUrls:
    string[];
  status: string;
  rejectionReason:
    | string
    | null;
  reviewedAt:
    | string
    | null;
  createdAt: string;
};

type CampaignReferral = {
  id: string;
  referralCode: string;
  status: string;
  clickedAt: string;
  qualifiedAt:
    | string
    | null;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
  };
  _count: {
    visits: number;
  };
};

type CampaignClaim = {
  id: string;
  status: string;
  groupJoinAcknowledged:
    boolean;
  orderId:
    | string
    | null;
  claimedAt:
    | string
    | null;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
  };
};

type ReferralVisit = {
  id: string;
  status: string;
  clickedAt: string;
  qualifiedAt:
    | string
    | null;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
  };
};

type CustomerDetail = {
  id: string;
  name:
    | string
    | null;
  email:
    | string
    | null;
  phone:
    | string
    | null;
  role: string;
  status: string;
  isReseller: boolean;
  resellerLevel:
    | string
    | null;
  createdAt: string;
  updatedAt: string;
  addresses: Address[];
  orders: Order[];
  wishlist:
    WishlistItem[];
  reviews: Review[];
  resellerApplication:
    | ResellerApplication
    | null;
  offerReferrals:
    CampaignReferral[];
  campaignClaims:
    CampaignClaim[];
  campaignReferralVisits:
    ReferralVisit[];
  metrics: {
    totalOrders: number;
    deliveredOrders: number;
    totalSpent: number;
    totalOrderValue:
      number;
    addresses: number;
    wishlist: number;
    reviews: number;
    referrals: number;
    referralVisits:
      number;
    claims: number;
  };
};

function money(
  value:
    | string
    | number,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(Number(value));
}

function dateTime(
  value:
    | string
    | null,
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

function tone(
  value: string,
) {
  const normalized =
    value.toUpperCase();

  if (
    [
      "ACTIVE",
      "APPROVED",
      "DELIVERED",
      "PAID",
      "CLAIMED",
      "QUALIFIED",
    ].includes(
      normalized,
    )
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    [
      "BLOCKED",
      "REJECTED",
      "FAILED",
      "CANCELLED",
      "REFUNDED",
    ].includes(
      normalized,
    )
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

export default function Customer360Page() {
  const router =
    useRouter();
  const params =
    useParams<{
      id: string;
    }>();

  const [customer, setCustomer] =
    useState<CustomerDetail | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCustomer() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/api/admin/customers/${params.id}`,
            {
              cache:
                "no-store",
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

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Failed to load customer.",
          );
        }

        if (!cancelled) {
          setCustomer(
            data.customer,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof
              Error
              ? error.message
              : "Failed to load customer.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCustomer();

    return () => {
      cancelled = true;
    };
  }, [
    params.id,
    router,
  ]);

  const lastOrder =
    useMemo(
      () =>
        customer?.orders[0] ??
        null,
      [customer],
    );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] p-6 text-[#211C18]">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-white p-10 text-center shadow-sm">
          Loading Customer 360°...
        </div>
      </main>
    );
  }

  if (
    error ||
    !customer
  ) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] p-6 text-[#211C18]">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-red-200 bg-white p-8">
          <p className="font-black text-red-700">
            {error ||
              "Customer not found."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/customers",
              )
            }
            className="mt-5 rounded-xl bg-[#031B14] px-4 py-3 text-xs font-black text-white"
          >
            Back to Customers
          </button>
        </div>
      </main>
    );
  }

  const application =
    customer.resellerApplication;

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-14 text-[#211C18]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#031B14]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/customers",
              )
            }
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-lg"
          >
            ←
          </button>

          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-[#D9C29A]">
              AS Fashions Admin
            </p>

            <h1 className="truncate font-serif text-xl">
              Customer 360°
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="ml-auto rounded-full border border-white/15 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-white/80"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="overflow-hidden rounded-[2rem] bg-[#031B14] text-white shadow-xl">
          <div className="bg-[radial-gradient(circle_at_85%_18%,rgba(212,175,55,0.18),transparent_30%)] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 font-serif text-2xl text-[#F0D98F]">
                  {(customer.name ||
                    "C")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#D9C29A]">
                    {customer.isReseller
                      ? "Approved Reseller"
                      : "Retail Customer"}
                  </p>

                  <h2 className="mt-2 truncate font-serif text-3xl">
                    {customer.name ||
                      "Customer"}
                  </h2>

                  <p className="mt-2 text-xs text-white/60">
                    Joined{" "}
                    {dateTime(
                      customer.createdAt,
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1.5 text-[9px] font-black ${tone(
                    customer.status,
                  )}`}
                >
                  {customer.status}
                </span>

                {customer.isReseller ? (
                  <span className="rounded-full bg-[#D4AF37] px-3 py-1.5 text-[9px] font-black text-[#031B14]">
                    RESELLER
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-[8px] font-black uppercase tracking-wider text-white/40">
                  Mobile
                </p>
                <p className="mt-2 break-all text-sm font-bold">
                  {customer.phone ||
                    "Not added"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-[8px] font-black uppercase tracking-wider text-white/40">
                  Email
                </p>
                <p className="mt-2 break-all text-sm font-bold">
                  {customer.email ||
                    "Not added"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-[8px] font-black uppercase tracking-wider text-white/40">
                  Last Order
                </p>
                <p className="mt-2 text-sm font-bold">
                  {lastOrder
                    ? dateTime(
                        lastOrder.createdAt,
                      )
                    : "No orders"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            [
              customer.metrics
                .totalOrders,
              "Orders",
            ],
            [
              money(
                customer.metrics
                  .totalSpent,
              ),
              "Delivered Spend",
            ],
            [
              customer.metrics
                .addresses,
              "Addresses",
            ],
            [
              customer.metrics
                .wishlist,
              "Wishlist",
            ],
            [
              customer.metrics
                .reviews,
              "Reviews",
            ],
            [
              customer.metrics
                .referralVisits,
              "Referral Visits",
            ],
          ].map(
            ([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-[#E4D7C4] bg-white p-4 shadow-sm"
              >
                <p className="text-xl font-black">
                  {value}
                </p>
                <p className="mt-1 text-[9px] font-bold text-zinc-400">
                  {label}
                </p>
              </div>
            ),
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.8rem] border border-[#E4D7C4] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#0F5A38]">
                  Saved Details
                </p>
                <h2 className="mt-2 font-serif text-2xl">
                  Addresses
                </h2>
              </div>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-[9px] font-black text-zinc-500">
                {
                  customer.addresses
                    .length
                }
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {customer.addresses
                .length === 0 ? (
                <p className="rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-500">
                  No saved addresses.
                </p>
              ) : (
                customer.addresses.map(
                  (address) => (
                    <div
                      key={
                        address.id
                      }
                      className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black">
                          {
                            address.name
                          }
                        </p>

                        {address.isDefault ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-black text-emerald-700">
                            DEFAULT
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-xs leading-5 text-zinc-600">
                        {
                          address.addressLine1
                        }
                        {address.addressLine2
                          ? `, ${address.addressLine2}`
                          : ""}
                        <br />
                        {
                          address.city
                        }
                        ,{" "}
                        {
                          address.state
                        }{" "}
                        {
                          address.pincode
                        }
                        {address.landmark
                          ? ` · ${address.landmark}`
                          : ""}
                      </p>

                      <p className="mt-2 text-[10px] font-semibold text-zinc-400">
                        {
                          address.phone
                        }
                      </p>
                    </div>
                  ),
                )
              )}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-[#E4D7C4] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#0F5A38]">
                  Purchase History
                </p>
                <h2 className="mt-2 font-serif text-2xl">
                  Orders
                </h2>
              </div>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-[9px] font-black text-zinc-500">
                {
                  customer.orders
                    .length
                }
              </span>
            </div>

            <div className="mt-5 max-h-[650px] space-y-3 overflow-y-auto pr-1">
              {customer.orders
                .length === 0 ? (
                <p className="rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-500">
                  No orders yet.
                </p>
              ) : (
                customer.orders.map(
                  (order) => (
                    <article
                      key={
                        order.id
                      }
                      className="rounded-2xl border border-zinc-100 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black">
                            #
                            {
                              order.orderNumber
                            }
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-400">
                            {
                              dateTime(
                                order.createdAt,
                              )
                            }
                            {" · "}
                            {
                              order.type
                            }
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[8px] font-black ${tone(
                              order.status,
                            )}`}
                          >
                            {
                              order.status
                            }
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[8px] font-black ${tone(
                              order.paymentStatus,
                            )}`}
                          >
                            {
                              order.paymentStatus
                            }
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {order.items.map(
                          (
                            item,
                          ) => (
                            <div
                              key={
                                item.id
                              }
                              className="flex items-start justify-between gap-4 text-[10px]"
                            >
                              <p className="min-w-0 text-zinc-600">
                                <span className="font-bold text-zinc-800">
                                  {
                                    item.productName
                                  }
                                </span>
                                {" × "}
                                {
                                  item.quantity
                                }
                                {item.colorName ||
                                item.sizeName
                                  ? ` · ${[
                                      item.colorName,
                                      item.sizeName,
                                    ]
                                      .filter(
                                        Boolean,
                                      )
                                      .join(
                                        " / ",
                                      )}`
                                  : ""}
                              </p>

                              <span className="shrink-0 font-black">
                                {
                                  money(
                                    item.totalPrice,
                                  )
                                }
                              </span>
                            </div>
                          ),
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-zinc-100 pt-3">
                        <p className="text-[9px] text-zinc-400">
                          Payment:{" "}
                          {
                            order.paymentMethod ||
                            "Not selected"
                          }
                          {order.couponCode
                            ? ` · Coupon ${order.couponCode}`
                            : ""}
                        </p>

                        <p className="text-base font-black">
                          {
                            money(
                              order.totalAmount,
                            )
                          }
                        </p>
                      </div>
                    </article>
                  ),
                )
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.8rem] border border-[#E4D7C4] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#0F5A38]">
                  Saved Products
                </p>
                <h2 className="mt-2 font-serif text-2xl">
                  Wishlist
                </h2>
              </div>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-[9px] font-black text-zinc-500">
                {
                  customer.wishlist
                    .length
                }
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {customer.wishlist
                .length === 0 ? (
                <p className="rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-500 sm:col-span-2">
                  No wishlist items.
                </p>
              ) : (
                customer.wishlist.map(
                  (item) => {
                    const media =
                      item.product
                        .media[0];

                    const image =
                      media?.type ===
                      "IMAGE"
                        ? media.url
                        : media
                            ?.thumbnailUrl;

                    return (
                      <button
                        key={
                          item.id
                        }
                        type="button"
                        onClick={() =>
                          router.push(
                            `/admin/products/${item.product.id}`,
                          )
                        }
                        className="flex gap-3 rounded-2xl border border-zinc-100 p-3 text-left"
                      >
                        <div className="grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#F4EBDD]">
                          {image ? (
                            <img
                              src={
                                image
                              }
                              alt={
                                item
                                  .product
                                  .name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-serif text-xl text-[#6B5435]">
                              AS
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-black">
                            {
                              item
                                .product
                                .name
                            }
                          </p>
                          <p className="mt-1 truncate text-[9px] text-zinc-400">
                            {
                              item
                                .product
                                .category
                                .name
                            }
                          </p>
                          <p className="mt-2 text-xs font-black">
                            {
                              money(
                                item
                                  .product
                                  .retailPrice,
                              )
                            }
                          </p>
                        </div>
                      </button>
                    );
                  },
                )
              )}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-[#E4D7C4] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#0F5A38]">
                  Customer Voice
                </p>
                <h2 className="mt-2 font-serif text-2xl">
                  Reviews
                </h2>
              </div>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-[9px] font-black text-zinc-500">
                {
                  customer.reviews
                    .length
                }
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {customer.reviews
                .length === 0 ? (
                <p className="rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-500">
                  No reviews yet.
                </p>
              ) : (
                customer.reviews.map(
                  (review) => (
                    <div
                      key={
                        review.id
                      }
                      className="rounded-2xl border border-zinc-100 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black">
                            {
                              review.product
                                .name
                            }
                          </p>
                          <p className="mt-1 text-sm text-[#D4AF37]">
                            {
                              "★".repeat(
                                Math.max(
                                  0,
                                  Math.min(
                                    5,
                                    review.rating,
                                  ),
                                ),
                              )
                            }
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[8px] font-black ${tone(
                            review.status,
                          )}`}
                        >
                          {
                            review.status
                          }
                        </span>
                      </div>

                      {review.title ? (
                        <p className="mt-3 text-xs font-black">
                          {
                            review.title
                          }
                        </p>
                      ) : null}

                      {review.comment ? (
                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          {
                            review.comment
                          }
                        </p>
                      ) : null}

                      <p className="mt-3 text-[9px] text-zinc-400">
                        {
                          dateTime(
                            review.createdAt,
                          )
                        }
                      </p>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-[#E4D7C4] bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#0F5A38]">
              Business Access
            </p>
            <h2 className="mt-2 font-serif text-2xl">
              Reseller Profile
            </h2>
          </div>

          {!application ? (
            <p className="mt-5 rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-500">
              This customer has not submitted a reseller application.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    "Business",
                    application.businessName,
                  ],
                  [
                    "Business Phone",
                    application.businessPhone ||
                      "Not provided",
                  ],
                  [
                    "GSTIN",
                    application.gstNumber ||
                      "Not provided",
                  ],
                  [
                    "Status",
                    application.status,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={
                        label
                      }
                      className="rounded-2xl bg-zinc-50 p-4"
                    >
                      <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">
                        {
                          label
                        }
                      </p>
                      <p className="mt-2 break-words text-xs font-black">
                        {
                          value
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>

              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400">
                  Business Address
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-700">
                  {application.addressLine ||
                    "Address not provided"}
                  <br />
                  {application.city}
                  {", "}
                  {application.state}
                  {application.pincode
                    ? ` · ${application.pincode}`
                    : ""}
                </p>

                {application.mapsUrl ? (
                  <a
                    href={
                      application.mapsUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[9px] font-black text-emerald-700"
                  >
                    Open Maps →
                  </a>
                ) : null}
              </div>

              {(application.visitingCardUrl ||
                application.shopPhotoUrls
                  .length > 0) ? (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                    Verification Media
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {application.visitingCardUrl ? (
                      <a
                        href={
                          application.visitingCardUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50"
                      >
                        <img
                          src={
                            application.visitingCardUrl
                          }
                          alt="Visiting card"
                          className="aspect-[4/3] w-full object-cover"
                        />
                        <p className="p-2 text-[9px] font-black">
                          Visiting Card
                        </p>
                      </a>
                    ) : null}

                    {application.shopPhotoUrls.map(
                      (
                        url,
                        index,
                      ) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50"
                        >
                          <img
                            src={url}
                            alt={`Shop photo ${index + 1}`}
                            className="aspect-[4/3] w-full object-cover"
                          />
                          <p className="p-2 text-[9px] font-black">
                            Shop{" "}
                            {
                              index +
                              1
                            }
                          </p>
                        </a>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              {application.rejectionReason ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-[8px] font-black uppercase tracking-wider text-red-500">
                    Rejection Reason
                  </p>
                  <p className="mt-2 text-xs leading-5 text-red-700">
                    {
                      application.rejectionReason
                    }
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="rounded-[1.8rem] border border-[#E4D7C4] bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#0F5A38]">
              Promotion Activity
            </p>
            <h2 className="mt-2 font-serif text-2xl">
              Campaign & Referral Activity
            </h2>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                Shared Referrals
              </p>

              <div className="mt-3 space-y-2">
                {customer.offerReferrals
                  .length === 0 ? (
                  <p className="rounded-xl bg-zinc-50 p-3 text-[10px] text-zinc-500">
                    No referral links.
                  </p>
                ) : (
                  customer.offerReferrals.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-xl border border-zinc-100 p-3"
                      >
                        <p className="text-xs font-black">
                          {
                            item.campaign
                              .title
                          }
                        </p>
                        <p className="mt-1 text-[9px] text-zinc-400">
                          Code:{" "}
                          {
                            item.referralCode
                          }
                          {" · "}
                          {
                            item._count
                              .visits
                          }{" "}
                          visits
                        </p>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                Reward Claims
              </p>

              <div className="mt-3 space-y-2">
                {customer.campaignClaims
                  .length === 0 ? (
                  <p className="rounded-xl bg-zinc-50 p-3 text-[10px] text-zinc-500">
                    No campaign claims.
                  </p>
                ) : (
                  customer.campaignClaims.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-xl border border-zinc-100 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-black">
                            {
                              item.campaign
                                .title
                            }
                          </p>
                          <span
                            className={`rounded-full px-2 py-1 text-[8px] font-black ${tone(
                              item.status,
                            )}`}
                          >
                            {
                              item.status
                            }
                          </span>
                        </div>
                        <p className="mt-1 text-[9px] text-zinc-400">
                          Group step:{" "}
                          {item.groupJoinAcknowledged
                            ? "Done"
                            : "Not done"}
                        </p>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                Referred Visits
              </p>

              <div className="mt-3 space-y-2">
                {customer.campaignReferralVisits
                  .length === 0 ? (
                  <p className="rounded-xl bg-zinc-50 p-3 text-[10px] text-zinc-500">
                    No referred campaign visits.
                  </p>
                ) : (
                  customer.campaignReferralVisits.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-xl border border-zinc-100 p-3"
                      >
                        <p className="text-xs font-black">
                          {
                            item.campaign
                              .title
                          }
                        </p>
                        <p className="mt-1 text-[9px] text-zinc-400">
                          {
                            item.status
                          }
                          {" · "}
                          {
                            dateTime(
                              item.createdAt,
                            )
                          }
                        </p>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        <p className="px-2 text-[9px] leading-5 text-zinc-400">
          Security note: customer passwords and full payment-card/bank credentials are never displayed in Customer 360°.
        </p>
      </div>
    </main>
  );
}

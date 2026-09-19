"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

type OrderItem = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  colorName: string;
  sizeName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string | null;
};

type CustomerReview = {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: string;
};

type Shipment = {
  provider?: string;
  shipmentId?: number;
  awbCode?: string;
  courierName?: string;
  courierRate?: number;
  estimatedDeliveryDays?:
    | string
    | number;
  etd?: string | null;
  pickupScheduled?: boolean;
  serviceType?:
    | "PARCEL"
    | "TRANSPORT";
  serviceName?: string;
  agencyContact?: string;
  branch?: string;
  serviceArea?: string;
  referenceNumber?: string;
  estimatedDelivery?: string | null;
  notes?: string | null;
  lrImageUrl?: string | null;
  dispatchedAt?: string;
  createdAt?: string;
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
  items: OrderItem[];
  shipment:
    | Shipment
    | null;
  address: {
    name: string;
    phone: string;
    addressLine1: string;
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
};

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
  ).format(value);
}

function statusText(
  status: string,
) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

const ORDER_STAGES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

function orderProgressStep(
  status: string,
) {
  if (status === "CANCELLED") {
    return -1;
  }

  const index =
    ORDER_STAGES.indexOf(
      status as
        (typeof ORDER_STAGES)[number],
    );

  return index >= 0 ? index : 0;
}

function statusTone(
  status: string,
) {
  if (status === "DELIVERED") {
    return "border-emerald-200 bg-[#F4EBDD] text-[#6B5435]";
  }

  if (status === "CANCELLED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    status === "SHIPPED" ||
    status === "PROCESSING"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "CONFIRMED") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function formatOrderDate(
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

export default function MyOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    trackingByOrder,
    setTrackingByOrder,
  ] = useState<
    Record<string, string>
  >({});

  const [
    reviewsByProduct,
    setReviewsByProduct,
  ] = useState<
    Record<string, CustomerReview>
  >({});

  async function refreshTracking(
    order: Order,
  ) {
    if (
      !order.shipment
        ?.awbCode
    ) {
      return;
    }

    setTrackingByOrder(
      (current) => ({
        ...current,
        [order.id]:
          "Refreshing...",
      }),
    );

    try {
      const response =
        await fetch(
          `/api/shipping/order?orderNumber=${encodeURIComponent(
            order.orderNumber,
          )}`,
          {
            cache:
              "no-store",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Tracking failed.",
        );
      }

      const tracking =
        data.tracking &&
        typeof data.tracking ===
          "object"
          ? (data.tracking as Record<
              string,
              unknown
            >)
          : null;

      const trackingData =
        tracking
          ?.tracking_data &&
        typeof tracking
          .tracking_data ===
          "object"
          ? (tracking.tracking_data as Record<
              string,
              unknown
            >)
          : null;

      const shipmentTrack =
        Array.isArray(
          trackingData
            ?.shipment_track,
        )
          ? trackingData!
              .shipment_track as Array<
              Record<
                string,
                unknown
              >
            >
          : [];

      const status =
        String(
          shipmentTrack[0]
            ?.current_status ??
            trackingData
              ?.track_status ??
            "Tracking refreshed",
        );

      setTrackingByOrder(
        (current) => ({
          ...current,
          [order.id]:
            status,
        }),
      );
    } catch (error) {
      setTrackingByOrder(
        (current) => ({
          ...current,
          [order.id]:
            error instanceof Error
              ? error.message
              : "Tracking failed.",
        }),
      );
    }
  }

  const [
    reviewProduct,
    setReviewProduct,
  ] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [reviewRating, setReviewRating] =
    useState(5);

  const [reviewTitle, setReviewTitle] =
    useState("");

  const [reviewComment, setReviewComment] =
    useState("");

  const [reviewSaving, setReviewSaving] =
    useState(false);

  useEffect(() => {
    async function loadOrders() {
      try {
        const response =
          await fetch(
            "/api/my-orders",
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
              "Failed to load orders.",
          );
        }

        setOrders(
          Array.isArray(
            data.orders,
          )
            ? data.orders
            : [],
        );

        const reviewsResponse =
          await fetch(
            "/api/reviews?mine=1",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        if (reviewsResponse.ok) {
          const reviewsData =
            await reviewsResponse.json();

          const reviewMap:
            Record<
              string,
              CustomerReview
            > = {};

          for (
            const review of
            Array.isArray(
              reviewsData.reviews,
            )
              ? reviewsData.reviews
              : []
          ) {
            reviewMap[
              review.productId
            ] = review;
          }

          setReviewsByProduct(
            reviewMap,
          );
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load orders.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  function openReview(
    item: OrderItem,
  ) {
    const existing =
      reviewsByProduct[
        item.productId
      ];

    setReviewProduct({
      id: item.productId,
      name: item.productName,
    });

    setReviewRating(
      existing?.rating ?? 5,
    );

    setReviewTitle(
      existing?.title ?? "",
    );

    setReviewComment(
      existing?.comment ?? "",
    );
  }

  async function submitReview() {
    if (!reviewProduct) {
      return;
    }

    if (!reviewComment.trim()) {
      alert(
        "Please write your review.",
      );
      return;
    }

    try {
      setReviewSaving(true);

      const response =
        await fetch(
          "/api/reviews",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              productId:
                reviewProduct.id,
              rating:
                reviewRating,
              title:
                reviewTitle.trim(),
              comment:
                reviewComment.trim(),
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to submit review.",
        );
      }

      setReviewsByProduct(
        (current) => ({
          ...current,
          [reviewProduct.id]:
            data.review,
        }),
      );

      setReviewProduct(null);

      alert(
        "Review submitted for approval.",
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to submit review.",
      );
    } finally {
      setReviewSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-12 text-zinc-950">
      {/* PREMIUM HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#E4D7C4] bg-[#FFFDF9]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between px-4 sm:px-6">
          <BrandLogo
            compact
            onClick={() =>
              router.push("/")
            }
          />

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="rounded-full border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-2.5 text-[10px] font-black shadow-sm transition active:scale-[0.98]"
          >
            Shop More →
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* PAGE TITLE */}
        <section className="mb-6">
          <p className="text-[8px] font-black uppercase tracking-[0.28em] text-[#6B5435]">
            AS Fashions · Account
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-[2.35rem] leading-none tracking-[-0.04em] sm:text-5xl">
                My Orders
              </h1>

              <p className="mt-2 text-[11px] text-zinc-500 sm:text-sm">
                Track purchases, payment and delivery details in one place.
              </p>
            </div>

            {!loading &&
              !error &&
              orders.length > 0 && (
                <span className="rounded-full bg-[#031B14] px-3 py-2 text-[9px] font-black text-white">
                  {orders.length}{" "}
                  {orders.length === 1
                    ? "Order"
                    : "Orders"}
                </span>
              )}
          </div>
        </section>

        {/* ORDER STATS */}
        {!loading &&
          !error &&
          orders.length > 0 && (
            <section className="mb-6 grid grid-cols-3 gap-2">
              <div className="rounded-[1.3rem] border border-[#E4D7C4] bg-[#FFFDF9] p-3.5 shadow-sm">
                <p className="text-[7px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Total
                </p>

                <p className="mt-1 text-xl font-black">
                  {orders.length}
                </p>
              </div>

              <div className="rounded-[1.3rem] border border-[#E4D7C4] bg-[#FFFDF9] p-3.5 shadow-sm">
                <p className="text-[7px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Active
                </p>

                <p className="mt-1 text-xl font-black text-amber-600">
                  {
                    orders.filter(
                      (order) =>
                        order.status !==
                          "DELIVERED" &&
                        order.status !==
                          "CANCELLED",
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-[1.3rem] border border-[#E4D7C4] bg-[#FFFDF9] p-3.5 shadow-sm">
                <p className="text-[7px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Delivered
                </p>

                <p className="mt-1 text-xl font-black text-[#031B14]">
                  {
                    orders.filter(
                      (order) =>
                        order.status ===
                        "DELIVERED",
                    ).length
                  }
                </p>
              </div>
            </section>
          )}

        {loading ? (
          <div className="rounded-[1.7rem] border border-[#E4D7C4] bg-[#FFFDF9] p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-500" />

            <p className="mt-4 text-[11px] font-bold text-zinc-500">
              Loading your orders...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-[1.7rem] border border-red-100 bg-[#FFFDF9] p-8 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-xl">
              !
            </div>

            <h2 className="mt-4 text-lg font-black">
              Unable to load orders
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="mt-5 rounded-xl bg-[#031B14] px-5 py-3 text-sm font-black text-white"
            >
              Back to Shop
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-[1.8rem] border border-[#E4D7C4] bg-[#FFFDF9] px-6 py-14 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#F4EBDD] text-2xl">
              🛍
            </div>

            <h2 className="mt-5 text-xl font-black">
              No orders yet
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
              Your retail and reseller orders will appear here with complete tracking details.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="mt-6 rounded-2xl bg-[#031B14] px-7 py-3.5 text-sm font-black text-white"
            >
              Start Shopping →
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map(
              (
                order,
                index,
              ) => {
                const currentStep =
                  orderProgressStep(
                    order.status,
                  );

                const cancelled =
                  order.status ===
                  "CANCELLED";

                const totalQuantity =
                  order.items.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.quantity,
                    0,
                  );

                return (
                  <details
                    key={order.id}
                    open={index === 0}
                    className="group overflow-hidden rounded-[1.65rem] border border-[#E4D7C4] bg-[#FFFDF9] shadow-[0_12px_35px_rgba(0,0,0,0.045)]"
                  >
                    {/* ORDER SUMMARY HEADER */}
                    <summary className="cursor-pointer list-none p-4 outline-none sm:p-5 [&::-webkit-details-marker]:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] ${statusTone(
                                order.status,
                              )}`}
                            >
                              {statusText(
                                order.status,
                              )}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] ${
                                order.type ===
                                "RESELLER"
                                  ? "bg-emerald-900 text-emerald-100"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {order.type}
                            </span>
                          </div>

                          <p className="mt-3 text-[8px] font-black uppercase tracking-[0.16em] text-zinc-400">
                            Order Number
                          </p>

                          <h2 className="mt-1 break-all text-[15px] font-black tracking-[-0.02em] sm:text-lg">
                            {
                              order.orderNumber
                            }
                          </h2>

                          <p className="mt-1 text-[10px] text-zinc-400">
                            {formatOrderDate(
                              order.createdAt,
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-400">
                            Order Total
                          </p>

                          <p className="mt-1 text-xl font-black tracking-[-0.04em]">
                            {formatMoney(
                              order.totalAmount,
                            )}
                          </p>

                          <p className="mt-1 text-[9px] font-semibold text-zinc-400">
                            {totalQuantity}{" "}
                            {totalQuantity ===
                            1
                              ? "piece"
                              : "pieces"}
                          </p>

                          <span className="mt-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm font-black transition group-open:rotate-180">
                            ↓
                          </span>
                        </div>
                      </div>

                      {/* MINI STATUS TIMELINE */}
                      {!cancelled ? (
                        <div className="mt-5">
                          <div className="grid grid-cols-5">
                            {ORDER_STAGES.map(
                              (
                                stage,
                                stageIndex,
                              ) => {
                                const reached =
                                  stageIndex <=
                                  currentStep;

                                return (
                                  <div
                                    key={
                                      stage
                                    }
                                    className="relative text-center"
                                  >
                                    {stageIndex >
                                      0 && (
                                      <span
                                        className={`absolute right-1/2 top-[6px] h-[2px] w-full ${
                                          stageIndex <=
                                          currentStep
                                            ? "bg-[#D4AF37]"
                                            : "bg-zinc-200"
                                        }`}
                                      />
                                    )}

                                    <span
                                      className={`relative z-10 mx-auto block h-3.5 w-3.5 rounded-full border-2 ${
                                        reached
                                          ? "border-emerald-500 bg-[#D4AF37]"
                                          : "border-zinc-200 bg-[#FFFDF9]"
                                      }`}
                                    />

                                    <p
                                      className={`mt-2 hidden text-[6px] font-black uppercase tracking-wide min-[360px]:block ${
                                        reached
                                          ? "text-[#6B5435]"
                                          : "text-zinc-300"
                                      }`}
                                    >
                                      {statusText(
                                        stage,
                                      )}
                                    </p>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
                          This order was cancelled.
                        </div>
                      )}
                    </summary>

                    {/* EXPANDED DETAILS */}
                    <div className="border-t border-[#E4D7C4]">
                      {/* ITEMS */}
                      <section className="p-4 sm:p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#6B5435]">
                              Order Items
                            </p>

                            <h3 className="mt-1 text-base font-black">
                              What you ordered
                            </h3>
                          </div>

                          <span className="rounded-full bg-[#FAF7F0] px-3 py-1.5 text-[9px] font-black text-zinc-500">
                            {
                              order.items
                                .length
                            }{" "}
                            {
                              order.items
                                .length ===
                              1
                                ? "item"
                                : "items"
                            }
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {order.items.map(
                            (item) => {
                              const existingReview =
                                reviewsByProduct[
                                  item
                                    .productId
                                ];

                              return (
                                <article
                                  key={
                                    item.id
                                  }
                                  className="rounded-[1.25rem] border border-[#E4D7C4] bg-[#FAF7F0] p-3.5"
                                >
                                  <div className="flex gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        router.push(
                                          `/products/${item.productId}?mode=${
                                            order.type ===
                                            "RESELLER"
                                              ? "reseller"
                                              : "retail"
                                          }`,
                                        )
                                      }
                                      className="h-[74px] w-[64px] shrink-0 overflow-hidden rounded-xl bg-[#031B14]"
                                    >
                                      {item.image ? (
                                        <img
                                          src={
                                            item.image
                                          }
                                          alt={
                                            item.productName
                                          }
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <span className="grid h-full w-full place-items-center font-serif text-lg text-white">
                                          AS
                                        </span>
                                      )}
                                    </button>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="line-clamp-2 text-[13px] font-black leading-5">
                                            {
                                              item.productName
                                            }
                                          </p>

                                          <p className="mt-1 text-[9px] font-medium text-zinc-500">
                                            {
                                              item.colorName
                                            }{" "}
                                            · Size{" "}
                                            {
                                              item.sizeName
                                            }
                                          </p>
                                        </div>

                                        <p className="shrink-0 text-[13px] font-black">
                                          {formatMoney(
                                            item.totalPrice,
                                          )}
                                        </p>
                                      </div>

                                      <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-[#FFFDF9] px-2.5 py-1 text-[8px] font-bold text-zinc-500">
                                          Qty{" "}
                                          {
                                            item.quantity
                                          }
                                        </span>

                                        <span className="rounded-full bg-[#FFFDF9] px-2.5 py-1 text-[8px] font-bold text-zinc-500">
                                          {formatMoney(
                                            item.unitPrice,
                                          )}{" "}
                                          each
                                        </span>

                                        {order.status ===
                                          "DELIVERED" &&
                                          existingReview && (
                                          <span className="rounded-full bg-[#F4EBDD] px-2.5 py-1 text-[7px] font-black uppercase text-[#6B5435]">
                                            Review{" "}
                                            {
                                              existingReview.status
                                            }
                                          </span>
                                        )}
                                      </div>

                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            router.push(
                                              `/products/${item.productId}?mode=${
                                                order.type ===
                                                "RESELLER"
                                                  ? "reseller"
                                                  : "retail"
                                              }`,
                                            )
                                          }
                                          className="rounded-lg border border-[#E4D7C4] bg-[#FFFDF9] px-3 py-2 text-[8px] font-black"
                                        >
                                          View Product
                                        </button>

                                        {order.status ===
                                          "DELIVERED" && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openReview(
                                                item,
                                              )
                                            }
                                            className="rounded-lg bg-[#031B14] px-3 py-2 text-[8px] font-black text-white"
                                          >
                                            {existingReview
                                              ? "Edit Review"
                                              : "Write Review"}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </article>
                              );
                            },
                          )}
                        </div>
                      </section>

                      {/* PRICE BREAKDOWN */}
                      <section className="border-t border-[#E4D7C4] bg-[#FAF7F0] p-4 sm:p-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-[1.25rem] border border-[#E4D7C4] bg-[#FFFDF9] p-4">
                            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#6B5435]">
                              Price Details
                            </p>

                            <div className="mt-4 space-y-3 text-[11px]">
                              <div className="flex justify-between gap-3">
                                <span className="text-zinc-500">
                                  Subtotal
                                </span>

                                <span className="font-black">
                                  {formatMoney(
                                    order.subtotal,
                                  )}
                                </span>
                              </div>

                              {order.discountAmount >
                                0 && (
                                <div className="flex justify-between gap-3 text-[#6B5435]">
                                  <span>
                                    Discount
                                  </span>

                                  <span className="font-black">
                                    -
                                    {formatMoney(
                                      order.discountAmount,
                                    )}
                                  </span>
                                </div>
                              )}

                              <div className="flex justify-between gap-3">
                                <span className="text-zinc-500">
                                  Delivery
                                </span>

                                <span
                                  className={`font-black ${
                                    order.deliveryCharge ===
                                    0
                                      ? "text-[#6B5435]"
                                      : ""
                                  }`}
                                >
                                  {order.deliveryCharge ===
                                  0
                                    ? "FREE"
                                    : formatMoney(
                                        order.deliveryCharge,
                                      )}
                                </span>
                              </div>

                              <div className="border-t border-[#E4D7C4] pt-3">
                                <div className="flex items-end justify-between gap-3">
                                  <span className="font-black">
                                    Total Paid / Due
                                  </span>

                                  <span className="text-lg font-black">
                                    {formatMoney(
                                      order.totalAmount,
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* PAYMENT */}
                          <div className="rounded-[1.25rem] border border-[#E4D7C4] bg-[#FFFDF9] p-4">
                            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#6B5435]">
                              Payment
                            </p>

                            <div className="mt-4 flex items-center gap-3">
                              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F4EBDD] text-sm font-black text-[#6B5435]">
                                ₹
                              </span>

                              <div>
                                <p className="text-[12px] font-black">
                                  {statusText(
                                    order.paymentMethod,
                                  )}
                                </p>

                                <p className="mt-1 text-[9px] font-medium text-zinc-400">
                                  Payment{" "}
                                  {statusText(
                                    order.paymentStatus,
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 rounded-xl bg-[#FAF7F0] px-3 py-3">
                              <p className="text-[9px] font-bold text-zinc-600">
                                Order type:{" "}
                                <span className="font-black">
                                  {
                                    order.type
                                  }
                                </span>
                              </p>

                              <p className="mt-1 text-[9px] font-bold text-zinc-600">
                                Placed:{" "}
                                <span className="font-black">
                                  {formatOrderDate(
                                    order.createdAt,
                                  )}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* DELIVERY ADDRESS */}
                      {order.shipment?.provider ===
                      "MANUAL_BULK" &&
                      order.shipment
                        .referenceNumber ? (
                        <section className="border-t border-[#E4D7C4] p-4 sm:p-5">
                          <div className="rounded-[1.3rem] border border-violet-200 bg-violet-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-violet-700">
                                  Bulk Dispatch
                                </p>

                                <h3 className="mt-1 text-[13px] font-black text-violet-950">
                                  {order.shipment.serviceName ||
                                    "Parcel / Transport"}
                                </h3>

                                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.08em] text-violet-600">
                                  {order.shipment.serviceType ===
                                  "TRANSPORT"
                                    ? "Transport Agency"
                                    : "Parcel Service"}
                                </p>
                              </div>

                              <span className="rounded-full bg-violet-800 px-3 py-1.5 text-[7px] font-black uppercase tracking-[0.08em] text-white">
                                Dispatched
                              </span>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-xl bg-white p-3">
                                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                                  LR / Tracking Number
                                </p>

                                <p className="mt-1 break-all text-[11px] font-black">
                                  {order.shipment.referenceNumber}
                                </p>
                              </div>

                              <div className="rounded-xl bg-white p-3">
                                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                                  Delivery Estimate
                                </p>

                                <p className="mt-1 text-[11px] font-black">
                                  {order.shipment.estimatedDelivery ||
                                    "Contact agency for estimate"}
                                </p>
                              </div>

                              {order.shipment.branch && (
                                <div className="rounded-xl bg-white p-3">
                                  <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                                    Branch
                                  </p>

                                  <p className="mt-1 text-[11px] font-black">
                                    {order.shipment.branch}
                                  </p>
                                </div>
                              )}

                              {order.shipment.agencyContact && (
                                <div className="rounded-xl bg-white p-3">
                                  <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                                    Agency Contact
                                  </p>

                                  <p className="mt-1 text-[11px] font-black">
                                    {order.shipment.agencyContact}
                                  </p>
                                </div>
                              )}
                            </div>

                            {order.shipment.notes && (
                              <p className="mt-3 text-[9px] leading-5 text-violet-700">
                                {order.shipment.notes}
                              </p>
                            )}

                            {order.shipment.lrImageUrl && (
                              <div className="mt-4 overflow-hidden rounded-xl border border-violet-200 bg-white">
                                <img
                                  src={order.shipment.lrImageUrl}
                                  alt="LR / dispatch receipt"
                                  className="max-h-[320px] w-full object-contain"
                                />
                              </div>
                            )}
                          </div>
                        </section>
                      ) : order.shipment?.awbCode ? (
                        <section className="border-t border-[#E4D7C4] p-4 sm:p-5">
                          <div className="rounded-[1.3rem] border border-[#D4AF37]/25 bg-[#F8F1E7] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#6B5435]">
                                  Courier Tracking
                                </p>

                                <h3 className="mt-1 text-[13px] font-black">
                                  {order.shipment.courierName || "Shiprocket"}
                                </h3>
                              </div>

                              <span className="rounded-full bg-[#031B14] px-3 py-1.5 text-[7px] font-black uppercase tracking-[0.08em] text-[#FFFDF9]">
                                Shipped
                              </span>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-xl bg-[#FFFDF9] p-3">
                                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                                  AWB Number
                                </p>
                                <p className="mt-1 break-all text-[11px] font-black">
                                  {order.shipment.awbCode}
                                </p>
                              </div>

                              <div className="rounded-xl bg-[#FFFDF9] p-3">
                                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                                  Estimate
                                </p>
                                <p className="mt-1 text-[11px] font-black">
                                  {order.shipment.estimatedDeliveryDays
                                    ? String(
                                        order.shipment
                                          .estimatedDeliveryDays,
                                      ) + " days"
                                    : order.shipment.etd ||
                                      "Courier estimate pending"}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                refreshTracking(
                                  order,
                                )
                              }
                              className="mt-3 rounded-full bg-[#031B14] px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.08em] text-[#FFFDF9]"
                            >
                              Refresh Tracking
                            </button>

                            {trackingByOrder[
                              order.id
                            ] && (
                              <p className="mt-3 text-[9px] font-bold leading-5 text-[#6B5435]">
                                {
                                  trackingByOrder[
                                    order.id
                                  ]
                                }
                              </p>
                            )}
                          </div>
                        </section>
                      ) : null}

                      {order.address && (
                        <section className="border-t border-[#E4D7C4] p-4 sm:p-5">
                          <div className="rounded-[1.3rem] border border-[#E4D7C4] bg-[#FFFDF9] p-4">
                            <div className="flex items-start gap-3">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F4EBDD] text-sm">
                                ⌂
                              </span>

                              <div className="min-w-0">
                                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#6B5435]">
                                  Delivery Address
                                </p>

                                <p className="mt-2 text-[12px] font-black">
                                  {
                                    order
                                      .address
                                      .name
                                  }
                                </p>

                                <p className="mt-2 text-[11px] leading-5 text-zinc-600">
                                  {
                                    order
                                      .address
                                      .addressLine1
                                  }
                                  {order
                                    .address
                                    .addressLine2
                                    ? `, ${order.address.addressLine2}`
                                    : ""}
                                  {order
                                    .address
                                    .landmark
                                    ? `, Near ${order.address.landmark}`
                                    : ""}
                                  ,{" "}
                                  {
                                    order
                                      .address
                                      .city
                                  }
                                  ,{" "}
                                  {
                                    order
                                      .address
                                      .state
                                  }{" "}
                                  -{" "}
                                  {
                                    order
                                      .address
                                      .pincode
                                  }
                                </p>

                                <p className="mt-2 text-[10px] font-semibold text-zinc-400">
                                  Phone:{" "}
                                  {
                                    order
                                      .address
                                      .phone
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </section>
                      )}

                      {/* ORDER FOOTER */}
                      <div className="flex items-center justify-between gap-3 border-t border-[#E4D7C4] bg-[#031B14] px-4 py-3.5 text-white sm:px-5">
                        <div>
                          <p className="text-[7px] font-black uppercase tracking-[0.16em] text-[#D9C29A]">
                            Current Status
                          </p>

                          <p className="mt-1 text-[11px] font-black">
                            {statusText(
                              order.status,
                            )}
                          </p>
                        </div>

                        {order.items[0] && (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/products/${order.items[0].productId}?mode=${
                                  order.type ===
                                  "RESELLER"
                                    ? "reseller"
                                    : "retail"
                                }`,
                              )
                            }
                            className="rounded-full bg-[#FFFDF9] px-4 py-2.5 text-[8px] font-black text-[#031B14]"
                          >
                            Shop Again →
                          </button>
                        )}
                      </div>
                    </div>
                  </details>
                );
              },
            )}
          </div>
        )}
      </div>

      {reviewProduct && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-10 max-w-lg rounded-3xl bg-[#FFFDF9] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Verified Purchase
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Write a Review
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {
                    reviewProduct.name
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setReviewProduct(
                    null,
                  )
                }
                className="rounded-full bg-zinc-100 px-3 py-2 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <p className="text-xs font-bold">
                Your Rating
              </p>

              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map(
                  (star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setReviewRating(
                          star,
                        )
                      }
                      className="text-3xl"
                    >
                      {star <=
                      reviewRating
                        ? "★"
                        : "☆"}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className="text-xs font-bold">
                Review Title
              </label>

              <input
                value={
                  reviewTitle
                }
                onChange={(event) =>
                  setReviewTitle(
                    event.target.value,
                  )
                }
                maxLength={100}
                placeholder="Example: Great quality"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="mt-5">
              <label className="text-xs font-bold">
                Your Review
              </label>

              <textarea
                value={
                  reviewComment
                }
                onChange={(event) =>
                  setReviewComment(
                    event.target.value,
                  )
                }
                maxLength={1000}
                rows={5}
                placeholder="Tell other customers about the product..."
                className="mt-2 w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button
              type="button"
              disabled={
                reviewSaving
              }
              onClick={
                submitReview
              }
              className="mt-6 w-full rounded-2xl bg-[#031B14] py-4 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {reviewSaving
                ? "Submitting..."
                : "Submit Review"}
            </button>

            <p className="mt-3 text-center text-[10px] leading-5 text-zinc-400">
              Reviews are published
              after moderation.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

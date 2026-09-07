"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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
};

type CustomerReview = {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: string;
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

export default function MyOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    reviewsByProduct,
    setReviewsByProduct,
  ] = useState<
    Record<string, CustomerReview>
  >({});

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
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              AR Fashions
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              My Orders
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            Continue Shopping
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            Loading your orders...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-zinc-900">
              {error}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Your orders are protected
              by your customer session.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Shop Now
            </button>
          </div>
        ) : orders.length ===
          0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold">
              No orders yet
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Your future retail and
              reseller orders will
              appear here.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(
              (order) => (
                <section
                  key={order.id}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 p-4">
                    <div>
                      <p className="text-xs font-medium text-zinc-500">
                        Order
                      </p>

                      <p className="font-bold">
                        {
                          order.orderNumber
                        }
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {new Date(
                          order.createdAt,
                        ).toLocaleString(
                          "en-IN",
                          {
                            dateStyle:
                              "medium",
                            timeStyle:
                              "short",
                          },
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold">
                          {
                            order.type
                          }
                        </span>

                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                          {statusText(
                            order.status,
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-lg font-bold">
                        {formatMoney(
                          order.totalAmount,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-zinc-100">
                    {order.items.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className="flex items-center justify-between gap-4 p-4"
                        >
                          <div>
                            <p className="font-semibold">
                              {
                                item.productName
                              }
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {
                                item.colorName
                              }{" "}
                              · Size{" "}
                              {
                                item.sizeName
                              }{" "}
                              · Qty{" "}
                              {
                                item.quantity
                              }
                            </p>

                            {order.status ===
                              "DELIVERED" && (
                              <button
                                type="button"
                                onClick={() =>
                                  openReview(
                                    item,
                                  )
                                }
                                className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                              >
                                {reviewsByProduct[
                                  item.productId
                                ]
                                  ? "Edit Review"
                                  : "Write Review"}
                              </button>
                            )}

                            {reviewsByProduct[
                              item.productId
                            ] && (
                              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Review:{" "}
                                {
                                  reviewsByProduct[
                                    item.productId
                                  ].status
                                }
                              </p>
                            )}
                          </div>

                          <p className="font-semibold">
                            {formatMoney(
                              item.totalPrice,
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="grid gap-4 bg-zinc-50 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Payment
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {
                          order.paymentMethod
                        }{" "}
                        ·{" "}
                        {statusText(
                          order.paymentStatus,
                        )}
                      </p>
                    </div>

                    {order.address && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Delivery Address
                        </p>

                        <p className="mt-1 text-sm">
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
                      </div>
                    )}
                  </div>
                </section>
              ),
            )}
          </div>
        )}
      </div>

      {reviewProduct && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-10 max-w-lg rounded-3xl bg-white p-6 shadow-xl">
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
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
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
                className="mt-2 w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
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
              className="mt-6 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white disabled:bg-zinc-300"
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

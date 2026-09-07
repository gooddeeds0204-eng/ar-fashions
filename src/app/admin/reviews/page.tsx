"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status:
    | "PENDING"
    | "APPROVED"
    | "HIDDEN";
  createdAt: string;

  customer: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };

  product: {
    id: string;
    name: string;
    sku: string | null;
  };
};

const statuses = [
  "ALL",
  "PENDING",
  "APPROVED",
  "HIDDEN",
] as const;

function statusClass(
  status: Review["status"],
) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700";
    case "HIDDEN":
      return "bg-zinc-100 text-zinc-600";
  }
}

export default function AdminReviewsPage() {
  const router = useRouter();

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [updating, setUpdating] =
    useState<string | null>(null);

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<
    (typeof statuses)[number]
  >("ALL");

  async function loadReviews() {
    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/admin/reviews",
          {
            cache: "no-store",
            credentials:
              "same-origin",
          },
        );

      if (
        response.status === 401
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
            "Failed to load reviews.",
        );
      }

      setReviews(
        Array.isArray(
          data.reviews,
        )
          ? data.reviews
          : [],
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load reviews.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function updateReview(
    reviewId: string,
    status:
      | "APPROVED"
      | "HIDDEN",
  ) {
    try {
      setUpdating(reviewId);

      const response =
        await fetch(
          "/api/admin/reviews",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              reviewId,
              status,
            }),
          },
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        router.replace(
          "/admin/login",
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update review.",
        );
      }

      setReviews(
        (current) =>
          current.map(
            (review) =>
              review.id ===
              reviewId
                ? {
                    ...review,
                    status,
                  }
                : review,
          ),
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update review.",
      );
    } finally {
      setUpdating(null);
    }
  }

  async function logout() {
    try {
      await fetch(
        "/api/admin/logout",
        {
          method: "POST",
          credentials:
            "same-origin",
        },
      );
    } finally {
      router.replace(
        "/admin/login",
      );
      router.refresh();
    }
  }

  const filtered =
    useMemo(
      () =>
        selectedStatus ===
        "ALL"
          ? reviews
          : reviews.filter(
              (review) =>
                review.status ===
                selectedStatus,
            ),
      [
        reviews,
        selectedStatus,
      ],
    );

  function countStatus(
    status:
      | "ALL"
      | Review["status"],
  ) {
    if (status === "ALL") {
      return reviews.length;
    }

    return reviews.filter(
      (review) =>
        review.status === status,
    ).length;
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#172033]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() =>
              router.push("/admin")
            }
            className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-zinc-100"
          >
            ←
          </button>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-400">
              AR Fashions Admin
            </p>

            <h1 className="text-lg font-black">
              Reviews
            </h1>
          </div>

          <button
            type="button"
            onClick={logout}
            className="ml-auto rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <section className="rounded-[28px] bg-[#111827] p-6 text-white shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Customer Feedback
          </p>

          <h2 className="mt-3 text-2xl font-black">
            Review Moderation
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
            Approve genuine customer
            reviews before they appear
            on product pages.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-2xl font-black">
                {countStatus(
                  "PENDING",
                )}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                Pending
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-2xl font-black">
                {countStatus(
                  "APPROVED",
                )}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                Approved
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-2xl font-black">
                {countStatus(
                  "HIDDEN",
                )}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                Hidden
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {statuses.map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() =>
                  setSelectedStatus(
                    status,
                  )
                }
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${
                  selectedStatus ===
                  status
                    ? "bg-zinc-950 text-white"
                    : "bg-white text-zinc-500"
                }`}
              >
                {status} ·{" "}
                {countStatus(
                  status,
                )}
              </button>
            ),
          )}
        </div>

        {loading ? (
          <div className="mt-4 rounded-3xl bg-white p-10 text-center shadow-sm">
            Loading reviews...
          </div>
        ) : filtered.length ===
          0 ? (
          <div className="mt-4 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-black">
              No reviews found
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {filtered.map(
              (review) => (
                <article
                  key={review.id}
                  className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        {
                          review.product
                            .sku
                        }
                      </p>

                      <h3 className="mt-1 text-lg font-black">
                        {
                          review.product
                            .name
                        }
                      </h3>

                      <p className="mt-2 text-sm text-amber-500">
                        {"★".repeat(
                          review.rating,
                        )}
                        <span className="text-zinc-200">
                          {"★".repeat(
                            5 -
                              review.rating,
                          )}
                        </span>
                        <span className="ml-2 font-bold text-zinc-500">
                          {
                            review.rating
                          }
                          /5
                        </span>
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${statusClass(
                        review.status,
                      )}`}
                    >
                      {
                        review.status
                      }
                    </span>
                  </div>

                  {review.title && (
                    <h4 className="mt-5 font-black">
                      {
                        review.title
                      }
                    </h4>
                  )}

                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {review.comment ||
                      "No comment."}
                  </p>

                  <div className="mt-5 rounded-2xl bg-zinc-50 p-4">
                    <p className="text-xs font-black">
                      {review.customer
                        .name ||
                        "Customer"}
                    </p>

                    <p className="mt-1 text-[11px] text-zinc-500">
                      {review.customer
                        .phone ||
                        review.customer
                          .email ||
                        "Verified purchase"}
                    </p>

                    <p className="mt-2 text-[10px] font-semibold text-zinc-400">
                      {new Date(
                        review.createdAt,
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

                  <div className="mt-5 flex flex-wrap gap-3">
                    {review.status !==
                      "APPROVED" && (
                      <button
                        type="button"
                        disabled={
                          updating ===
                          review.id
                        }
                        onClick={() =>
                          updateReview(
                            review.id,
                            "APPROVED",
                          )
                        }
                        className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white disabled:bg-zinc-300"
                      >
                        Approve
                      </button>
                    )}

                    {review.status !==
                      "HIDDEN" && (
                      <button
                        type="button"
                        disabled={
                          updating ===
                          review.id
                        }
                        onClick={() =>
                          updateReview(
                            review.id,
                            "HIDDEN",
                          )
                        }
                        className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-xs font-black text-red-700 disabled:opacity-50"
                      >
                        Hide
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/products/${review.product.id}`,
                        )
                      }
                      className="rounded-xl border border-black/10 px-5 py-3 text-xs font-black"
                    >
                      View Product
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </main>
  );
}

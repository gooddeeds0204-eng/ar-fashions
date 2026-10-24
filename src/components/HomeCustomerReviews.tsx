"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CustomerStory = {
  id: string;
  title: string | null;
  comment: string | null;
  rating: number;
  customerName: string;
  createdAt: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
};

type HomeReviewsResponse = {
  count: number;
  averageRating: number | null;
  reviews: CustomerStory[];
};

function RatingStars({ rating }: { rating: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      aria-label={`${rating} out of 5 stars`}
      role="img"
      className="whitespace-nowrap text-[13px] tracking-[0.13em] text-[#C49A51]"
    >
      {"★".repeat(rounded)}
      <span className="text-[#DCD1C1]">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}

export default function HomeCustomerReviews() {
  const router = useRouter();
  const [data, setData] = useState<HomeReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/reviews/home", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load customer feedback.");
        const result: HomeReviewsResponse = await response.json();
        if (!controller.signal.aborted) setData(result);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Homepage reviews failed:", error);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const visibleReviews = data?.reviews ?? [];
  const hasReviews = (data?.count ?? 0) > 0 && visibleReviews.length > 0;

  return (
    <section
      id="customer-reviews"
      aria-labelledby="home-customer-reviews-heading"
      className="border-t border-[#E6DAC8] bg-[linear-gradient(180deg,#FFF9F1_0%,#F6EEE2_100%)] py-9 sm:py-14"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#936F4B]">
              The AS experience
            </p>
            <h2
              id="home-customer-reviews-heading"
              className="mt-2 font-serif text-[1.85rem] leading-[1.05] text-[#201A15] sm:text-[2.65rem]"
            >
              Words from our customers
            </h2>
            <p className="mt-3 max-w-lg text-[12px] leading-5 text-[#77695C] sm:text-sm">
              Real experiences, shared after delivery. Every published review
              is moderated before appearing here.
            </p>
          </div>

          {hasReviews && data?.averageRating != null ? (
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-[#E2D2BB] bg-white/80 px-4 py-3 shadow-[0_5px_20px_rgba(78,50,25,0.04)]">
              <span className="font-serif text-4xl leading-none text-[#113A2B]">
                {data.averageRating.toFixed(1)}
              </span>
              <div className="flex flex-col gap-0.5">
                <RatingStars rating={data.averageRating} />
                <span className="text-[10px] font-medium text-[#74685B]">
                  {data.count} approved {data.count === 1 ? "review" : "reviews"}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-3" aria-label="Loading customer reviews">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-[1.25rem] border border-[#E8DDCD] bg-white/70"
              />
            ))}
          </div>
        ) : hasReviews ? (
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible">
            {visibleReviews.map((review) => (
              <article
                key={review.id}
                className="flex w-[85%] min-w-0 shrink-0 snap-start flex-col justify-between rounded-[1.3rem] border border-[#E5D7C4] bg-[#FFFDF9] p-5 shadow-[0_8px_25px_rgba(67,45,28,0.035)] sm:w-[48%] md:w-auto md:p-6"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <RatingStars rating={review.rating} />
                    <span className="text-[8px] font-black uppercase tracking-[0.1em] text-[#23614A]">
                      ✓ Verified order
                    </span>
                  </div>

                  <span aria-hidden="true" className="mt-4 block h-4 font-serif text-[40px] leading-6 text-[#D0B187]">
                    “
                  </span>
                  {review.title ? (
                    <h3 className="mt-3 line-clamp-2 text-[14px] font-bold text-[#201A15]">
                      {review.title}
                    </h3>
                  ) : null}
                  <p className="mt-3 line-clamp-4 text-[12px] leading-[1.8] text-[#6D6156]">
                    {review.comment}
                  </p>
                </div>

                <div className="mt-6 border-t border-[#EEE5D8] pt-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E7D8C0] font-serif text-[16px] text-[#244638]"
                    >
                      {review.customerName.charAt(0).toUpperCase() || "A"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-[#201A15]">
                        {review.customerName}
                      </p>
                      <p className="mt-0.5 text-[9px] text-[#9A8A78]">
                        {new Date(review.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/products/${review.productId}`)}
                    className="mt-4 flex w-full items-center gap-3 rounded-xl bg-[#F5EEE4] p-2.5 text-left transition hover:bg-[#EEE4D5] focus-visible:outline-2 focus-visible:outline-[#0B3A2B]"
                  >
                    {review.productImageUrl ? (
                      <img
                        src={review.productImageUrl}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#E7D8C0] font-serif text-lg text-[#284A3B]">
                        AS
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-[#3E382F]">
                      {review.productName}
                    </span>
                    <span aria-hidden="true" className="text-[16px] text-[#174736]">
                      →
                    </span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.3rem] border border-[#E4D4BF] bg-[#FFFDF9] px-6 py-9 text-center sm:py-11">
            <span className="font-serif text-4xl text-[#D2B98F]" aria-hidden="true">
              ✧
            </span>
            <h3 className="mt-3 font-serif text-2xl text-[#213C30]">
              Your style, your story
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[#796D60]">
              Approved customer reviews will appear here as shoppers share
              their experiences after delivery.
            </p>
            <button
              type="button"
              onClick={() => router.push("/categories")}
              className="mt-5 rounded-full bg-[#063326] px-5 py-3 text-[11px] font-bold text-white transition hover:bg-[#144E3B]"
            >
              Explore collections →
            </button>
          </div>
        )}
        {hasReviews && visibleReviews.length > 1 ? (
          <p className="mt-2 text-right text-[9px] font-semibold tracking-wide text-[#9A8A78] md:hidden">
            Swipe to see more →
          </p>
        ) : null}
      </div>
    </section>
  );
}

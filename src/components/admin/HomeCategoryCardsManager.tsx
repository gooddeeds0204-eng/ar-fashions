"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type CategoryItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
  isActive?: boolean;
  children?: CategoryItem[];
};

type HomeCategoryCard = {
  id: string;
  label: string;
  categoryId: string;
  navigationCategoryIds?: string[];
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

const CORE_NAMES = [
  "Women",
  "Men",
  "Girl Kids",
  "Boy Kids",
] as const;

export default function HomeCategoryCardsManager({
  onCategoryChanged,
}: {
  onCategoryChanged?: () =>
    void | Promise<void>;
}) {
  const [
    categories,
    setCategories,
  ] = useState<CategoryItem[]>([]);

  const [
    cards,
    setCards,
  ] = useState<HomeCategoryCard[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    savingId,
    setSavingId,
  ] = useState<string | null>(
    null,
  );

  const [
    uploadingId,
    setUploadingId,
  ] = useState<string | null>(
    null,
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const coreCategories =
    useMemo(() => {
      return CORE_NAMES.flatMap(
        (name) => {
          const category =
            categories.find(
              (item) =>
                item.name
                  .trim()
                  .toLowerCase() ===
                name.toLowerCase(),
            );

          return category
            ? [
                category,
              ]
            : [];
        },
      );
    }, [categories]);

  async function prepareStructure() {
    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/core-category-structure",
          {
            method: "POST",
            credentials:
              "same-origin",
          },
        );

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/admin/login";
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to prepare main categories.",
        );
      }

      setCards(
        Array.isArray(
          data.cards,
        )
          ? data.cards
          : [],
      );

      setCategories(
        Array.isArray(
          data.categories,
        )
          ? data.categories
          : [],
      );

      const movedGirl =
        Array.isArray(
          data.moved?.girl,
        )
          ? data.moved.girl
              .length
          : 0;

      const movedBoy =
        Array.isArray(
          data.moved?.boy,
        )
          ? data.moved.boy
              .length
          : 0;

      if (
        movedGirl +
          movedBoy >
        0
      ) {
        setMessage(
          `4 main categories ready. ${movedGirl + movedBoy} clear Kids subcategories correct Girl/Boy section ki safely moved.`,
        );
      }

      if (
        onCategoryChanged
      ) {
        await onCategoryChanged();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to prepare main categories.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void prepareStructure();
  }, []);

  async function persistCards(
    nextCards:
      HomeCategoryCard[],
    busyId: string,
    successMessage: string,
  ) {
    setSavingId(
      busyId,
    );
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/home-category-cards",
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
                cards:
                  nextCards,
              }),
          },
        );

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/admin/login";
        return false;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to save main categories.",
        );
      }

      setCards(
        Array.isArray(
          data.cards,
        )
          ? data.cards
          : nextCards,
      );

      setMessage(
        successMessage,
      );

      return true;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save main categories.",
      );

      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function uploadImage(
    card: HomeCategoryCard,
    file: File,
  ) {
    setUploadingId(
      card.id,
    );
    setMessage("");

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file,
      );

      const response =
        await fetch(
          "/api/upload",
          {
            method: "POST",
            credentials:
              "same-origin",
            body: formData,
          },
        );

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/admin/login";
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Image upload failed.",
        );
      }

      const nextCards =
        cards.map(
          (item) =>
            item.id ===
            card.id
              ? {
                  ...item,
                  imageUrl:
                    data.url ??
                    null,
                }
              : item,
        );

      await persistCards(
        nextCards,
        card.id,
        `${card.label} image updated.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Image upload failed.",
      );
    } finally {
      setUploadingId(null);
    }
  }

  if (loading) {
    return (
      <section className="mb-8 rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#1a1510] to-slate-950 p-6">
        <p className="text-sm text-slate-400">
          Preparing Women, Men, Girl Kids and Boy Kids...
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#1a1510] to-slate-950">
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">
          Storefront
        </p>

        <h2 className="mt-2 text-xl font-bold">
          Main Categories
        </h2>

        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
          Homepage main categories fixed ga 4 maatrame: Women, Men, Girl Kids, Boy Kids. Subcategories separate ga kindha add cheyyandi.
        </p>
      </div>

      {message ? (
        <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-slate-200 sm:mx-6">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-6 lg:grid-cols-4">
        {cards
          .slice()
          .sort(
            (a, b) =>
              a.sortOrder -
              b.sortOrder,
          )
          .map(
            (card) => {
              const linked =
                coreCategories.find(
                  (category) =>
                    category.id ===
                    card.categoryId,
                );

              const childCount =
                linked?.children
                  ?.length ??
                0;

              const busy =
                savingId ===
                  card.id ||
                uploadingId ===
                  card.id;

              return (
                <article
                  key={
                    card.id
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4"
                >
                  <div className="mx-auto aspect-[4/5] w-full max-w-[170px] overflow-hidden rounded-t-[999px] rounded-b-xl border-2 border-[#D4AF37]/35 bg-slate-900">
                    {card.imageUrl ? (
                      <img
                        src={
                          card.imageUrl
                        }
                        alt={
                          card.label
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#641e2a] via-[#30131a] to-black">
                        <span className="font-serif text-3xl text-[#D4AF37]">
                          AS
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-sm font-black text-white">
                      {
                        card.label
                      }
                    </p>

                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
                      Main Category
                    </p>

                    <p className="mt-1 text-[9px] text-slate-500">
                      {childCount} subcategories
                    </p>
                  </div>

                  {linked?.children &&
                  linked.children
                    .length > 0 ? (
                    <div className="mt-3 flex flex-wrap justify-center gap-1">
                      {linked.children
                        .slice(
                          0,
                          4,
                        )
                        .map(
                          (
                            child,
                          ) => (
                            <span
                              key={
                                child.id
                              }
                              className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[8px] text-slate-400"
                            >
                              {
                                child.name
                              }
                            </span>
                          ),
                        )}

                      {linked.children
                        .length >
                      4 ? (
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[8px] text-slate-400">
                          +{
                            linked
                              .children
                              .length -
                            4
                          }
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-center text-[9px] leading-4 text-slate-500">
                      Add subcategories below.
                    </p>
                  )}

                  <label className="mt-4 block cursor-pointer rounded-lg bg-[#D4AF37] px-3 py-2.5 text-center text-[9px] font-black uppercase tracking-wide text-[#080B0D]">
                    {uploadingId ===
                    card.id
                      ? "Uploading..."
                      : card.imageUrl
                        ? "Change Image"
                        : "Upload Image"}

                    <input
                      type="file"
                      accept="image/*"
                      disabled={
                        busy
                      }
                      className="hidden"
                      onChange={async (
                        event,
                      ) => {
                        const file =
                          event.target
                            .files?.[0];

                        if (file) {
                          await uploadImage(
                            card,
                            file,
                          );
                        }

                        event.target.value =
                          "";
                      }}
                    />
                  </label>
                </article>
              );
            },
          )}
      </div>

      <div className="border-t border-white/10 bg-black/15 px-5 py-4 sm:px-6">
        <p className="text-[10px] leading-5 text-slate-500">
          Main category create/remove controls ikkada intentionally levu. Ee four fixed storefront groups kindha subcategories ni manage cheyyali.
        </p>
      </div>
    </section>
  );
}

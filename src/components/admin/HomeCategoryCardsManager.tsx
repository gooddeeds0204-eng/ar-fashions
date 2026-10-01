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
  children?: CategoryItem[];
};

type HomeCategoryCard = {
  id: string;
  label: string;
  categoryId: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export default function HomeCategoryCardsManager() {
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
    newLabel,
    setNewLabel,
  ] = useState("");

  const [
    newCategoryId,
    setNewCategoryId,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const categoryOptions =
    useMemo(() => {
      const items: Array<{
        id: string;
        label: string;
        imageUrl: string | null;
      }> = [];

      for (
        const main of
        categories
      ) {
        items.push({
          id: main.id,
          label: main.name,
          imageUrl:
            main.imageUrl ??
            null,
        });

        for (
          const child of
          main.children ?? []
        ) {
          items.push({
            id: child.id,
            label:
              `${main.name} → ${child.name}`,
            imageUrl:
              child.imageUrl ??
              null,
          });
        }
      }

      return items;
    }, [categories]);

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const [
        cardsResponse,
        categoriesResponse,
      ] = await Promise.all([
        fetch(
          "/api/admin/home-category-cards",
          {
            cache:
              "no-store",
            credentials:
              "same-origin",
          },
        ),
        fetch(
          "/api/categories",
          {
            cache:
              "no-store",
            credentials:
              "same-origin",
          },
        ),
      ]);

      if (
        cardsResponse.status ===
          401 ||
        categoriesResponse.status ===
          401
      ) {
        window.location.href =
          "/admin/login";
        return;
      }

      const cardsData =
        await cardsResponse.json();

      const categoriesData =
        await categoriesResponse.json();

      if (!cardsResponse.ok) {
        throw new Error(
          cardsData.error ??
            "Failed to load home category cards.",
        );
      }

      if (!categoriesResponse.ok) {
        throw new Error(
          categoriesData.error ??
            "Failed to load categories.",
        );
      }

      setCards(
        Array.isArray(
          cardsData.cards,
        )
          ? cardsData.cards
          : [],
      );

      setCategories(
        Array.isArray(
          categoriesData,
        )
          ? categoriesData
          : [],
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load home category cards.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function persist(
    nextCards: HomeCategoryCard[],
    busyId: string,
    successMessage: string,
  ) {
    setSavingId(
      busyId,
    );
    setMessage("");

    try {
      const normalized =
        nextCards.map(
          (
            card,
            index,
          ) => ({
            ...card,
            sortOrder:
              Number.isFinite(
                Number(
                  card.sortOrder,
                ),
              )
                ? Number(
                    card.sortOrder,
                  )
                : index,
          }),
        );

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
                  normalized,
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
            "Failed to save home category cards.",
        );
      }

      setCards(
        Array.isArray(
          data.cards,
        )
          ? data.cards
          : normalized,
      );

      setMessage(
        successMessage,
      );

      return true;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save home category cards.",
      );

      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function addCard() {
    const label =
      newLabel.trim();

    if (!label) {
      setMessage(
        "Display name enter cheyyandi.",
      );
      return;
    }

    if (!newCategoryId) {
      setMessage(
        "Linked catalog category select cheyyandi.",
      );
      return;
    }

    const linked =
      categoryOptions.find(
        (item) =>
          item.id ===
          newCategoryId,
      );

    const maxOrder =
      cards.reduce(
        (
          highest,
          card,
        ) =>
          Math.max(
            highest,
            Number(
              card.sortOrder,
            ) || 0,
          ),
        -1,
      );

    const id =
      `home-card-${Date.now()}`;

    const next = [
      ...cards,
      {
        id,
        label,
        categoryId:
          newCategoryId,
        imageUrl:
          linked?.imageUrl ??
          null,
        isActive: true,
        sortOrder:
          maxOrder + 1,
      },
    ];

    const saved =
      await persist(
        next,
        id,
        `${label} home category created.`,
      );

    if (saved) {
      setNewLabel("");
      setNewCategoryId("");
    }
  }

  function patchCard(
    id: string,
    patch:
      Partial<HomeCategoryCard>,
  ) {
    setCards(
      (current) =>
        current.map(
          (card) =>
            card.id === id
              ? {
                  ...card,
                  ...patch,
                }
              : card,
        ),
    );
  }

  async function saveCard(
    id: string,
  ) {
    await persist(
      cards,
      id,
      "Home category updated.",
    );
  }

  async function deleteCard(
    card: HomeCategoryCard,
  ) {
    if (
      cards.length <= 1
    ) {
      setMessage(
        "At least one home category card maintain cheyyali.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Remove "${card.label}" from homepage categories?`,
      );

    if (!confirmed) {
      return;
    }

    await persist(
      cards.filter(
        (item) =>
          item.id !==
          card.id,
      ),
      card.id,
      `${card.label} removed from homepage.`,
    );
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
            body:
              formData,
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

      const next =
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

      await persist(
        next,
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
          Loading home categories...
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
          Home Category Cards
        </h2>

        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
          Ippudu 6 cards ki limit ledu. Enni homepage category cards aina create cheyyachu, image change cheyyachu, active/inactive cheyyachu, order manage cheyyachu.
        </p>
      </div>

      <div className="border-b border-white/10 bg-black/15 p-4 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
          + Create Home Category
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.4fr_auto]">
          <input
            value={newLabel}
            onChange={(event) =>
              setNewLabel(
                event.target.value,
              )
            }
            placeholder="Display name e.g. Sarees"
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-400"
          />

          <select
            value={
              newCategoryId
            }
            onChange={(event) =>
              setNewCategoryId(
                event.target.value,
              )
            }
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400"
          >
            <option value="">
              Select catalog category
            </option>

            {categoryOptions.map(
              (category) => (
                <option
                  key={
                    category.id
                  }
                  value={
                    category.id
                  }
                >
                  {
                    category.label
                  }
                </option>
              ),
            )}
          </select>

          <button
            type="button"
            onClick={() =>
              void addCard()
            }
            disabled={
              Boolean(
                savingId,
              )
            }
            className="rounded-xl bg-[#D4AF37] px-5 py-3 text-xs font-black uppercase tracking-wide text-[#080B0D] disabled:opacity-40"
          >
            Add Card
          </button>
        </div>

        <p className="mt-2 text-[10px] text-slate-500">
          Display name homepage lo kanipistundi. Linked category current card click action kosam use avutundi.
        </p>
      </div>

      {message ? (
        <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-slate-200 sm:mx-6">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
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
                categoryOptions.find(
                  (item) =>
                    item.id ===
                    card.categoryId,
                );

              const busy =
                savingId ===
                  card.id ||
                uploadingId ===
                  card.id;

              return (
                <div
                  key={
                    card.id
                  }
                  className={`rounded-2xl border p-4 ${
                    card.isActive
                      ? "border-white/10 bg-white/[0.04]"
                      : "border-white/5 bg-black/20 opacity-70"
                  }`}
                >
                  <div className="mx-auto aspect-[4/5] w-full max-w-[180px] overflow-hidden rounded-t-[999px] rounded-b-xl border-2 border-[#D4AF37]/40 bg-slate-900">
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
                        <span className="font-serif text-4xl text-[#D4AF37]">
                          AS
                        </span>
                        <span className="mt-2 text-[8px] font-black uppercase tracking-[0.18em] text-white/60">
                          {
                            card.label
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Display Name
                    </span>

                    <input
                      value={
                        card.label
                      }
                      onChange={(event) =>
                        patchCard(
                          card.id,
                          {
                            label:
                              event.target.value,
                          },
                        )
                      }
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-bold outline-none focus:border-[#D4AF37]"
                    />
                  </label>

                  <label className="mt-3 block">
                    <span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Linked Category
                    </span>

                    <select
                      value={
                        card.categoryId
                      }
                      onChange={(event) =>
                        patchCard(
                          card.id,
                          {
                            categoryId:
                              event.target.value,
                          },
                        )
                      }
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-xs outline-none focus:border-[#D4AF37]"
                    >
                      {categoryOptions.map(
                        (
                          category,
                        ) => (
                          <option
                            key={
                              category.id
                            }
                            value={
                              category.id
                            }
                          >
                            {
                              category.label
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label>
                      <span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">
                        Order
                      </span>

                      <input
                        type="number"
                        value={
                          card.sortOrder
                        }
                        onChange={(event) =>
                          patchCard(
                            card.id,
                            {
                              sortOrder:
                                Number(
                                  event.target.value,
                                ),
                            },
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-xs outline-none focus:border-[#D4AF37]"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        patchCard(
                          card.id,
                          {
                            isActive:
                              !card.isActive,
                          },
                        )
                      }
                      className={`mt-[17px] rounded-lg border px-3 py-2.5 text-[10px] font-black ${
                        card.isActive
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          : "border-white/10 text-slate-400"
                      }`}
                    >
                      {card.isActive
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </button>
                  </div>

                  <p className="mt-3 truncate text-[9px] text-slate-500">
                    Linked:{" "}
                    {linked?.label ??
                      "Unknown category"}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <label className="cursor-pointer rounded-lg bg-[#D4AF37] px-3 py-2.5 text-center text-[9px] font-black uppercase text-[#080B0D]">
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

                    <button
                      type="button"
                      onClick={() =>
                        void saveCard(
                          card.id,
                        )
                      }
                      disabled={
                        busy
                      }
                      className="rounded-lg bg-emerald-400 px-3 py-2.5 text-[9px] font-black uppercase text-slate-950 disabled:opacity-40"
                    >
                      {savingId ===
                      card.id
                        ? "Saving..."
                        : "Save"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void deleteCard(
                        card,
                      )
                    }
                    disabled={
                      busy
                    }
                    className="mt-2 w-full rounded-lg border border-red-400/20 px-3 py-2 text-[9px] font-black uppercase text-red-300 disabled:opacity-40"
                  >
                    Remove Home Card
                  </button>
                </div>
              );
            },
          )}
      </div>
    </section>
  );
}

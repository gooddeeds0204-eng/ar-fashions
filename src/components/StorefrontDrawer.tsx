"use client";

type StoreCategoryChild = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  children: StoreCategoryChild[];
};

type Props = {
  open: boolean;
  mode: "RETAIL" | "RESELLER";
  categories: StoreCategory[];
  expandedCategory: string | null;
  selectedCategoryName: string | null;
  loggedIn: boolean;

  onClose: () => void;
  onToggleCategory: (id: string) => void;
  onSelectParent: (
    ids: string[],
    name: string,
  ) => void;
  onSelectChild: (
    id: string,
    name: string,
  ) => void;
  onClearCategory: () => void;

  onWishlist: () => void;
  onCart: () => void;
  onAccount: () => void;
  onOrders: () => void;
  onResellerDashboard: () => void;
  onLogout: () => void;
};

export default function StorefrontDrawer({
  open,
  mode,
  categories,
  expandedCategory,
  selectedCategoryName,
  loggedIn,
  onClose,
  onToggleCategory,
  onSelectParent,
  onSelectChild,
  onClearCategory,
  onWishlist,
  onCart,
  onAccount,
  onOrders,
  onResellerDashboard,
  onLogout,
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-[#211C18]/35 backdrop-blur-sm"
      />

      <aside className="absolute bottom-0 left-0 top-0 flex w-[88%] max-w-[380px] flex-col border-r border-[#E4D7C4] bg-[#FFFDF9] text-[#211C18] shadow-[18px_0_60px_rgba(61,48,37,0.16)]">
        <div className="flex items-center justify-between border-b border-[#E4D7C4] px-5 py-4">
          <div>
            <p className="font-serif text-2xl text-[#211C18]">
              AS
            </p>

            <p className="text-[7px] font-black uppercase tracking-[0.32em] text-[#D4AF37]">
              Fashions
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#E4D7C4] bg-[#FAF7F0] text-xl text-[#211C18]"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          {mode === "RETAIL" ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.24em] text-[#D4AF37]">
                    Retail Shop
                  </p>

                  <h2 className="mt-1 font-serif text-xl text-[#211C18]">
                    Categories
                  </h2>
                </div>

                {selectedCategoryName ? (
                  <button
                    type="button"
                    onClick={onClearCategory}
                    className="rounded-full border border-[#E4D7C4] bg-[#FAF7F0] px-3 py-1.5 text-[9px] font-black text-[#7B7066]"
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              {selectedCategoryName ? (
                <div className="mb-4 rounded-2xl border border-[#D9C29A] bg-[#F1E8DA] px-4 py-3">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-[#D4AF37]">
                    Selected
                  </p>

                  <p className="mt-1 text-sm font-black text-[#211C18]">
                    {selectedCategoryName}
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                {categories.map((parent) => {
                  const expanded =
                    expandedCategory ===
                    parent.id;

                  const ids = [
                    parent.id,
                    ...parent.children.map(
                      (child) =>
                        child.id,
                    ),
                  ];

                  return (
                    <div
                      key={parent.id}
                      className="overflow-hidden rounded-2xl border border-[#E4D7C4] bg-[#FAF7F0] shadow-[0_4px_18px_rgba(61,48,37,0.035)]"
                    >
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectParent(
                              ids,
                              parent.name,
                            )
                          }
                          className="min-w-0 flex-1 px-4 py-3.5 text-left"
                        >
                          <span className="text-sm font-black text-[#211C18]">
                            {parent.name}
                          </span>
                        </button>

                        {parent.children.length >
                        0 ? (
                          <button
                            type="button"
                            aria-label={`Open ${parent.name} subcategories`}
                            onClick={() =>
                              onToggleCategory(
                                parent.id,
                              )
                            }
                            className="grid h-12 w-12 shrink-0 place-items-center text-lg font-black text-[#D4AF37]"
                          >
                            {expanded
                              ? "−"
                              : "+"}
                          </button>
                        ) : null}
                      </div>

                      {expanded &&
                      parent.children.length >
                        0 ? (
                        <div className="border-t border-[#E4D7C4] bg-[#F5EFE6] px-3 py-2">
                          {parent.children.map(
                            (child) => (
                              <button
                                key={
                                  child.id
                                }
                                type="button"
                                onClick={() =>
                                  onSelectChild(
                                    child.id,
                                    child.name,
                                  )
                                }
                                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-xs font-bold text-[#7B7066] transition hover:bg-[#FFFDF9] hover:text-[#211C18]"
                              >
                                <span>
                                  {
                                    child.name
                                  }
                                </span>

                                <span className="text-[#D4AF37]">
                                  ›
                                </span>
                              </button>
                            ),
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {categories.length ===
                0 ? (
                  <p className="py-6 text-center text-xs text-[#7B7066]">
                    No categories available.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-[#D9C29A] bg-[#F1E8DA] p-4">
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                Reseller Account
              </p>

              <p className="mt-2 text-sm font-bold text-[#211C18]">
                Wholesale tools and reseller orders.
              </p>

              <button
                type="button"
                onClick={
                  onResellerDashboard
                }
                className="mt-4 w-full rounded-xl bg-[#211C18] px-4 py-3 text-xs font-black text-[#FFFDF9]"
              >
                Open Reseller Dashboard
              </button>
            </div>
          )}

          <div className="mt-6 border-t border-[#E4D7C4] pt-4">
            <p className="mb-2 px-2 text-[8px] font-black uppercase tracking-[0.22em] text-[#7B7066]">
              My AR
            </p>

            {[
              [
                "♡",
                "Wishlist",
                onWishlist,
              ],
              [
                "◇",
                "Cart",
                onCart,
              ],
              [
                "▤",
                "My Orders",
                onOrders,
              ],
              [
                "A",
                loggedIn
                  ? "Account"
                  : "Login / Account",
                onAccount,
              ],
            ].map(
              ([icon, label, action]) => (
                <button
                  key={
                    label as string
                  }
                  type="button"
                  onClick={
                    action as () => void
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-[#7B7066] transition hover:bg-[#F1E8DA] hover:text-[#211C18]"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-[#D9C29A] bg-[#FAF7F0] text-sm text-[#D4AF37]">
                    {icon as string}
                  </span>

                  <span>
                    {label as string}
                  </span>
                </button>
              ),
            )}

            {loggedIn ? (
              <button
                type="button"
                onClick={onLogout}
                className="mt-3 w-full rounded-xl border border-[#C98C95]/35 bg-[#F9ECEE] px-4 py-3 text-xs font-black text-[#8F3F4C]"
              >
                Logout
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

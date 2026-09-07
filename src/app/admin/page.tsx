"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const menu = [
  { label: "Dashboard", href: "/admin", icon: "▦" },
  { label: "Products", href: "/admin/products", icon: "◇" },
  { label: "Categories", href: "/admin/categories", icon: "▤" },
  { label: "Colors", href: "/admin/colors", icon: "●" },
  { label: "Sizes", href: "/admin/sizes", icon: "□" },
  { label: "Orders", href: "/admin/orders", icon: "⌁" },
  { label: "Reviews", href: "/admin/reviews", icon: "★" },
  { label: "Customers", href: "/admin/customers", icon: "◎" },
  { label: "Inventory", href: "/admin/inventory", icon: "▥" },
  { label: "Coupons", href: "/admin/coupons", icon: "%" },
  { label: "Banners", href: "/admin/banners", icon: "▱" },
  { label: "Home Content", href: "/admin/home-content", icon: "⌂" },
];

const comingSoon = [
  { label: "Inventory", icon: "◈" },
  { label: "Reseller Sets", href: "/admin/reseller-sets", icon: "◆" },
  { label: "Settings", icon: "⚙" },
];

const stats = [
  {
    title: "Total Products",
    value: "0",
    note: "Products in catalog",
    icon: "◇",
  },
  {
    title: "Categories",
    value: "0",
    note: "Active categories",
    icon: "▤",
  },
  {
    title: "Colors",
    value: "0",
    note: "Available colors",
    icon: "●",
  },
  {
    title: "Sizes",
    value: "0",
    note: "Available sizes",
    icon: "□",
  },
];

export default function AdminDashboard() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#172033]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] border-r border-black/5 bg-[#111827] text-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="text-[11px] font-medium tracking-[0.35em] text-white/45">
              ADMIN PANEL
            </div>

            <div className="mt-2 font-serif text-[27px] tracking-wide">
              AR <span className="text-[#b98b5e]">FASHIONS</span>
            </div>

            <div className="mt-1 text-xs text-white/40">
              Fashion Commerce
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-5">
            <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
              Management
            </div>

            <nav className="space-y-1">
              {menu.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                      active
                        ? "bg-white text-[#111827] shadow-lg"
                        : "text-white/65 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 text-base">
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
              Business
            </div>

            <nav className="space-y-1">
              {comingSoon.map((item) => (
                <div
                  key={item.label}
                  className="flex cursor-default items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/35"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  <span className="ml-auto text-[8px] uppercase tracking-wider text-white/20">
                    Soon
                  </span>
                </div>
              ))}
            </nav>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-xs font-medium text-white/80">
                Store Status
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-white/45">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                System operational
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="lg:pl-[250px]">
        <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f6f7f9]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-[#8b93a3]">
                AR Fashions / Admin
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-black/5 bg-white px-4 py-2 text-xs text-[#697386] sm:block">
                Store: <span className="font-semibold text-emerald-600">Live</span>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111827] text-sm font-semibold text-white">
                AR
              </div>

              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#172033]"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="px-5 py-7 sm:px-8 lg:px-10">
          <section className="overflow-hidden rounded-[28px] bg-[#111827] p-6 text-white shadow-xl sm:p-8">
            <div className="max-w-2xl">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
                AR Fashions Control Center
              </div>

              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                Manage your fashion store
                <span className="text-[#c49a6c]"> smarter.</span>
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
                Products, categories, colors, sizes and reseller operations
                will all be managed from one place.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/admin/products"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#111827] transition hover:bg-white/90"
              >
                + Add Product
              </Link>

              <Link
                href="/admin/categories"
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10"
              >
                Manage Categories
              </Link>
            </div>
          </section>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3eee8] text-[#9b7048]">
                    {stat.icon}
                  </div>

                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#a2a8b3]">
                    Live
                  </span>
                </div>

                <div className="mt-5 text-3xl font-semibold tracking-tight">
                  {stat.value}
                </div>

                <div className="mt-1 text-sm font-medium">
                  {stat.title}
                </div>

                <div className="mt-1 text-xs text-[#9ba2ae]">
                  {stat.note}
                </div>
              </div>
            ))}
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Quick Management</h3>
                  <p className="mt-1 text-xs text-[#9ba2ae]">
                    Frequently used store controls
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Products", "/admin/products", "Add and manage products"],
                  ["Categories", "/admin/categories", "Organise your catalog"],
                  ["Colors", "/admin/colors", "Manage product colors"],
                  ["Sizes", "/admin/sizes", "Manage available sizes"],
                  ["Inventory", "/admin/inventory", "Manage stock and variants"],
                ].map(([title, href, description]) => (
                  <Link
                    key={href}
                    href={href}
                    className="group rounded-2xl border border-black/5 p-4 transition hover:border-[#c49a6c]/40 hover:bg-[#fcfaf8]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{title}</span>
                      <span className="text-[#b98b5e] transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#9ba2ae]">
                      {description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <h3 className="font-semibold">Store Modes</h3>
              <p className="mt-1 text-xs text-[#9ba2ae]">
                Retail and reseller commerce
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-[#f7f8fa] p-4">
                  <div>
                    <div className="text-sm font-medium">Retail Mode</div>
                    <div className="mt-1 text-xs text-[#9ba2ae]">
                      Individual customer shopping
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-600">
                    OPEN
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-[#f7f8fa] p-4">
                  <div>
                    <div className="text-sm font-medium">Reseller Mode</div>
                    <div className="mt-1 text-xs text-[#9ba2ae]">
                      Bulk & wholesale orders
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-600">
                    OPEN
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-[#d9dde5] p-4">
                <div className="text-xs font-medium">Next module</div>
                <div className="mt-1 text-xs leading-5 text-[#9ba2ae]">
                  Product Builder will connect colors, sizes, variants,
                  stock and retail/reseller pricing.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

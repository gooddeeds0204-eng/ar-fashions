"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  { label: "Restock Queue", href: "/admin/restock", icon: "↟" },
  { label: "Suppliers", href: "/admin/suppliers", icon: "◈" },
  { label: "Purchase Orders", href: "/admin/purchase-orders", icon: "▧" },
  { label: "Coupons", href: "/admin/coupons", icon: "%" },
  { label: "Banners", href: "/admin/banners", icon: "▱" },
  { label: "Home Content", href: "/admin/home-content", icon: "⌂" },
  { label: "Video Content", href: "/admin/video-content", icon: "▶" },
  { label: "Reseller Sets", href: "/admin/reseller-sets", icon: "◆" },
  { label: "Notifications", href: "/admin/notifications", icon: "♢" },
  { label: "Delivery", href: "/admin/delivery", icon: "⌖" },
  { label: "Reports", href: "/admin/reports", icon: "▥" },
  { label: "Settings", href: "/admin/settings", icon: "⚙" },
];

type DashboardStats = {
  products: number;
  categories: number;
  colors: number;
  sizes: number;
};

type SalesMode = {
  retailStatus:
    | "OPEN"
    | "CLOSED";
  resellerStatus:
    | "OPEN"
    | "CLOSED";
};

type ProcurementAlert = {
  id: string;
  severity:
    | "HIGH"
    | "MEDIUM"
    | "LOW";
  title: string;
  detail: string;
  href: string;
};

type ProcurementSummary = {
  riskLevel:
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  alertCount: number;
  incomingPOCount: number;
  overduePOCount: number;
  dueSoonPOCount: number;

  highValuePendingPOCount:
    number;

  pendingIncomingValue:
    number;

  pendingIncomingPieces:
    number;

  needsAttentionSupplierCount:
    number;

  supplierReliabilityRiskCount:
    number;

  costIncreaseSupplierCount:
    number;

  alerts:
    ProcurementAlert[];
};

type InventoryAlert = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string | null;
  colorName: string;
  sizeName: string;
  availableStock: number;
  health:
    | "OUT_OF_STOCK"
    | "CRITICAL"
    | "LOW";
  recentSalesQty: number;

  grossRecommendedReorderQty:
    number;

  draftStock:
    number;

  incomingStock:
    number;

  protectedStock:
    number;

  recommendedReorderQty:
    number;
};

type InventorySummary = {
  lowStock: number;
  criticalStock: number;
  outOfStock: number;
  alertCount: number;

  incomingProtectedCount:
    number;

  totalIncomingStock:
    number;

  totalDraftStock:
    number;

  lowStockThreshold: number;
  criticalStockThreshold: number;
  alerts: InventoryAlert[];
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
  ).format(
    value || 0,
  );
}

export default function AdminDashboard() {
  const pathname = usePathname();
  const router = useRouter();

  const [
    dashboardStats,
    setDashboardStats,
  ] = useState<DashboardStats | null>(
    null,
  );

  const [
    salesMode,
    setSalesMode,
  ] = useState<SalesMode | null>(
    null,
  );

  const [
    inventorySummary,
    setInventorySummary,
  ] =
    useState<InventorySummary | null>(
      null,
    );

  const [
    procurementSummary,
    setProcurementSummary,
  ] =
    useState<ProcurementSummary | null>(
      null,
    );

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        const response =
          await fetch(
            "/api/admin/dashboard-summary",
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

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (
          data.stats &&
          typeof data.stats ===
            "object"
        ) {
          setDashboardStats(
            data.stats,
          );
        }

        if (
          data.salesMode &&
          typeof data.salesMode ===
            "object"
        ) {
          setSalesMode(
            data.salesMode,
          );
        }

        if (
          data.procurement &&
          typeof data.procurement ===
            "object"
        ) {
          setProcurementSummary(
            data.procurement,
          );
        }

        if (
          data.inventory &&
          typeof data.inventory ===
            "object"
        ) {
          setInventorySummary(
            data.inventory,
          );
        }
      } catch (error) {
        console.error(
          "Dashboard stats failed:",
          error,
        );
      }
    }

    loadDashboardStats();

    const timer =
      window.setInterval(
        () => {
          void loadDashboardStats();
        },
        60_000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [router]);

  const stats = [
    {
      title: "Total Products",
      value:
        dashboardStats
          ? String(
              dashboardStats.products,
            )
          : "—",
      note: "Products in catalog",
      icon: "◇",
    },
    {
      title: "Categories",
      value:
        dashboardStats
          ? String(
              dashboardStats.categories,
            )
          : "—",
      note: "Active categories",
      icon: "▤",
    },
    {
      title: "Colors",
      value:
        dashboardStats
          ? String(
              dashboardStats.colors,
            )
          : "—",
      note: "Available colors",
      icon: "●",
    },
    {
      title: "Sizes",
      value:
        dashboardStats
          ? String(
              dashboardStats.sizes,
            )
          : "—",
      note: "Available sizes",
      icon: "□",
    },
  ];

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
    <div className="min-h-screen bg-[#FAF7F0] text-[#211C18]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] border-r border-black/5 bg-[#211C18] text-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="text-[11px] font-medium tracking-[0.35em] text-white/45">
              ADMIN PANEL
            </div>

            <div className="mt-2 font-serif text-[27px] tracking-wide">
              AR <span className="text-[#D4AF37]">FASHIONS</span>
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
                        ? "bg-white text-[#211C18] shadow-lg"
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
        <header className="sticky top-0 z-20 border-b border-black/5 bg-[#FAF7F0]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-[#7B7066]">
                AR Fashions / Admin
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-black/5 bg-white px-4 py-2 text-xs text-[#7B7066] sm:block">
                Store: <span className="font-semibold text-emerald-600">Live</span>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#211C18] text-sm font-semibold text-white">
                AR
              </div>

              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#211C18]"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="px-5 py-7 sm:px-8 lg:px-10">
          <section className="overflow-hidden rounded-[28px] bg-[#211C18] p-6 text-white shadow-xl sm:p-8">
            <div className="max-w-2xl">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
                AR Fashions Control Center
              </div>

              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                Manage your fashion store
                <span className="text-[#D9C29A]"> smarter.</span>
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
                Products, categories, colors, sizes and reseller operations
                will all be managed from one place.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/admin/products"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#211C18] transition hover:bg-white/90"
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EBDD] text-[#6B5435]">
                    {stat.icon}
                  </div>

                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#9A9188]">
                    Live
                  </span>
                </div>

                <div className="mt-5 text-3xl font-semibold tracking-tight">
                  {stat.value}
                </div>

                <div className="mt-1 text-sm font-medium">
                  {stat.title}
                </div>

                <div className="mt-1 text-xs text-[#9A9188]">
                  {stat.note}
                </div>
              </div>
            ))}
          </section>

          {inventorySummary ? (
            <section className="mt-7 overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-black/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      Inventory Alerts
                    </h3>

                    {inventorySummary.alertCount >
                    0 ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600">
                        {
                          inventorySummary.alertCount
                        }{" "}
                        ACTIVE
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                        HEALTHY
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-[#9A9188]">
                    Automatic stock watch · refreshes every 60 seconds
                  </p>
                </div>

                <Link
                  href="/admin/inventory"
                  className="rounded-xl bg-[#211C18] px-4 py-2.5 text-center text-xs font-semibold text-white"
                >
                  Open Inventory →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/5 sm:grid-cols-4">
                <div className="bg-white p-4 sm:p-5">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-red-500">
                    Out
                  </div>

                  <div className="mt-1 text-2xl font-semibold">
                    {
                      inventorySummary.outOfStock
                    }
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-rose-500">
                    Critical
                  </div>

                  <div className="mt-1 text-2xl font-semibold">
                    {
                      inventorySummary.criticalStock
                    }
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-amber-500">
                    Low
                  </div>

                  <div className="mt-1 text-2xl font-semibold">
                    {
                      inventorySummary.lowStock
                    }
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-sky-600">
                    PO Protected
                  </div>

                  <div className="mt-1 text-2xl font-semibold">
                    {
                      inventorySummary.incomingProtectedCount
                    }
                  </div>

                  <div className="mt-1 text-[9px] text-[#9A9188]">
                    Draft {
                      inventorySummary.totalDraftStock
                    } · Incoming {
                      inventorySummary.totalIncomingStock
                    }
                  </div>
                </div>
              </div>

              {inventorySummary.alerts.length >
              0 ? (
                <div className="divide-y divide-black/5">
                  {inventorySummary.alerts.map(
                    (alert) => (
                      <div
                        key={
                          alert.variantId
                        }
                        className="flex items-center gap-3 p-4 sm:p-5"
                      >
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black ${
                            alert.health ===
                            "OUT_OF_STOCK"
                              ? "bg-red-50 text-red-600"
                              : alert.health ===
                                  "CRITICAL"
                                ? "bg-rose-50 text-rose-600"
                                : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          !
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {
                              alert.productName
                            }
                          </div>

                          <div className="mt-1 truncate text-[10px] text-[#9A9188]">
                            {
                              alert.colorName
                            }{" "}
                            ·{" "}
                            {
                              alert.sizeName
                            }{" "}
                            · Available{" "}
                            {
                              alert.availableStock
                            }
                          </div>

                          {alert.protectedStock > 0 && (
                            <div className="mt-1 text-[9px] font-semibold text-sky-600">
                              {alert.draftStock > 0
                                ? `Draft ${alert.draftStock} · `
                                : ""}
                              {alert.incomingStock > 0
                                ? `Incoming ${alert.incomingStock} · `
                                : ""}
                              Protected {alert.protectedStock}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <div
                            className={`text-[9px] font-bold uppercase ${
                              alert.health ===
                              "OUT_OF_STOCK"
                                ? "text-red-600"
                                : alert.health ===
                                    "CRITICAL"
                                  ? "text-rose-600"
                                  : "text-amber-600"
                            }`}
                          >
                            {alert.health ===
                            "OUT_OF_STOCK"
                              ? "Out"
                              : alert.health ===
                                  "CRITICAL"
                                ? "Critical"
                                : "Low"}
                          </div>

                          {alert.recommendedReorderQty > 0 ? (
                            <>
                              <div className="mt-1 text-xs font-semibold">
                                +{
                                  alert.recommendedReorderQty
                                } pcs
                              </div>

                              <Link
                                href={`/admin/inventory?variant=${encodeURIComponent(
                                  alert.variantId,
                                )}&action=restock`}
                                className="mt-2 inline-flex rounded-lg bg-[#211C18] px-3 py-1.5 text-[9px] font-semibold text-white"
                              >
                                Restock →
                              </Link>
                            </>
                          ) : (
                            <>
                              <div className="mt-1 text-xs font-semibold text-sky-600">
                                PO Covered
                              </div>

                              <Link
                                href="/admin/purchase-orders"
                                className="mt-2 inline-flex rounded-lg bg-sky-50 px-3 py-1.5 text-[9px] font-semibold text-sky-700"
                              >
                                View PO →
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-sm font-semibold text-emerald-600">
                    Inventory healthy ✓
                  </div>

                  <p className="mt-1 text-xs text-[#9A9188]">
                    No low, critical or out-of-stock variants.
                  </p>
                </div>
              )}

              <div className="border-t border-black/5 bg-[#FFFDF9] px-5 py-3 text-[10px] text-[#9A9188]">
                Alert rules: Low ≤{" "}
                {
                  inventorySummary.lowStockThreshold
                }{" "}
                · Critical ≤{" "}
                {
                  inventorySummary.criticalStockThreshold
                }
              </div>
            </section>
          ) : null}

          {procurementSummary ? (
            <section className="mt-7 overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-black/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      Procurement Alerts
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        procurementSummary.riskLevel === "HIGH"
                          ? "bg-red-50 text-red-600"
                          : procurementSummary.riskLevel === "MEDIUM"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {procurementSummary.riskLevel === "LOW"
                        ? "HEALTHY"
                        : `${procurementSummary.riskLevel} RISK`}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[#9A9188]">
                    Purchase timing, supplier reliability and cost movement
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href="/admin/purchase-orders"
                    className="rounded-xl border border-black/5 px-3 py-2 text-xs font-semibold"
                  >
                    Purchase Orders
                  </Link>

                  <Link
                    href="/admin/suppliers"
                    className="rounded-xl bg-[#211C18] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Suppliers →
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/5 lg:grid-cols-4">
                <div className="bg-white p-4">
                  <div className="text-[9px] font-semibold uppercase text-red-500">
                    Overdue
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {procurementSummary.overduePOCount}
                  </div>
                </div>

                <div className="bg-white p-4">
                  <div className="text-[9px] font-semibold uppercase text-amber-600">
                    Due Soon
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {procurementSummary.dueSoonPOCount}
                  </div>
                </div>

                <div className="bg-white p-4">
                  <div className="text-[9px] font-semibold uppercase text-sky-600">
                    Pending Exposure
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {formatMoney(
                      procurementSummary.pendingIncomingValue,
                    )}
                  </div>
                  <div className="mt-1 text-[9px] text-[#9A9188]">
                    {procurementSummary.pendingIncomingPieces} pcs ·{" "}
                    {procurementSummary.incomingPOCount} POs
                  </div>
                </div>

                <div className="bg-white p-4">
                  <div className="text-[9px] font-semibold uppercase text-rose-600">
                    Supplier Risk
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {procurementSummary.supplierReliabilityRiskCount}
                  </div>
                  <div className="mt-1 text-[9px] text-[#9A9188]">
                    Cost risk {procurementSummary.costIncreaseSupplierCount}
                  </div>
                </div>
              </div>

              {procurementSummary.alerts.length > 0 ? (
                <div className="divide-y divide-black/5">
                  {procurementSummary.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 p-4"
                    >
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black ${
                          alert.severity === "HIGH"
                            ? "bg-red-50 text-red-600"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        !
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">
                          {alert.title}
                        </div>
                        <div className="mt-1 text-[10px] leading-5 text-[#9A9188]">
                          {alert.detail}
                        </div>
                      </div>

                      <Link
                        href={alert.href}
                        className="shrink-0 rounded-lg bg-[#211C18] px-3 py-2 text-[9px] font-semibold text-white"
                      >
                        Review →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-sm font-semibold text-emerald-600">
                    Procurement healthy ✓
                  </div>
                  <p className="mt-1 text-xs text-[#9A9188]">
                    No overdue purchase orders or active supplier risks.
                  </p>
                </div>
              )}

              <div className="border-t border-black/5 bg-[#FFFDF9] px-5 py-3 text-[10px] text-[#9A9188]">
                Needs attention suppliers{" "}
                {procurementSummary.needsAttentionSupplierCount}
                {" · "}
                High-value pending POs{" "}
                {procurementSummary.highValuePendingPOCount}
                {" · "}
                Alerts {procurementSummary.alertCount}
              </div>
            </section>
          ) : null}

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Quick Management</h3>
                  <p className="mt-1 text-xs text-[#9A9188]">
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
                  ["Restock Queue", "/admin/restock", "Purchase planning and reorder batches"],
                  ["Suppliers", "/admin/suppliers", "Manage vendors and purchase contacts"],
                ].map(([title, href, description]) => (
                  <Link
                    key={href}
                    href={href}
                    className="group rounded-2xl border border-black/5 p-4 transition hover:border-[#D9C29A]/40 hover:bg-[#FFFDF9]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{title}</span>
                      <span className="text-[#D4AF37] transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#9A9188]">
                      {description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <h3 className="font-semibold">Store Modes</h3>
              <p className="mt-1 text-xs text-[#9A9188]">
                Retail and reseller commerce
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-[#F8F1E7] p-4">
                  <div>
                    <div className="text-sm font-medium">Retail Mode</div>
                    <div className="mt-1 text-xs text-[#9A9188]">
                      Individual customer shopping
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                      salesMode?.retailStatus ===
                      "CLOSED"
                        ? "bg-red-50 text-red-600"
                        : salesMode?.retailStatus ===
                            "OPEN"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {salesMode?.retailStatus ??
                      "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-[#F8F1E7] p-4">
                  <div>
                    <div className="text-sm font-medium">Reseller Mode</div>
                    <div className="mt-1 text-xs text-[#9A9188]">
                      Bulk & wholesale orders
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                      salesMode?.resellerStatus ===
                      "CLOSED"
                        ? "bg-red-50 text-red-600"
                        : salesMode?.resellerStatus ===
                            "OPEN"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {salesMode?.resellerStatus ??
                      "—"}
                  </span>
                </div>
              </div>

              <Link
                href="/admin/settings"
                className="mt-5 block rounded-2xl border border-dashed border-[#E4D7C4] p-4 transition hover:border-[#D9C29A]/50 hover:bg-[#FFFDF9]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium">
                    Store Controls
                  </div>
                  <span className="text-[#D4AF37]">
                    →
                  </span>
                </div>
                <div className="mt-1 text-xs leading-5 text-[#9A9188]">
                  Manage retail and reseller availability, COD,
                  maintenance mode and checkout rules.
                </div>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

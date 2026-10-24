"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Status = "OPEN" | "CLOSED";
type Overview = {
  orders: {
    all: number;
    pending: number;
    toPack: number;
    readyToShip: number;
    shipped: number;
    returns: number;
    refundsDue: number;
    delivered: number;
  };
  insights: {
    todayOrders: number;
    todayPaidSales: number;
    sevenDayOrders: number;
    sevenDayPaidSales: number;
    daily: Array<{ date: string; orders: number; paidSales: number }>;
  };
  stock: { outOfStock: number; lowStock: number };
  products: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    type: string;
    createdAt: string;
    customerName: string;
    totalAmount: number;
  }>;
  salesMode: { retailStatus: Status; resellerStatus: Status };
};

const coreMenu = [
  { title: "Dashboard", href: "/admin", icon: "▦" },
  { title: "Orders", href: "/admin/orders", icon: "▤" },
  { title: "Products", href: "/admin/products", icon: "◇" },
  { title: "Product Catalogue", href: "/admin/product-catalog", icon: "⌕" },
  { title: "Inventory", href: "/admin/inventory", icon: "▥" },
  { title: "Customers", href: "/admin/customers", icon: "◎" },
  { title: "Delivery", href: "/admin/delivery", icon: "⌖" },
  { title: "Reports", href: "/admin/reports", icon: "▧" },
  { title: "Settings", href: "/admin/settings", icon: "⚙" },
];

const extraMenu = [
  { title: "Categories", href: "/admin/categories" },
  { title: "Colours", href: "/admin/colors" },
  { title: "Sizes", href: "/admin/sizes" },
  { title: "Reviews", href: "/admin/reviews" },
  { title: "Banners", href: "/admin/banners" },
  { title: "Homepage Content", href: "/admin/home-content" },
  { title: "Coupons", href: "/admin/coupons" },
  { title: "Campaign Offers", href: "/admin/campaign-offers" },
  { title: "Restock Queue", href: "/admin/restock" },
  { title: "Suppliers", href: "/admin/suppliers" },
  { title: "Purchase Orders", href: "/admin/purchase-orders" },
  { title: "Reseller Sets", href: "/admin/reseller-sets" },
  { title: "Notifications", href: "/admin/notifications" },
  { title: "Video Content", href: "/admin/video-content" },
  { title: "Profit Protection", href: "/admin/profit-protection" },
];

function currency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

function simpleDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  }).format(new Date(date));
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z"));
}

function MenuLinks({ close }: { close: () => void }) {
  return (
    <nav aria-label="Administration" className="flex-1 overflow-y-auto px-3 py-4">
      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
        Manage Store
      </p>
      <div className="space-y-1">
        {coreMenu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            className={
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition " +
              (item.href === "/admin"
                ? "bg-[#F8F3E9] text-[#192D25]"
                : "text-white/75 hover:bg-white/10 hover:text-white")
            }
          >
            <span aria-hidden className="w-6 text-center text-base">{item.icon}</span>
            {item.title}
          </Link>
        ))}
      </div>
      <details className="group mt-5 rounded-xl border border-white/10 px-3 py-2">
        <summary className="cursor-pointer select-none py-2 text-xs font-semibold text-white/75">
          More Management Tools
        </summary>
        <div className="mt-1 space-y-0.5 border-t border-white/10 pt-2">
          {extraMenu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className="block rounded-lg px-2 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-white"
            >
              {item.title}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [chartMode, setChartMode] = useState<"orders" | "sales">("orders");
  const [savingMode, setSavingMode] = useState<"retail" | "reseller" | null>(null);
  const [modeFeedback, setModeFeedback] = useState("");
  const [modeError, setModeError] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/dashboard-overview", {
        cache: "no-store", credentials: "same-origin",
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Dashboard is currently unavailable.");
      }

      setOverview(data as Overview);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function toggleMode(mode: "retail" | "reseller") {
    if (!overview || savingMode) return;
    const current = mode === "retail"
      ? overview.salesMode.retailStatus
      : overview.salesMode.resellerStatus;

    setSavingMode(mode);
    setModeFeedback("");
    setModeError(false);
    try {
      const response = await fetch("/api/admin/sales-mode", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode, status: current === "OPEN" ? "CLOSED" : "OPEN",
        }),
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.salesMode) {
        throw new Error(data.error || "Could not update store mode.");
      }

      setOverview((before) => before
        ? { ...before, salesMode: data.salesMode }
        : before);
      setModeFeedback(data.message || "Store mode updated.");
    } catch (error) {
      setModeError(true);
      setModeFeedback(error instanceof Error ? error.message : "Unable to update store mode.");
    } finally {
      setSavingMode(null);
    }
  }

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  const tasks = overview ? [
    { name: "Pending Orders", count: overview.orders.pending, icon: "◷", href: "/admin/orders?status=PENDING", tone: "text-amber-700 bg-amber-50" },
    { name: "To Pack", count: overview.orders.toPack, icon: "▣", href: "/admin/orders?status=CONFIRMED", tone: "text-blue-700 bg-blue-50" },
    { name: "Ready to Ship", count: overview.orders.readyToShip, icon: "↗", href: "/admin/orders?status=PACKED", tone: "text-violet-700 bg-violet-50" },
    { name: "Returns", count: overview.orders.returns + overview.orders.refundsDue, icon: "↶", href: "/admin/orders?status=RETURN_REQUESTED", tone: "text-rose-700 bg-rose-50" },
    { name: "Out of Stock", count: overview.stock.outOfStock, icon: "!", href: "/admin/inventory", tone: "text-red-700 bg-red-50" },
    { name: "Low Stock", count: overview.stock.lowStock, icon: "↓", href: "/admin/inventory", tone: "text-orange-700 bg-orange-50" },
  ] : [];
  const days = overview?.insights.daily ?? [];
  const chartValues = days.map((d) => chartMode === "orders" ? d.orders : d.paidSales);
  const maxValue = Math.max(0, ...chartValues);

  return (
    <div className="min-h-screen bg-[#F8F6F2] text-[#25251F]">
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}
      <aside className={
        "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-white/10 bg-[#17251F] text-white transition-transform lg:translate-x-0 " +
        (menuOpen ? "translate-x-0" : "-translate-x-full")
      }>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link href="/admin" onClick={() => setMenuOpen(false)} className="font-serif text-xl tracking-wide">
            AS <span className="text-[#D8BB8A]">FASHIONS</span>
          </Link>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-white/70 lg:hidden">✕</button>
        </div>
        <MenuLinks close={() => setMenuOpen(false)} />
        <div className="border-t border-white/10 px-5 py-4 text-xs text-white/50">
          Store management · Live data
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#EAE4D9] bg-[#F8F6F2]/95 px-4 py-3 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open admin menu" onClick={() => setMenuOpen(true)} className="rounded-xl border border-[#E6DECF] bg-white px-3 py-2 text-lg lg:hidden">
              ☰
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#998A75]">AS FASHIONS / ADMIN</p>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void load()} className="rounded-xl border border-[#E6DECF] bg-white px-3 py-2 text-xs font-semibold text-[#465347]">
              Refresh
            </button>
            <button type="button" onClick={() => void logout()} className="rounded-xl bg-[#1E3328] px-3 py-2 text-xs font-semibold text-white">
              Logout
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1250px] space-y-5 px-4 py-5 sm:space-y-6 sm:px-7 sm:py-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1B2D23] sm:text-3xl">Store overview</h2>
              <p className="mt-1 text-xs text-[#857A6C]">Orders, sales and daily tasks in one place · Updates every minute</p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/orders" className="rounded-xl bg-[#1E4736] px-4 py-2.5 text-xs font-bold text-white">View Orders →</Link>
              <Link href="/admin/products" className="rounded-xl border border-[#DAD1C1] bg-white px-4 py-2.5 text-xs font-bold text-[#253B2E]">+ Add Product</Link>
            </div>
          </div>

          {loadError && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {loadError} <button type="button" onClick={() => void load()} className="ml-2 font-bold underline">Try again</button>
            </div>
          )}
          {loading && !overview ? (
            <div className="rounded-2xl border border-[#E6DECF] bg-white p-8 text-center text-sm text-[#857A6C]">
              Loading your store dashboard…
            </div>
          ) : overview ? (
            <>
              <section aria-labelledby="todo-heading" className="rounded-[22px] border border-[#EAE4D9] bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 id="todo-heading" className="text-lg font-bold text-[#223A2D]">To Do List</h3>
                    <p className="mt-0.5 text-xs text-[#857A6C]">What needs your attention today</p>
                  </div>
                  <Link href="/admin/orders" className="text-xs font-bold text-[#276548]">All orders →</Link>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
                  {tasks.map((task) => (
                    <Link
                      key={task.name}
                      href={task.href}
                      className="group rounded-2xl border border-[#EEEAE4] p-3 transition hover:border-[#B6CBBE] hover:shadow-sm sm:p-4"
                    >
                      <span className={"flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold " + task.tone}>
                        {task.icon}
                      </span>
                      <p className="mt-3 text-[11px] leading-4 text-[#716D66]">{task.name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-2xl font-bold tabular-nums text-[#1B3327]">{task.count}</span>
                        <span className="text-xs text-[#A4A096] group-hover:text-[#225B40]">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <section aria-labelledby="insights-heading" className="rounded-[22px] border border-[#EAE4D9] bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 id="insights-heading" className="text-lg font-bold text-[#223A2D]">Business Insights</h3>
                    <p className="mt-0.5 text-xs text-[#857A6C]">Live data · Paid sales exclude refunded and cancelled orders</p>
                  </div>
                  <div className="flex rounded-full bg-[#F5F1EA] p-1 text-xs">
                    <button type="button" onClick={() => setChartMode("orders")} className={"rounded-full px-3 py-1.5 font-semibold " + (chartMode === "orders" ? "bg-white text-[#1E4736] shadow-sm" : "text-[#857A6C]")}>Orders</button>
                    <button type="button" onClick={() => setChartMode("sales")} className={"rounded-full px-3 py-1.5 font-semibold " + (chartMode === "sales" ? "bg-white text-[#1E4736] shadow-sm" : "text-[#857A6C]")}>Paid Sales</button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { title: "Today's Orders", value: String(overview.insights.todayOrders) },
                    { title: "Today's Paid Sales", value: currency(overview.insights.todayPaidSales) },
                    { title: "Last 7 Days Orders", value: String(overview.insights.sevenDayOrders) },
                    { title: "Last 7 Days Paid Sales", value: currency(overview.insights.sevenDayPaidSales) },
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl bg-[#F9F7F2] p-3 sm:p-4">
                      <p className="text-[10px] font-medium text-[#82776B]">{item.title}</p>
                      <p className="mt-2 text-lg font-bold tabular-nums text-[#203A2D] sm:text-xl">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-[#F0EAE0] px-3 pb-4 pt-5 sm:px-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#425C4D]">7-day {chartMode === "orders" ? "order activity" : "paid sales"}</span>
                    <span className="text-[10px] text-[#9B8E7D]">IST</span>
                  </div>
                  {maxValue > 0 ? (
                    <div className="grid h-40 grid-cols-7 items-end gap-2 border-b border-[#E7E0D6] pb-1">
                      {days.map((day) => {
                        const value = chartMode === "orders" ? day.orders : day.paidSales;
                        return (
                          <div key={day.date} className="flex h-full flex-col items-center justify-end gap-1">
                            <span className="text-[9px] font-semibold tabular-nums text-[#657367]">
                              {chartMode === "orders" ? value : value > 0 ? currency(value) : ""}
                            </span>
                            <div
                              title={dayLabel(day.date) + ": " + (chartMode === "orders" ? String(value) + " orders" : currency(value) + " paid sales")}
                              style={{ height: String(value > 0 ? Math.max(5, (value / maxValue) * 100) : 2) + "%" }}
                              className={"w-full max-w-11 rounded-t-md " + (value > 0 ? "bg-[#307457]" : "bg-[#EAE5DB]")}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-xl bg-[#F9F8F5] text-center text-xs text-[#887C6C]">
                      {chartMode === "orders" ? "No orders recorded in the last 7 days." : "No paid sales recorded in the last 7 days."}
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-7 gap-1">
                    {days.map((day) => (
                      <p key={day.date} className="text-center text-[9px] text-[#8B8176]">{dayLabel(day.date)}</p>
                    ))}
                  </div>
                </div>
              </section>

              <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
                <section aria-labelledby="recent-heading" className="min-w-0 overflow-hidden rounded-[22px] border border-[#EAE4D9] bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-2 p-4 pb-3 sm:px-6 sm:pt-5">
                    <div>
                      <h3 id="recent-heading" className="text-lg font-bold text-[#223A2D]">Recent Orders</h3>
                      <p className="text-xs text-[#857A6C]">{overview.orders.all} total orders</p>
                    </div>
                    <Link href="/admin/orders" className="text-xs font-bold text-[#276548]">View all →</Link>
                  </div>
                  {overview.recentOrders.length ? (
                    <div className="divide-y divide-[#F2EDE6]">
                      {overview.recentOrders.map((order) => (
                        <Link key={order.id} href={"/admin/orders?status=" + encodeURIComponent(order.status)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#FAF9F6] sm:px-6">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#1F362A]">{order.orderNumber}</p>
                            <p className="mt-1 truncate text-[11px] text-[#837A6D]">{order.customerName} · {simpleDate(order.createdAt)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-bold tabular-nums">{currency(order.totalAmount)}</p>
                            <p className="mt-1 text-[10px] text-[#887D6F]">{order.status.replaceAll("_", " ")}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <p className="text-sm font-semibold text-[#324D3D]">No orders yet</p>
                      <p className="mt-1 text-xs text-[#9B8F80]">New customer orders will appear here automatically.</p>
                    </div>
                  )}
                </section>

                <section aria-labelledby="mode-heading" className="rounded-[22px] border border-[#EAE4D9] bg-white p-4 shadow-sm sm:p-6">
                  <h3 id="mode-heading" className="text-lg font-bold text-[#223A2D]">Store Modes</h3>
                  <p className="mt-1 text-xs text-[#857A6C]">Control customer and reseller checkout</p>
                  <div className="mt-5 space-y-3">
                    {([
                      { key: "retail" as const, title: "Retail Mode", note: "Individual customer orders", status: overview.salesMode.retailStatus },
                      { key: "reseller" as const, title: "Reseller Mode", note: "Bulk and wholesale orders", status: overview.salesMode.resellerStatus },
                    ]).map((mode) => (
                      <div key={mode.key} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8F3EA] p-4">
                        <div>
                          <p className="text-sm font-bold text-[#2E3D32]">{mode.title}</p>
                          <p className="mt-1 text-[11px] text-[#81776C]">{mode.note}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={"text-[10px] font-bold " + (mode.status === "OPEN" ? "text-emerald-700" : "text-red-700")}>
                            {mode.status === "OPEN" ? "ON" : "OFF"}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-label={mode.title}
                            aria-checked={mode.status === "OPEN"}
                            disabled={savingMode !== null}
                            onClick={() => void toggleMode(mode.key)}
                            className={"relative h-8 w-14 rounded-full transition-colors disabled:opacity-50 " + (mode.status === "OPEN" ? "bg-[#207657]" : "bg-[#A49F99]")}
                          >
                            <span className={"absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-sm transition-all " + (mode.status === "OPEN" ? "left-[26px]" : "left-[3px]")} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {modeFeedback && <p role={modeError ? "alert" : "status"} className={"mt-3 rounded-lg p-2 text-xs " + (modeError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>{modeFeedback}</p>}
                  <Link href="/admin/settings" className="mt-5 block rounded-xl border border-[#E7DFD2] px-4 py-3 text-center text-xs font-bold text-[#3D5747]">More Store Settings →</Link>
                </section>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7DFD2] bg-white p-4 text-xs">
                <div className="text-[#756C61]">
                  <span className="font-bold text-[#223A2D]">{overview.products}</span> active products · <span className="font-bold text-[#223A2D]">{overview.orders.shipped}</span> orders in transit · <span className="font-bold text-[#223A2D]">{overview.orders.delivered}</span> delivered
                </div>
                <div className="flex flex-wrap gap-4 font-semibold text-[#246145]">
                  <Link href="/admin/inventory">Inventory →</Link>
                  <Link href="/admin/delivery">Delivery →</Link>
                  <Link href="/admin/reports">Sales Reports →</Link>
                </div>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

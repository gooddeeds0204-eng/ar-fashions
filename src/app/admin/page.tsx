const modules = [
  ["Products", "Manage products, prices, stock, images and videos."],
  ["Categories", "Create categories and unlimited subcategories."],
  ["Colors", "Manage the complete color master."],
  ["Sizes", "Manage sizes and select-all controls."],
  ["Inventory", "Track color × size stock."],
  ["Reseller Sets", "Create bulk/reseller sets and MOQ."],
  ["Orders", "Manage retail and reseller orders."],
  ["Customers", "Manage customers and reseller accounts."],
  ["Banners", "Control homepage banners and campaigns."],
  ["Coupons", "Create and manage discounts."],
  ["Settings", "Retail/reseller modes and site settings."],
];

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
            AR Fashions
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Admin Panel
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Manage your complete store catalog, inventory, retail sales and
            reseller business from one place.
          </p>
        </div>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(([title, description]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 transition hover:border-emerald-400/40 hover:bg-white/[0.08]"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

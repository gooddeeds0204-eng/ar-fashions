"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type Summary = {
  totalOrders: number;
  deliveredOrders: number;
  deliveredSales: number;
  averageOrderValue: number;
  pipelineOrders: number;
  pipelineValue: number;
  discountTotal: number;
  deliveryRevenue: number;
};

type TypeSales = {
  orders: number;
  sales: number;
};

type StatusItem = {
  status: string;
  orders: number;
  value: number;
};

type TrendItem = {
  date: string;
  orders: number;
  sales: number;
};

type ProductItem = {
  productId: string;
  name: string;
  quantity: number;
  itemSales: number;
};

type CustomerItem = {
  userId: string;
  name: string;
  phone: string | null;
  orders: number;
  sales: number;
};

type ProfitSummary = {
  merchandiseRevenue: number;
  snapshotCoveredRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;

  snapshotCoveragePercent:
    number;

  snapshotPieceCoveragePercent:
    number;

  deliveredItemPieces: number;
  snapshotCoveredPieces: number;

  negativeMarginProducts:
    number;

  lowMarginProductCount:
    number;
};

type ProfitTypeStats = {
  revenue: number;
  coveredRevenue: number;
  cogs: number;
  profit: number;
  marginPercent: number;
  coveragePercent: number;
};

type ProfitProductItem = {
  productId: string;
  name: string;
  quantity: number;
  coveredQuantity: number;
  revenue: number;
  coveredRevenue: number;
  cogs: number;
  profit: number;
  marginPercent: number;
  coveragePercent: number;
};

type ProfitAnalytics = {
  summary: ProfitSummary;

  byType: {
    RETAIL:
      ProfitTypeStats;

    RESELLER:
      ProfitTypeStats;
  };

  topProfitProducts:
    ProfitProductItem[];

  lowMarginProducts:
    ProfitProductItem[];
};

type PurchaseSummary = {
  purchaseOrders: number;
  purchaseSpend: number;
  receivedPurchaseValue: number;
  receivedPurchasePieces: number;
  pendingIncomingValue: number;
  pendingIncomingPieces: number;
  draftPurchaseValue: number;
  draftPurchasePieces: number;
  cancelledPurchaseOrders: number;
};

type SupplierSpendItem = {
  supplierId: string;
  supplierName: string;
  purchaseOrders: number;
  committedValue: number;
  receivedValue: number;
  incomingValue: number;
  draftValue: number;
  receivedPieces: number;
};

type PurchasedProductItem = {
  name: string;
  quantity: number;
  purchaseValue: number;
};

type PurchaseTrendItem = {
  date: string;
  purchaseOrders: number;
  committedValue: number;
  receivedValue: number;
};

type CostAlertItem = {
  supplierId: string;
  supplierName: string;
  variantId: string;
  productName: string;
  colorName: string;
  sizeName: string;
  sku: string | null;
  quotedCost: number;
  lastPurchaseCost: number;
  difference: number;
  percentChange: number;
  direction:
    | "INCREASE"
    | "DROP"
    | "SAME";
  preferred: boolean;
  lastPurchasedAt:
    | string
    | null;
};

type PurchaseAnalytics = {
  summary: PurchaseSummary;
  supplierSpend:
    SupplierSpendItem[];
  topPurchasedProducts:
    PurchasedProductItem[];
  purchaseTrend:
    PurchaseTrendItem[];
  costAlerts:
    CostAlertItem[];
};

type SalesRow = {
  orderNumber: string;
  date: string;
  type: string;
  orderStatus: string;
  paymentStatus: string;
  couponCode: string | null;
  deliveryChargePending: boolean;
  customerName: string;
  phone: string | null;
  paymentMethod: string | null;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  totalAmount: number;
  itemQuantity: number;
  products: string;
};

type GstAuditRow = {
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  orderType: string;
  orderStatus: string;
  paymentStatus: string;
  deliveryChargePending: boolean;
  lineItemId: string;
  customerName: string;
  phone: string | null;
  customerState: string;
  pincode: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  orderDiscount: number;
  deliveryCharge: number;
  orderTotal: number;
  paymentMethod: string | null;
};

type ReportData = {
  range: {
    days: number;
    from: string;
    to: string;
  };

  summary: Summary;

  salesByType: {
    RETAIL: TypeSales;
    RESELLER: TypeSales;
  };

  statusBreakdown:
    StatusItem[];

  dailyTrend:
    TrendItem[];

  topProducts:
    ProductItem[];

  topCustomers:
    CustomerItem[];

  salesRows:
    SalesRow[];

  gstAuditRows:
    GstAuditRow[];

  profitAnalytics:
    ProfitAnalytics;

  purchaseAnalytics:
    PurchaseAnalytics;

  notes: {
    salesRule: string;
    trendRule: string;
    profitRule: string;
    purchaseRule: string;
    purchaseTrendRule: string;
    costAlertRule: string;
  };
};

function money(value: number) {
  return `₹${Number(
    value || 0,
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

function statusLabel(
  value: string,
) {
  return value.replaceAll(
    "_",
    " ",
  );
}

export default function ReportsPage() {
  const router =
    useRouter();

  const [
    days,
    setDays,
  ] =
    useState<
      7 | 30 | 90
    >(30);

  const [reportTab, setReportTab] = useState<"SALES" | "GST" | "ADVANCED">("SALES");
  const [period, setPeriod] = useState<"7" | "30" | "90" | "MONTH" | "CUSTOM">("30");
  const indiaToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const [month, setMonth] = useState(indiaToday.slice(0, 7));
  const [customFrom, setCustomFrom] = useState(indiaToday.slice(0, 8) + "01");
  const [customTo, setCustomTo] = useState(indiaToday);

  const [
    data,
    setData,
  ] =
    useState<ReportData | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("ALL");

  async function loadReports() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (period === "MONTH" && /^\d{4}-\d{2}$/.test(month)) {
        const [year, monthValue] = month.split("-").map(Number);
        const lastDay = new Date(Date.UTC(year, monthValue, 0)).getUTCDate();
        params.set("from", `${month}-01`);
        params.set("to", `${month}-${String(lastDay).padStart(2, "0")}`);
      } else if (period === "CUSTOM") {
        if (!customFrom || !customTo) {
          setError("Choose both From and To dates.");
          setLoading(false);
          return;
        }
        params.set("from", customFrom);
        params.set("to", customTo);
      } else {
        params.set("days", String(days));
      }

      const response =
        await fetch(
          `/api/admin/reports?${params.toString()}`,
          {
            cache:
              "no-store",

            credentials:
              "same-origin",
          },
        );

      if (
        response.status ===
        401
      ) {
        router.replace(
          "/admin/login",
        );

        return;
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Failed to load reports.",
        );
      }

      setData(result);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load reports.",
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadSalesReport() {
    if (!data) {
      return;
    }

    const csvCell = (
      value:
        | string
        | number
        | null
        | undefined,
    ) => {
      const text =
        String(
          value ?? "",
        );

      return `"${text.replaceAll(
        '"',
        '""',
      )}"`;
    };

    const rows: Array<
      Array<
        string | number
      >
    > = [
      [
        "AS FASHIONS SALES REPORT",
      ],
      [
        "Period",
        `${data.range.days} Days`,
      ],
      [
        "From",
        new Date(
          data.range.from,
        ).toLocaleDateString(
          "en-IN",
        ),
      ],
      [
        "To",
        new Date(
          data.range.to,
        ).toLocaleDateString(
          "en-IN",
        ),
      ],
      [],
      [
        "SUMMARY",
      ],
      [
        "Delivered Sales",
        data.summary
          .deliveredSales,
      ],
      ["Total Orders (All Statuses)", data.summary.totalOrders],
      ["Exported Order Lines (All Statuses)", filteredSalesRows.length],
      ["IMPORTANT", "Only DELIVERED orders are counted as completed sales; other order statuses appear in the register for reconciliation."],
      [
        "Delivered Orders",
        data.summary
          .deliveredOrders,
      ],
      [
        "Average Order Value",
        data.summary
          .averageOrderValue,
      ],
      [
        "Retail Sales",
        data.salesByType
          .RETAIL.sales,
      ],
      [
        "Reseller Sales",
        data.salesByType
          .RESELLER.sales,
      ],
      [
        "Discounts",
        data.summary
          .discountTotal,
      ],
      [
        "Delivery Revenue",
        data.summary
          .deliveryRevenue,
      ],
      [],
      ["ORDER NUMBER", "ORDER DATE", "ORDER TYPE", "ORDER STATUS", "PAYMENT STATUS", "CUSTOMER", "PHONE", "PAYMENT METHOD", "ITEM QTY", "PRODUCTS", "SUBTOTAL", "DISCOUNT", "DELIVERY", "TOTAL", "COUPON", "FREIGHT PENDING"],
      ...filteredSalesRows.map(
        (row) => [
          row.orderNumber,
          new Date(
            row.date,
          ).toLocaleString(
            "en-IN",
          ),
          row.type,
          row.orderStatus,
          row.paymentStatus,
          row.customerName,
          row.phone ?? "",
          row.paymentMethod ??
            "",
          row.itemQuantity,
          row.products,
          row.subtotal,
          row.discountAmount,
          row.deliveryCharge,
          row.totalAmount,
          row.couponCode ?? "",
          row.deliveryChargePending ? "YES" : "NO",
        ],
      ),
    ];

    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map(csvCell)
            .join(","),
        )
        .join("\r\n");

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    const stamp =
      new Date()
        .toISOString()
        .slice(0, 10);

    link.href = url;
    link.download =
      `AS-Fashions-Sales-Register-${data.range.days}D-${stamp}.csv`;

    document.body.appendChild(
      link,
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(
      url,
    );
  }

  function downloadGstAuditorReport() {
    if (!data) {
      return;
    }

    const csvCell = (
      value:
        | string
        | number
        | null
        | undefined,
    ) => {
      const text =
        String(
          value ?? "",
        );

      return `"${text.replaceAll(
        '"',
        '""',
      )}"`;
    };

    const rows: Array<
      Array<
        string | number
      >
    > = [
      [
        "AS FASHIONS GST AUDITOR WORKING REPORT",
      ],
      [
        "Period",
        `${data.range.days} Days`,
      ],
      [
        "From",
        new Date(
          data.range.from,
        ).toLocaleDateString(
          "en-IN",
        ),
      ],
      [
        "To",
        new Date(
          data.range.to,
        ).toLocaleDateString(
          "en-IN",
        ),
      ],
      [
        "Note",
        "AUDITOR WORKING REGISTER ONLY. NOT GSTR-1 READY OR A VALIDATED TAX INVOICE. GSTIN, HSN, taxable value and GST amounts have not been captured or calculated.",
      ],
      ["Period Basis", "Order creation date, NOT verified tax invoice issuance date"],
      ["Includes", "All order statuses for reconciliation; exclude or adjust cancellations/returns after verifying credit notes and payment history"],
      ["Duplicated Fields", "Order-level discount, delivery charge and total repeat for each line item; never sum these columns across line items"],
      ["Tax Mode", "Supplier GST registration type, tax-inclusive/exclusive pricing, state-of-supply treatment, and tax rates require auditor verification"],
      ["Filing", "Use the current official GST portal/offline utility after GSTIN, HSN, tax values and debit/credit notes are validated"],

      [],
      [
        "INVOICE NO",
        "INVOICE DATE",
        "ORDER NO",
        "SALE TYPE",
        "ORDER STATUS",
        "PAYMENT STATUS",
        "LINE ITEM ID",
        "REVIEW FLAG",
        "CUSTOMER",
        "PHONE",
        "CUSTOMER GSTIN (VERIFY)",
        "PLACE OF SUPPLY / STATE (VERIFY)",
        "PINCODE",
        "PRODUCT",
        "COLOUR",
        "SIZE",
        "QTY",
        "UNIT PRICE",
        "GROSS LINE VALUE",
        "ORDER DISCOUNT (ORDER-LEVEL REPEATED)",
        "DELIVERY CHARGE (ORDER-LEVEL REPEATED)",
        "ORDER TOTAL (ORDER-LEVEL REPEATED)",
        "PAYMENT METHOD",
        "HSN / SAC",
        "TAXABLE VALUE",
        "GST RATE %",
        "CGST %",
        "CGST AMOUNT",
        "SGST %",
        "SGST AMOUNT",
        "IGST %",
        "IGST AMOUNT",
        "CESS",
        "AUDITOR NOTES",
      ],
      ...data.gstAuditRows.map(
        (row) => [
          row.invoiceNumber,
          new Date(
            row.invoiceDate,
          ).toLocaleDateString(
            "en-IN",
          ),
          row.orderNumber,
          row.orderType,
          row.orderStatus,
          row.paymentStatus,
          row.lineItemId,
          "MISSING TAX DATA - REVIEW",
          row.customerName,
          row.phone ?? "",
          "",
          row.customerState,
          row.pincode,
          row.productName,
          row.colorName ?? "",
          row.sizeName ?? "",
          row.quantity,
          row.unitPrice,
          row.lineAmount,
          row.orderDiscount,
          row.deliveryCharge,
          row.orderTotal,
          row.paymentMethod ?? "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ],
      ),
    ];

    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map(csvCell)
            .join(","),
        )
        .join("\r\n");

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    const stamp =
      new Date()
        .toISOString()
        .slice(0, 10);

    link.href = url;
    link.download =
      `AS-Fashions-GST-Reconciliation-Working-${data.range.days}D-${stamp}.csv`;

    document.body.appendChild(
      link,
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(
      url,
    );
  }

  useEffect(() => {
    void loadReports();
  }, [days, period, month, customFrom, customTo]);

  const filteredSalesRows = (data?.salesRows ?? []).filter((row) => {
    const text = search.trim().toLowerCase();
    const matchesSearch = !text || [
      row.orderNumber, row.customerName, row.products, row.phone ?? "",
    ].some((value) => value.toLowerCase().includes(text));
    const matchesStatus = orderStatus === "ALL" || row.orderStatus === orderStatus;
    return matchesSearch && matchesStatus;
  });

  const gstOrderCount = new Set(
    (data?.gstAuditRows ?? []).map((row) => row.orderNumber),
  ).size;

  const periodSummary = data
    ? `${new Date(data.range.from).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} – ${new Date(data.range.to).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`
    : "";

  const maxTrend =
    useMemo(() => {
      if (!data) {
        return 0;
      }

      return Math.max(
        0,
        ...data.dailyTrend.map(
          (item) =>
            item.sales,
        ),
      );
    }, [data]);

  const maxPurchaseTrend =
    useMemo(() => {
      if (!data) {
        return 0;
      }

      return Math.max(
        0,
        ...data.purchaseAnalytics
          .purchaseTrend.map(
            (item) =>
              item.committedValue,
          ),
      );
    }, [data]);

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 py-6 text-[#211C18] md:px-8">
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">AS FASHIONS · ADMIN</p>
            <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#172F24]">Reports</h1>
            <p className="mt-1 text-sm text-[#81766A]">Simple sales tracking and clear auditor working records.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadReports()}
            className="rounded-xl border border-[#DFD5C5] bg-white px-4 py-2.5 text-xs font-bold text-[#234935] shadow-sm"
          >
            ↻ Refresh
          </button>
        </div>

        <div role="tablist" aria-label="Report type" className="mt-5 grid grid-cols-3 gap-2 rounded-[18px] border border-[#E7DECF] bg-[#F0ECE4] p-1.5">
          {([
            { id: "SALES" as const, label: "Sales Report" },
            { id: "GST" as const, label: "GST Auditor" },
            { id: "ADVANCED" as const, label: "More Analytics" },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={reportTab === tab.id}
              onClick={() => setReportTab(tab.id)}
              className={`min-h-11 rounded-xl px-2 py-2.5 text-xs font-bold transition sm:text-sm ${
                reportTab === tab.id
                  ? "bg-[#124432] text-white shadow-sm"
                  : "text-[#6C665C] hover:bg-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[#ECE4D8] bg-white p-4">
          <p className="text-xs font-bold text-[#3B4F40]">Select report period</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {([
              { id: "7" as const, label: "7 Days" },
              { id: "30" as const, label: "30 Days" },
              { id: "90" as const, label: "90 Days" },
              { id: "MONTH" as const, label: "Full Month" },
              { id: "CUSTOM" as const, label: "Custom Dates" },
            ]).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setPeriod(option.id);
                  if (["7", "30", "90"].includes(option.id)) {
                    setDays(Number(option.id) as 7 | 30 | 90);
                  }
                }}
                className={`rounded-full border px-3 py-2 text-[11px] font-bold ${
                  period === option.id
                    ? "border-[#124432] bg-[#124432] text-white"
                    : "border-[#E7E0D4] bg-[#FAF9F6] text-[#655D53]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {period === "MONTH" ? (
            <label className="mt-4 block max-w-xs text-xs font-semibold text-[#655D53]">
              Calendar month
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-[#DDD2C0] bg-white px-3 py-3 text-sm" />
            </label>
          ) : period === "CUSTOM" ? (
            <div className="mt-4 grid max-w-lg grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-[#655D53]">
                From date
                <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)}
                  className="mt-2 block w-full min-w-0 rounded-xl border border-[#DDD2C0] bg-white px-2 py-3 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-[#655D53]">
                To date
                <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)}
                  className="mt-2 block w-full min-w-0 rounded-xl border border-[#DDD2C0] bg-white px-2 py-3 text-sm" />
              </label>
              <p className="col-span-2 text-[11px] text-[#96897C]">Up to 366 days per download.</p>
            </div>
          ) : null}
          {data && <p className="mt-3 text-[11px] text-[#92877B]">Selected period: {periodSummary}</p>}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-10 text-sm font-bold text-zinc-400">
            Loading reports...
          </div>
        ) : data ? (
          <>
            {reportTab === "SALES" && (
              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-[#203C2E]">Sales Overview</h2>
                    <p className="mt-1 text-xs leading-5 text-[#81776B]">
                      Completed sales count delivered orders only. The order register includes every status.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSalesReport}
                    className="rounded-xl bg-[#12613F] px-4 py-3 text-xs font-bold text-white"
                  >
                    ↓ Download Sales Register (.csv)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: "Delivered Sales", value: money(data.summary.deliveredSales), caption: "Completed orders only" },
                    { label: "Delivered Orders", value: String(data.summary.deliveredOrders), caption: "Successfully delivered" },
                    { label: "Total Orders", value: String(data.summary.totalOrders), caption: "All order statuses" },
                    { label: "Pending Pipeline", value: money(data.summary.pipelineValue), caption: String(data.summary.pipelineOrders) + " active orders · not yet sales" },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-[#ECE5DA] bg-white p-4 shadow-sm sm:p-5">
                      <p className="text-[11px] font-semibold text-[#7B7367]">{metric.label}</p>
                      <p className="mt-2 text-2xl font-black tabular-nums text-[#163D2B]">{metric.value}</p>
                      <p className="mt-1 text-[10px] leading-4 text-[#9B9083]">{metric.caption}</p>
                    </div>
                  ))}
                </div>

                <section className="rounded-2xl border border-[#E9E2D7] bg-white p-4 shadow-sm sm:p-5">
                  <h3 className="text-sm font-black text-[#263F30]">Sales by customer type</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#EFF8F1] p-4">
                      <p className="text-[11px] text-[#5A7162]">Retail Sales</p>
                      <p className="mt-1 text-xl font-bold text-[#145637]">{money(data.salesByType.RETAIL.sales)}</p>
                      <p className="mt-1 text-[10px] text-[#708776]">{data.salesByType.RETAIL.orders} delivered orders</p>
                    </div>
                    <div className="rounded-xl bg-[#F5F2FA] p-4">
                      <p className="text-[11px] text-[#756584]">Wholesale Sales</p>
                      <p className="mt-1 text-xl font-bold text-[#4E306B]">{money(data.salesByType.RESELLER.sales)}</p>
                      <p className="mt-1 text-[10px] text-[#887A97]">{data.salesByType.RESELLER.orders} delivered orders</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                    <p className="rounded-lg bg-[#FAF8F4] p-3 text-[#625C55]">Delivered discounts <strong className="mt-1 block text-sm text-[#29392E]">{money(data.summary.discountTotal)}</strong></p>
                    <p className="rounded-lg bg-[#FAF8F4] p-3 text-[#625C55]">Delivered shipping collected <strong className="mt-1 block text-sm text-[#29392E]">{money(data.summary.deliveryRevenue)}</strong></p>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#E9E2D7] bg-white shadow-sm">
                  <div className="space-y-3 border-b border-[#EFE9E0] p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-[#263F30]">Order-wise Sales Register</h3>
                        <p className="mt-1 text-xs text-[#8A8074]">
                          {filteredSalesRows.length} orders in this view. Filtered rows are included in the CSV download.
                        </p>
                      </div>
                      <span className="rounded-full bg-[#EFF8F1] px-3 py-1.5 text-[10px] font-bold text-[#276146]">Live order data</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                      <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search order, customer, product..."
                        aria-label="Search sales register"
                        className="w-full rounded-xl border border-[#E6DECE] px-3 py-3 text-sm outline-none focus:border-emerald-600"
                      />
                      <select
                        value={orderStatus}
                        onChange={(event) => setOrderStatus(event.target.value)}
                        aria-label="Filter by order status"
                        className="rounded-xl border border-[#E6DECE] bg-white px-3 py-3 text-xs font-semibold"
                      >
                        <option value="ALL">All Order Statuses</option>
                        {["PENDING","CONFIRMED","PACKED","SHIPPED","DELIVERED","CANCELLED","RETURN_REQUESTED","RETURNED","REFUNDED"].map((status) => (
                          <option key={status} value={status}>{status.replaceAll("_"," ")}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-xs">
                      <thead className="bg-[#F8F6F1] text-[10px] font-bold uppercase tracking-wide text-[#6D6A61]">
                        <tr>
                          <th className="px-4 py-3">Order / Date</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Payment</th>
                          <th className="px-4 py-3 text-right">Items</th>
                          <th className="px-4 py-3 text-right">Order Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F3EEE7]">
                        {filteredSalesRows.slice(0, 100).map((row) => (
                          <tr key={row.orderNumber} className="hover:bg-[#FAFAF6]">
                            <td className="px-4 py-3">
                              <p className="font-bold text-[#234E37]">{row.orderNumber}</p>
                              <p className="mt-1 text-[10px] text-[#867B70]">{new Date(row.date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
                            </td>
                            <td className="px-4 py-3 text-[#3E453D]">{row.customerName}</td>
                            <td className="px-4 py-3">{row.type === "RESELLER" ? "Wholesale" : "Retail"}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-[#F1EEE8] px-2.5 py-1 text-[10px] font-bold">{statusLabel(row.orderStatus)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold">{statusLabel(row.paymentStatus)}</p>
                              <p className="mt-1 text-[10px] text-[#898075]">{row.paymentMethod ?? "—"}</p>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">{row.itemQuantity}</td>
                            <td className="px-4 py-3 text-right font-black tabular-nums">{money(row.totalAmount)}</td>
                          </tr>
                        ))}
                        {filteredSalesRows.length === 0 && (
                          <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-[#8B8176]">No orders match the selected period and filters.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredSalesRows.length > 100 && (
                    <p className="border-t border-[#F0EAE0] p-3 text-center text-xs text-[#887E72]">
                      Showing first 100 of {filteredSalesRows.length} orders. Download CSV for every matching row.
                    </p>
                  )}
                </section>
              </div>
            )}

            {reportTab === "GST" && (
              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-[#203C2E]">GST Auditor Working Register</h2>
                    <p className="mt-1 text-xs leading-5 text-[#81776B]">
                      Invoice-level reconciliation worksheet for your CA, not a completed GST return.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadGstAuditorReport}
                    className="rounded-xl bg-[#103C2D] px-4 py-3 text-xs font-bold text-white"
                  >
                    ↓ Download GST Working CSV
                  </button>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-[#FFFAEF] p-4 sm:p-5">
                  <p className="text-sm font-black text-amber-950">Tax details require verification before filing</p>
                  <p className="mt-2 text-xs leading-6 text-amber-900">
                    The website does not yet store verified supplier GSTIN, product HSN, taxable amount or
                    CGST/SGST/IGST breakup per invoice. These columns remain blank in the download.
                    Order date is used as a reference; it is not a confirmed tax invoice issue date.
                    Credits, refunds, GST rates and buyer registration must be checked by your auditor.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: "Orders to Reconcile", value: gstOrderCount },
                    { label: "Invoice Item Lines", value: data.gstAuditRows.length },
                    { label: "Missing Tax Verification", value: data.gstAuditRows.length },
                    { label: "GST Values Calculated", value: "Not available" },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-[#ECE5DA] bg-white p-4">
                      <p className="text-[11px] text-[#7F7468]">{metric.label}</p>
                      <p className="mt-2 text-xl font-bold text-[#214333]">{metric.value}</p>
                    </div>
                  ))}
                </div>

                <section className="rounded-2xl border border-[#E9E2D7] bg-white p-4 sm:p-5">
                  <h3 className="text-base font-black text-[#244032]">Auditor verification checklist</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[
                      ["1. Business & invoice details", "Verify seller GSTIN, registration type, legal name, invoice number and issue date."],
                      ["2. Buyer & place of supply", "Verify buyer GSTIN (when B2B), delivery state and interstate/intrastate tax treatment."],
                      ["3. Goods & taxes", "Confirm correct HSN, item value, applicable GST rate, discounts and shipping tax treatment."],
                      ["4. Returns & reconciliation", "Match payments, cancelled/returned orders, credit notes and GSTR-1/3B totals."],
                    ].map(([title, detail]) => (
                      <div key={title} className="rounded-xl bg-[#F8F7F3] p-3">
                        <p className="text-xs font-bold text-[#244032]">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-[#786F65]">{detail}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-[11px] leading-5 text-[#8B8076]">
                    Important: This CSV is for spreadsheet review. It is not the GST Portal offline-utility upload template.
                    See the official <a className="font-bold text-[#155B3B] underline" href="https://tutorial.gst.gov.in/userguide/returns/GSTR_1.htm" target="_blank" rel="noopener noreferrer">GSTR-1 guidance</a>.
                  </p>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#E9E2D7] bg-white">
                  <div className="p-4 sm:p-5">
                    <h3 className="text-base font-black text-[#244032]">Invoice Line Review</h3>
                    <p className="mt-1 text-xs text-[#84796D]">
                      Every order status is included for reconciliation. Do not sum repeated order totals across product lines.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[770px] text-left text-xs">
                      <thead className="bg-[#F8F6F1] text-[10px] uppercase text-[#74695C]">
                        <tr>
                          <th className="px-4 py-3">Invoice Reference</th>
                          <th className="px-4 py-3">Order Status</th>
                          <th className="px-4 py-3">Destination</th>
                          <th className="px-4 py-3">Item & Qty</th>
                          <th className="px-4 py-3 text-right">Line Value</th>
                          <th className="px-4 py-3">Tax Review</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2EDE4]">
                        {data.gstAuditRows.slice(0, 100).map((row) => (
                          <tr key={row.lineItemId}>
                            <td className="px-4 py-3">
                              <p className="font-bold text-[#214B36]">{row.invoiceNumber}</p>
                              <p className="mt-1 text-[10px] text-[#857A6E]">{new Date(row.invoiceDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} · order date</p>
                            </td>
                            <td className="px-4 py-3">{statusLabel(row.orderStatus)}</td>
                            <td className="px-4 py-3">{row.customerState || "Not captured"}</td>
                            <td className="px-4 py-3">
                              <p className="font-semibold">{row.productName}</p>
                              <p className="mt-1 text-[10px] text-[#857A6E]">Qty {row.quantity} · {row.colorName ?? "—"} · {row.sizeName ?? "—"}</p>
                            </td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums">{money(row.lineAmount)}</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-amber-800">Needs verification</td>
                          </tr>
                        ))}
                        {data.gstAuditRows.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-[#887E73]">No order items in the selected period.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {data.gstAuditRows.length > 100 && (
                    <p className="border-t border-[#F0EAE0] p-3 text-center text-xs text-[#877D70]">
                      Showing 100 of {data.gstAuditRows.length} lines. Download CSV for the full register.
                    </p>
                  )}
                </section>
              </div>
            )}

            {reportTab === "ADVANCED" && (
              <div className="mt-5">
                <p className="mb-4 rounded-xl border border-[#E5DED2] bg-white p-4 text-xs leading-5 text-[#756B5E]">
                  Additional product, profit, purchasing and supplier analytics. These are optional and do not affect GST filing.
                </p>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Delivered Sales
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-700">
                  {money(
                    data.summary
                      .deliveredSales,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  {
                    data.summary
                      .deliveredOrders
                  }{" "}
                  delivered orders
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Average Order Value
                </p>

                <p className="mt-2 text-3xl font-black">
                  {money(
                    data.summary
                      .averageOrderValue,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  Delivered orders
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Active Pipeline
                </p>

                <p className="mt-2 text-3xl font-black text-violet-700">
                  {money(
                    data.summary
                      .pipelineValue,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  {
                    data.summary
                      .pipelineOrders
                  }{" "}
                  active orders
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Total Orders
                </p>

                <p className="mt-2 text-3xl font-black">
                  {
                    data.summary
                      .totalOrders
                  }
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  Selected period
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Discounts
                </p>

                <p className="mt-2 text-2xl font-black">
                  {money(
                    data.summary
                      .discountTotal,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  Delivered orders only
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Delivery Revenue
                </p>

                <p className="mt-2 text-2xl font-black">
                  {money(
                    data.summary
                      .deliveryRevenue,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  Delivered orders only
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Retail Sales
                </p>

                <p className="mt-2 text-2xl font-black">
                  {money(
                    data.salesByType
                      .RETAIL.sales,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  {
                    data.salesByType
                      .RETAIL.orders
                  }{" "}
                  delivered
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-zinc-400">
                  Reseller Sales
                </p>

                <p className="mt-2 text-2xl font-black">
                  {money(
                    data.salesByType
                      .RESELLER.sales,
                  )}
                </p>

                <p className="mt-2 text-[11px] text-zinc-400">
                  {
                    data.salesByType
                      .RESELLER.orders
                  }{" "}
                  delivered
                </p>
              </div>
            </section>

            <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black">
                    Sales Trend
                  </h2>

                  <p className="mt-1 text-xs text-zinc-400">
                    Delivered order value by order creation date.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex h-52 items-end gap-1 overflow-x-auto border-b border-zinc-100 pb-1">
                {data.dailyTrend.map(
                  (item) => {
                    const height =
                      maxTrend > 0
                        ? Math.max(
                            4,
                            Math.round(
                              (item.sales /
                                maxTrend) *
                                180,
                            ),
                          )
                        : 4;

                    return (
                      <div
                        key={
                          item.date
                        }
                        className="flex min-w-3 flex-1 flex-col items-center justify-end"
                        title={`${item.date} · ${money(
                          item.sales,
                        )}`}
                      >
                        <div
                          className={`w-full min-w-2 rounded-t ${
                            item.sales > 0
                              ? "bg-emerald-500"
                              : "bg-zinc-100"
                          }`}
                          style={{
                            height:
                              `${height}px`,
                          }}
                        />
                      </div>
                    );
                  },
                )}
              </div>

              <div className="mt-3 flex justify-between text-[10px] font-bold text-zinc-400">
                <span>
                  {
                    data.dailyTrend[0]
                      ?.date
                  }
                </span>

                <span>
                  {
                    data.dailyTrend[
                      data.dailyTrend
                        .length - 1
                    ]?.date
                  }
                </span>
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black">
                  Order Status
                </h2>

                <div className="mt-4 divide-y">
                  {data.statusBreakdown.map(
                    (item) => (
                      <div
                        key={
                          item.status
                        }
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div>
                          <p className="text-xs font-black">
                            {statusLabel(
                              item.status,
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-400">
                            {
                              item.orders
                            }{" "}
                            orders
                          </p>
                        </div>

                        <p className="text-sm font-black">
                          {money(
                            item.value,
                          )}
                        </p>
                      </div>
                    ),
                  )}

                  {data.statusBreakdown
                    .length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      No orders in this period.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black">
                  Top Products
                </h2>

                <p className="mt-1 text-xs text-zinc-400">
                  Delivered item quantities.
                </p>

                <div className="mt-4 divide-y">
                  {data.topProducts.map(
                    (
                      product,
                      index,
                    ) => (
                      <div
                        key={
                          product.productId
                        }
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-black">
                            {index +
                              1}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-black">
                              {
                                product.name
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-zinc-400">
                              {
                                product.quantity
                              }{" "}
                              pcs sold
                            </p>
                          </div>
                        </div>

                        <p className="text-sm font-black">
                          {money(
                            product.itemSales,
                          )}
                        </p>
                      </div>
                    ),
                  )}

                  {data.topProducts
                    .length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      No delivered products yet.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
                <h2 className="text-lg font-black">
                  Top Customers
                </h2>

                <div className="mt-4 divide-y">
                  {data.topCustomers.map(
                    (
                      customer,
                      index,
                    ) => (
                      <div
                        key={
                          customer.userId
                        }
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-black">
                            {index +
                              1}
                          </span>

                          <div>
                            <p className="text-xs font-black">
                              {
                                customer.name
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-zinc-400">
                              {customer.phone
                                ? `${customer.phone} · `
                                : ""}
                              {
                                customer.orders
                              }{" "}
                              delivered orders
                            </p>
                          </div>
                        </div>

                        <p className="text-sm font-black text-emerald-700">
                          {money(
                            customer.sales,
                          )}
                        </p>
                      </div>
                    ),
                  )}

                  {data.topCustomers
                    .length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      No delivered customers yet.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <section className="mt-8 overflow-hidden rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
                    Profit Intelligence
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Margin & Profitability
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    Delivered merchandise revenue compared with historical cost snapshots.
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                    Cost Coverage
                  </p>

                  <p className="mt-1 text-xl font-black text-emerald-800">
                    {
                      data.profitAnalytics
                        .summary
                        .snapshotCoveragePercent
                    }%
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                    Gross Profit
                  </p>

                  <p className="mt-2 text-2xl font-black text-emerald-800">
                    {money(
                      data.profitAnalytics
                        .summary
                        .grossProfit,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                    COGS
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {money(
                      data.profitAnalytics
                        .summary
                        .cogs,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-violet-50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-violet-600">
                    Gross Margin
                  </p>

                  <p className="mt-2 text-2xl font-black text-violet-800">
                    {
                      data.profitAnalytics
                        .summary
                        .grossMarginPercent
                    }%
                  </p>
                </div>

                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-sky-600">
                    Covered Revenue
                  </p>

                  <p className="mt-2 text-2xl font-black text-sky-800">
                    {money(
                      data.profitAnalytics
                        .summary
                        .snapshotCoveredRevenue,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">
                        Retail Margin
                      </p>

                      <p className="mt-1 text-[10px] text-zinc-400">
                        Covered revenue{" "}
                        {money(
                          data.profitAnalytics
                            .byType
                            .RETAIL
                            .coveredRevenue,
                        )}
                      </p>
                    </div>

                    <p className="text-xl font-black text-emerald-700">
                      {
                        data.profitAnalytics
                          .byType
                          .RETAIL
                          .marginPercent
                      }%
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-black/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">
                        Reseller Margin
                      </p>

                      <p className="mt-1 text-[10px] text-zinc-400">
                        Covered revenue{" "}
                        {money(
                          data.profitAnalytics
                            .byType
                            .RESELLER
                            .coveredRevenue,
                        )}
                      </p>
                    </div>

                    <p className="text-xl font-black text-emerald-700">
                      {
                        data.profitAnalytics
                          .byType
                          .RESELLER
                          .marginPercent
                      }%
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 text-[10px] font-bold text-zinc-500">
                Snapshot coverage{" "}
                {
                  data.profitAnalytics
                    .summary
                    .snapshotCoveredPieces
                }{" "}
                /{" "}
                {
                  data.profitAnalytics
                    .summary
                    .deliveredItemPieces
                }{" "}
                pcs · Negative-margin products{" "}
                {
                  data.profitAnalytics
                    .summary
                    .negativeMarginProducts
                }{" "}
                · Low-margin products{" "}
                {
                  data.profitAnalytics
                    .summary
                    .lowMarginProductCount
                }
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">
                      Top Profit Products
                    </h2>

                    <p className="mt-1 text-xs text-zinc-400">
                      Highest gross profit from snapshot-covered sales.
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
                    {
                      data.profitAnalytics
                        .topProfitProducts
                        .length
                    }{" "}
                    products
                  </span>
                </div>

                <div className="mt-4 divide-y">
                  {data.profitAnalytics.topProfitProducts.map(
                    (product, index) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between gap-4 py-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">
                            {index + 1}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-black">
                              {product.name}
                            </p>

                            <p className="mt-1 text-[10px] text-zinc-400">
                              {
                                product.coveredQuantity
                              }{" "}
                              pcs · Revenue{" "}
                              {money(
                                product.coveredRevenue,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-black ${
                            product.profit >= 0
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}>
                            {money(
                              product.profit,
                            )}
                          </p>

                          <p className="mt-1 text-[9px] font-bold text-zinc-400">
                            {
                              product.marginPercent
                            }% margin
                          </p>
                        </div>
                      </div>
                    ),
                  )}

                  {data.profitAnalytics
                    .topProfitProducts
                    .length === 0 && (
                    <div className="py-10 text-center">
                      <p className="text-sm font-black text-zinc-500">
                        No profit data yet
                      </p>

                      <p className="mt-1 text-xs text-zinc-400">
                        New delivered orders with cost snapshots will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">
                      Low Margin Products
                    </h2>

                    <p className="mt-1 text-xs text-zinc-400">
                      Snapshot-covered products below 20% gross margin.
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-700">
                    {
                      data.profitAnalytics
                        .lowMarginProducts
                        .length
                    }{" "}
                    alerts
                  </span>
                </div>

                <div className="mt-4 divide-y">
                  {data.profitAnalytics.lowMarginProducts.map(
                    (product) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between gap-4 py-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black">
                            {product.name}
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-400">
                            Revenue{" "}
                            {money(
                              product.coveredRevenue,
                            )}{" "}
                            · COGS{" "}
                            {money(
                              product.cogs,
                            )}
                          </p>
                        </div>

                        <div
                          className={`shrink-0 rounded-xl px-3 py-2 text-right ${
                            product.marginPercent < 0
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <p className="text-sm font-black">
                            {
                              product.marginPercent
                            }%
                          </p>

                          <p className="mt-0.5 text-[9px] font-bold">
                            {money(
                              product.profit,
                            )}{" "}
                            profit
                          </p>
                        </div>
                      </div>
                    ),
                  )}

                  {data.profitAnalytics
                    .lowMarginProducts
                    .length === 0 && (
                    <div className="py-10 text-center">
                      <p className="text-sm font-black text-emerald-700">
                        No low-margin alerts
                      </p>

                      <p className="mt-1 text-xs text-zinc-400">
                        Only snapshot-covered delivered products are evaluated.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="mt-8 overflow-hidden rounded-[28px] bg-zinc-950 p-5 text-white shadow-xl sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
                    Purchasing Intelligence
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Purchase & Supplier Analytics
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    Supplier spend, incoming stock value, received purchases and cost movement.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Active POs
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      data.purchaseAnalytics
                        .summary
                        .purchaseOrders
                    }
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Purchase Spend
                  </p>

                  <p className="mt-2 text-2xl font-black text-emerald-400">
                    {money(
                      data.purchaseAnalytics
                        .summary
                        .purchaseSpend,
                    )}
                  </p>

                  <p className="mt-2 text-[10px] text-zinc-500">
                    Non-cancelled PO value
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Received
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {money(
                      data.purchaseAnalytics
                        .summary
                        .receivedPurchaseValue,
                    )}
                  </p>

                  <p className="mt-2 text-[10px] text-zinc-500">
                    {
                      data.purchaseAnalytics
                        .summary
                        .receivedPurchasePieces
                    }{" "}
                    pcs received
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70">
                    Incoming
                  </p>

                  <p className="mt-2 text-2xl font-black text-amber-300">
                    {money(
                      data.purchaseAnalytics
                        .summary
                        .pendingIncomingValue,
                    )}
                  </p>

                  <p className="mt-2 text-[10px] text-zinc-500">
                    {
                      data.purchaseAnalytics
                        .summary
                        .pendingIncomingPieces
                    }{" "}
                    pcs on the way
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.07] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300/70">
                    Draft Purchase
                  </p>

                  <p className="mt-2 text-2xl font-black text-violet-300">
                    {money(
                      data.purchaseAnalytics
                        .summary
                        .draftPurchaseValue,
                    )}
                  </p>

                  <p className="mt-2 text-[10px] text-zinc-500">
                    {
                      data.purchaseAnalytics
                        .summary
                        .draftPurchasePieces
                    }{" "}
                    pcs planned
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black">
                      Purchase Trend
                    </h3>

                    <p className="mt-1 text-[10px] text-zinc-500">
                      PO committed value by creation date.
                    </p>
                  </div>

                  <p className="text-[10px] font-bold text-zinc-500">
                    {
                      data.purchaseAnalytics
                        .summary
                        .cancelledPurchaseOrders
                    }{" "}
                    cancelled excluded
                  </p>
                </div>

                <div className="mt-5 flex h-40 items-end gap-1 overflow-x-auto border-b border-white/10 pb-1">
                  {data.purchaseAnalytics.purchaseTrend.map(
                    (item) => {
                      const height =
                        maxPurchaseTrend > 0
                          ? Math.max(
                              3,
                              Math.round(
                                (item.committedValue /
                                  maxPurchaseTrend) *
                                  130,
                              ),
                            )
                          : 3;

                      return (
                        <div
                          key={item.date}
                          className="flex min-w-3 flex-1 flex-col items-center justify-end"
                          title={`${item.date} · ${money(
                            item.committedValue,
                          )}`}
                        >
                          <div
                            className={`w-full min-w-2 rounded-t ${
                              item.committedValue >
                              0
                                ? "bg-emerald-400"
                                : "bg-white/10"
                            }`}
                            style={{
                              height:
                                `${height}px`,
                            }}
                          />
                        </div>
                      );
                    },
                  )}
                </div>

                <div className="mt-3 flex justify-between text-[9px] font-bold text-zinc-600">
                  <span>
                    {
                      data.purchaseAnalytics
                        .purchaseTrend[0]
                        ?.date
                    }
                  </span>

                  <span>
                    {
                      data.purchaseAnalytics
                        .purchaseTrend[
                          data.purchaseAnalytics
                            .purchaseTrend
                            .length - 1
                        ]?.date
                    }
                  </span>
                </div>
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black">
                  Supplier Spend
                </h2>

                <p className="mt-1 text-xs text-zinc-400">
                  Purchase performance by supplier.
                </p>

                <div className="mt-4 divide-y">
                  {data.purchaseAnalytics.supplierSpend.map(
                    (supplier, index) => (
                      <div
                        key={
                          supplier.supplierId
                        }
                        className="py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">
                              {index + 1}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-black">
                                {
                                  supplier.supplierName
                                }
                              </p>

                              <p className="mt-1 text-[10px] text-zinc-400">
                                {
                                  supplier.purchaseOrders
                                }{" "}
                                POs ·{" "}
                                {
                                  supplier.receivedPieces
                                }{" "}
                                pcs received
                              </p>
                            </div>
                          </div>

                          <p className="shrink-0 text-sm font-black text-emerald-700">
                            {money(
                              supplier.receivedValue,
                            )}
                          </p>
                        </div>

                        {(supplier.incomingValue >
                          0 ||
                          supplier.draftValue >
                            0) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {supplier.incomingValue >
                              0 && (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black text-amber-700">
                                Incoming{" "}
                                {money(
                                  supplier.incomingValue,
                                )}
                              </span>
                            )}

                            {supplier.draftValue >
                              0 && (
                              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black text-violet-700">
                                Draft{" "}
                                {money(
                                  supplier.draftValue,
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ),
                  )}

                  {data.purchaseAnalytics
                    .supplierSpend
                    .length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      No supplier purchases in this period.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black">
                  Top Purchased Products
                </h2>

                <p className="mt-1 text-xs text-zinc-400">
                  Based on received purchase quantities.
                </p>

                <div className="mt-4 divide-y">
                  {data.purchaseAnalytics.topPurchasedProducts.map(
                    (product, index) => (
                      <div
                        key={`${product.name}-${index}`}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-black">
                            {index + 1}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-black">
                              {
                                product.name
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-zinc-400">
                              {
                                product.quantity
                              }{" "}
                              pcs received
                            </p>
                          </div>
                        </div>

                        <p className="shrink-0 text-sm font-black">
                          {money(
                            product.purchaseValue,
                          )}
                        </p>
                      </div>
                    ),
                  )}

                  {data.purchaseAnalytics
                    .topPurchasedProducts
                    .length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      No received purchases in this period.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">
                    Supplier Cost Alerts
                  </h2>

                  <p className="mt-1 text-xs text-zinc-400">
                    Current quoted cost compared with last received purchase cost.
                  </p>
                </div>

                <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[10px] font-black">
                  {
                    data.purchaseAnalytics
                      .costAlerts.length
                  }{" "}
                  changes
                </span>
              </div>

              <div className="mt-4 divide-y">
                {data.purchaseAnalytics.costAlerts.map(
                  (alert) => (
                    <div
                      key={`${alert.supplierId}-${alert.variantId}`}
                      className="flex flex-wrap items-center justify-between gap-4 py-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-black">
                            {
                              alert.productName
                            }
                          </p>

                          {alert.preferred && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-700">
                              Preferred
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-[10px] text-zinc-400">
                          {
                            alert.colorName
                          }{" "}
                          ·{" "}
                          {
                            alert.sizeName
                          }{" "}
                          ·{" "}
                          {
                            alert.supplierName
                          }
                        </p>

                        <p className="mt-2 text-[10px] font-bold text-zinc-500">
                          Last{" "}
                          {money(
                            alert.lastPurchaseCost,
                          )}{" "}
                          → Quote{" "}
                          {money(
                            alert.quotedCost,
                          )}
                        </p>
                      </div>

                      <div
                        className={`rounded-2xl px-3 py-2 text-right ${
                          alert.direction ===
                          "INCREASE"
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <p className="text-xs font-black">
                          {alert.direction ===
                          "INCREASE"
                            ? "▲"
                            : "▼"}{" "}
                          {Math.abs(
                            alert.percentChange,
                          )}
                          %
                        </p>

                        <p className="mt-0.5 text-[9px] font-bold">
                          {alert.direction ===
                          "INCREASE"
                            ? "+"
                            : "-"}
                          {money(
                            Math.abs(
                              alert.difference,
                            ),
                          )}
                        </p>
                      </div>
                    </div>
                  ),
                )}

                {data.purchaseAnalytics
                  .costAlerts.length ===
                  0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm font-black text-emerald-700">
                      Costs are stable
                    </p>

                    <p className="mt-1 text-xs text-zinc-400">
                      No supplier quote changes against the last purchase cost.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-black uppercase tracking-wider text-amber-800">
                Reporting Notes
              </p>

              <p className="mt-3 text-xs leading-6 text-amber-800">
                • {data.notes.salesRule}
                <br />
                • {data.notes.trendRule}
                <br />
                • {data.notes.profitRule}
                <br />
                • {data.notes.purchaseRule}
                <br />
                • {data.notes.purchaseTrendRule}
                <br />
                • {data.notes.costAlertRule}
              </p>
            </section>
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

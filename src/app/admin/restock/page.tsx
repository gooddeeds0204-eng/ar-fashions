"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type StockHealth =
  | "HEALTHY"
  | "LOW"
  | "CRITICAL"
  | "OUT_OF_STOCK";

type InventoryVariant = {
  id: string;
  productId: string;

  product: {
    id: string;
    name: string;
    sku: string | null;
    status: string;
    gender: string;
  };

  color: {
    id: string;
    name: string;
    family: string | null;
    hexCode: string | null;
  };

  size: {
    id: string;
    name: string;
    category: string | null;
    sizeType: string | null;
    inches: string | null;
  };

  sku: string | null;

  stock: number;
  reservedStock: number;
  availableStock: number;

  recentSalesQty: number;

  stockHealth:
    StockHealth;

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

  preferredSupplierId:
    string | null;

  preferredSupplier: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;

  supplierCosts: Array<{
    id: string;
    supplierId: string;
    supplierCost: number;
    lastPurchaseCost:
      number | null;
    lastPurchasedAt:
      string | null;
    isActive: boolean;

    supplier: {
      id: string;
      name: string;
      isActive: boolean;
    };
  }>;

  costPrice:
    number | null;

  retailPrice:
    number | null;

  resellerPrice:
    number | null;
};

type InventoryResponse = {
  variants:
    InventoryVariant[];

  settings: {
    lowStockThreshold:
      number;

    criticalStockThreshold:
      number;
  };

  summary?: {
    totalDraftStock?:
      number;

    totalIncomingStock?:
      number;

    incomingProtectedVariants?:
      number;
  };
};

type QueueFilter =
  | "ALL"
  | "OUT_OF_STOCK"
  | "CRITICAL"
  | "LOW";

type Supplier = {
  id: string;
  name: string;
  isActive: boolean;

  leadTimeDays: number;
  minimumOrderQty: number;
  minimumOrderValue: number;

  completedDeliveryCount: number;
  etaTrackedDeliveryCount: number;
  onTimeDeliveryRate: number | null;
  lateDeliveryCount: number;
  averageDelayDays: number;
  averageActualLeadTimeDays: number | null;
  reliabilityLevel: string;
};

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(value || 0);
}

function shortDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Date(
    value,
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function healthLabel(
  health: StockHealth,
) {
  if (
    health ===
    "OUT_OF_STOCK"
  ) {
    return "Out of Stock";
  }

  if (
    health === "CRITICAL"
  ) {
    return "Critical";
  }

  if (
    health === "LOW"
  ) {
    return "Low Stock";
  }

  return "Healthy";
}

function healthClass(
  health: StockHealth,
) {
  if (
    health ===
    "OUT_OF_STOCK"
  ) {
    return "bg-red-50 text-red-700";
  }

  if (
    health === "CRITICAL"
  ) {
    return "bg-rose-50 text-rose-700";
  }

  if (
    health === "LOW"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

function supplierReliabilityLabel(
  value: string,
) {
  if (value === "EXCELLENT") {
    return "Excellent";
  }

  if (value === "RELIABLE") {
    return "Reliable";
  }

  if (value === "WATCH") {
    return "Watch";
  }

  if (
    value ===
    "NEEDS_ATTENTION"
  ) {
    return "Needs Attention";
  }

  return "Building History";
}

function supplierReliabilityClass(
  value: string,
) {
  if (
    value === "EXCELLENT" ||
    value === "RELIABLE"
  ) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (value === "WATCH") {
    return "bg-amber-100 text-amber-800";
  }

  if (
    value ===
    "NEEDS_ATTENTION"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function RestockQueuePage() {
  const router =
    useRouter();

  const [
    variants,
    setVariants,
  ] =
    useState<
      InventoryVariant[]
    >([]);

  const [
    settings,
    setSettings,
  ] = useState({
    lowStockThreshold: 5,
    criticalStockThreshold: 2,
  });

  const [
    protectionSummary,
    setProtectionSummary,
  ] = useState({
    totalDraftStock: 0,
    totalIncomingStock: 0,
    incomingProtectedVariants: 0,
  });

  const [
    filter,
    setFilter,
  ] =
    useState<QueueFilter>(
      "ALL",
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    suppliers,
    setSuppliers,
  ] = useState<Supplier[]>([]);

  const [
    supplierId,
    setSupplierId,
  ] = useState("");

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    creatingPO,
    setCreatingPO,
  ] = useState(false);

  const [
    supplierCostDrafts,
    setSupplierCostDrafts,
  ] = useState<
    Record<string, string>
  >({});

  const [
    savingSupplierCostKey,
    setSavingSupplierCostKey,
  ] = useState<
    string | null
  >(null);

  async function loadQueue(
    refresh = false,
  ) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setMessage("");

      const response =
        await fetch(
          "/api/inventory",
          {
            cache: "no-store",
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

      const data =
        (await response.json()) as
          Partial<InventoryResponse> & {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to load restock queue.",
        );
      }

      setVariants(
        Array.isArray(
          data.variants,
        )
          ? data.variants
          : [],
      );

      if (data.settings) {
        setSettings(
          data.settings,
        );
      }

      if (data.summary) {
        setProtectionSummary({
          totalDraftStock:
            Number(
              data.summary
                .totalDraftStock ??
                0,
            ),

          totalIncomingStock:
            Number(
              data.summary
                .totalIncomingStock ??
                0,
            ),

          incomingProtectedVariants:
            Number(
              data.summary
                .incomingProtectedVariants ??
                0,
            ),
        });
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load restock queue.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadQueue();

    async function loadSuppliers() {
      try {
        const response =
          await fetch(
            "/api/admin/suppliers",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          return;
        }

        const active =
          Array.isArray(
            data.suppliers,
          )
            ? data.suppliers.filter(
                (
                  supplier: Supplier,
                ) =>
                  supplier.isActive,
              )
            : [];

        setSuppliers(
          active,
        );

        if (
          active.length === 1
        ) {
          setSupplierId(
            active[0].id,
          );
        }
      } catch {
        // Supplier load failure is shown during PO creation.
      }
    }

    void loadSuppliers();
  }, []);

  const queue =
    useMemo(
      () =>
        variants
          .filter(
            (item) =>
              item.recommendedReorderQty >
              0,
          )
          .sort(
            (a, b) => {
              const priority = {
                OUT_OF_STOCK:
                  0,
                CRITICAL: 1,
                LOW: 2,
                HEALTHY: 3,
              };

              const severity =
                priority[
                  a.stockHealth
                ] -
                priority[
                  b.stockHealth
                ];

              if (
                severity !== 0
              ) {
                return severity;
              }

              return (
                a.availableStock -
                b.availableStock
              );
            },
          ),
      [variants],
    );

  const visibleQueue =
    useMemo(() => {
      if (
        filter === "ALL"
      ) {
        return queue;
      }

      return queue.filter(
        (item) =>
          item.stockHealth ===
          filter,
      );
    }, [
      queue,
      filter,
    ]);

  const groups =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            productId: string;
            productName: string;
            productSku:
              string | null;
            items:
              InventoryVariant[];
          }
        >();

      for (
        const item of visibleQueue
      ) {
        const current =
          map.get(
            item.productId,
          );

        if (current) {
          current.items.push(
            item,
          );
        } else {
          map.set(
            item.productId,
            {
              productId:
                item.productId,

              productName:
                item.product.name,

              productSku:
                item.product.sku,

              items: [item],
            },
          );
        }
      }

      return Array.from(
        map.values(),
      );
    }, [visibleQueue]);

  useEffect(() => {
    setSelectedIds(
      new Set(
        queue.map(
          (item) =>
            item.id,
        ),
      ),
    );
  }, [queue.length]);

  function selectedSupplierCostFor(
    item: InventoryVariant,
  ) {
    if (!supplierId) {
      return null;
    }

    return (
      item.supplierCosts.find(
        (cost) =>
          cost.supplierId ===
            supplierId &&
          cost.isActive &&
          cost.supplier.isActive,
      ) ?? null
    );
  }

  function purchaseCostFor(
    item: InventoryVariant,
  ) {
    return (
      selectedSupplierCostFor(
        item,
      )?.supplierCost ??
      item.costPrice
    );
  }

  function activeSupplierCostsFor(
    item: InventoryVariant,
  ) {
    return item.supplierCosts.filter(
      (cost) =>
        cost.isActive &&
        cost.supplier.isActive,
    );
  }

  function cheapestSupplierCostFor(
    item: InventoryVariant,
  ) {
    const active =
      activeSupplierCostsFor(
        item,
      );

    if (active.length === 0) {
      return null;
    }

    return active.reduce(
      (best, current) =>
        current.supplierCost <
        best.supplierCost
          ? current
          : best,
    );
  }

  function preferredSupplierCostFor(
    item: InventoryVariant,
  ) {
    if (
      !item.preferredSupplierId
    ) {
      return null;
    }

    return (
      activeSupplierCostsFor(
        item,
      ).find(
        (cost) =>
          cost.supplierId ===
          item.preferredSupplierId,
      ) ?? null
    );
  }

  function stockCoverDaysFor(
    item: InventoryVariant,
  ) {
    if (
      item.availableStock <= 0
    ) {
      return 0;
    }

    if (
      item.recentSalesQty <= 0
    ) {
      return null;
    }

    const dailySales =
      item.recentSalesQty /
      30;

    if (dailySales <= 0) {
      return null;
    }

    return Math.round(
      (item.availableStock /
        dailySales) *
        10,
    ) / 10;
  }

  function reorderUrgencyFor(
    item: InventoryVariant,
    leadTimeDays: number,
  ) {
    const stockCoverDays =
      stockCoverDaysFor(
        item,
      );

    if (
      item.stockHealth ===
        "OUT_OF_STOCK" ||
      stockCoverDays === 0
    ) {
      return {
        code:
          "ORDER_NOW" as const,
        label:
          "Order Now",
        stockCoverDays,
      };
    }

    if (
      stockCoverDays !== null
    ) {
      if (
        stockCoverDays <=
        leadTimeDays
      ) {
        return {
          code:
            "ORDER_NOW" as const,
          label:
            "Order Now",
          stockCoverDays,
        };
      }

      const soonWindow =
        leadTimeDays +
        Math.max(
          3,
          Math.ceil(
            leadTimeDays *
              0.5,
          ),
        );

      if (
        stockCoverDays <=
        soonWindow
      ) {
        return {
          code:
            "ORDER_SOON" as const,
          label:
            "Order Soon",
          stockCoverDays,
        };
      }

      return {
        code:
          "CAN_WAIT" as const,
        label:
          "Can Wait",
        stockCoverDays,
      };
    }

    if (
      item.stockHealth ===
      "CRITICAL"
    ) {
      return {
        code:
          "ORDER_SOON" as const,
        label:
          "Order Soon",
        stockCoverDays,
      };
    }

    return {
      code:
        "CAN_WAIT" as const,
      label:
        "Can Wait",
      stockCoverDays,
    };
  }

  function supplierCostDraftKey(
    variantId: string,
  ) {
    return `${supplierId}:${variantId}`;
  }

  function supplierCostInputFor(
    item: InventoryVariant,
  ) {
    if (!supplierId) {
      return "";
    }

    const key =
      supplierCostDraftKey(
        item.id,
      );

    if (
      Object.prototype.hasOwnProperty.call(
        supplierCostDrafts,
        key,
      )
    ) {
      return supplierCostDrafts[
        key
      ];
    }

    const mapped =
      selectedSupplierCostFor(
        item,
      );

    if (mapped) {
      return String(
        mapped.supplierCost,
      );
    }

    return item.costPrice ===
      null
      ? ""
      : String(
          item.costPrice,
        );
  }

  async function saveSupplierCost(
    item: InventoryVariant,
  ) {
    if (!supplierId) {
      setMessage(
        "Select a supplier first.",
      );
      return;
    }

    const value =
      supplierCostInputFor(
        item,
      ).trim();

    const parsed =
      Number(value);

    if (
      !value ||
      !Number.isFinite(
        parsed,
      ) ||
      parsed < 0
    ) {
      setMessage(
        "Enter a valid supplier cost.",
      );
      return;
    }

    const key =
      supplierCostDraftKey(
        item.id,
      );

    try {
      setSavingSupplierCostKey(
        key,
      );
      setMessage("");

      const response =
        await fetch(
          "/api/admin/variant-supplier-costs",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                action:
                  "UPSERT_COST",

                variantId:
                  item.id,

                supplierId,

                supplierCost:
                  parsed,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to save supplier cost.",
        );
      }

      setMessage(
        "Supplier cost saved successfully.",
      );

      await loadQueue(
        true,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save supplier cost.",
      );
    } finally {
      setSavingSupplierCostKey(
        null,
      );
    }
  }

  async function setPreferredSupplier(
    item: InventoryVariant,
  ) {
    if (!supplierId) {
      setMessage(
        "Select a supplier first.",
      );
      return;
    }

    const key =
      supplierCostDraftKey(
        item.id,
      );

    try {
      setSavingSupplierCostKey(
        key,
      );
      setMessage("");

      const response =
        await fetch(
          "/api/admin/variant-supplier-costs",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                action:
                  "SET_PREFERRED",

                variantId:
                  item.id,

                supplierId,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to set preferred supplier.",
        );
      }

      setMessage(
        "Preferred supplier updated successfully.",
      );

      await loadQueue(
        true,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to set preferred supplier.",
      );
    } finally {
      setSavingSupplierCostKey(
        null,
      );
    }
  }

  const selectedQueue =
    queue.filter(
      (item) =>
        selectedIds.has(
          item.id,
        ),
    );

  const selectedPieces =
    selectedQueue.reduce(
      (total, item) =>
        total +
        item.recommendedReorderQty,
      0,
    );

  const selectedCost =
    selectedQueue.reduce(
      (total, item) => {
        const cost =
          purchaseCostFor(
            item,
          );

        return (
          total +
          (cost === null
            ? 0
            : cost *
              item.recommendedReorderQty)
        );
      },
      0,
    );

  const selectedSupplier =
    suppliers.find(
      (supplier) =>
        supplier.id ===
        supplierId,
    ) ?? null;

  const selectedMeetsMOQ =
    selectedSupplier
      ? selectedPieces >=
        selectedSupplier.minimumOrderQty
      : false;

  const selectedMeetsMinimumValue =
    selectedSupplier
      ? selectedCost >=
        selectedSupplier.minimumOrderValue
      : false;

  const selectedTermsMet =
    Boolean(
      selectedSupplier &&
      selectedMeetsMOQ &&
      selectedMeetsMinimumValue,
    );

  const selectedQtyShortfall =
    selectedSupplier
      ? Math.max(
          0,
          selectedSupplier.minimumOrderQty -
            selectedPieces,
        )
      : 0;

  const selectedValueShortfall =
    selectedSupplier
      ? Math.max(
          0,
          selectedSupplier.minimumOrderValue -
            selectedCost,
        )
      : 0;

  const selectedUrgencySummary =
    selectedQueue.reduce(
      (
        summary,
        item,
      ) => {
        const urgency =
          reorderUrgencyFor(
            item,
            selectedSupplier
              ?.leadTimeDays ??
              7,
          );

        if (
          urgency.code ===
          "ORDER_NOW"
        ) {
          summary.orderNow +=
            1;
        } else if (
          urgency.code ===
          "ORDER_SOON"
        ) {
          summary.orderSoon +=
            1;
        } else {
          summary.canWait +=
            1;
        }

        return summary;
      },
      {
        orderNow: 0,
        orderSoon: 0,
        canWait: 0,
      },
    );

  const supplierBatchOptions =
    suppliers
      .flatMap(
        (supplier) => {
          if (
            selectedQueue.length ===
            0
          ) {
            return [];
          }

          let totalCost = 0;

          for (
            const item of
            selectedQueue
          ) {
            const quote =
              item.supplierCosts.find(
                (cost) =>
                  cost.supplierId ===
                    supplier.id &&
                  cost.isActive &&
                  cost.supplier
                    .isActive,
              );

            if (!quote) {
              return [];
            }

            totalCost +=
              quote.supplierCost *
              item.recommendedReorderQty;
          }

          const meetsMOQ =
            selectedPieces >=
            supplier.minimumOrderQty;

          const meetsMinimumValue =
            totalCost >=
            supplier.minimumOrderValue;

          return [
            {
              supplierId:
                supplier.id,

              supplierName:
                supplier.name,

              totalCost,

              leadTimeDays:
                supplier.leadTimeDays,

              minimumOrderQty:
                supplier.minimumOrderQty,

              minimumOrderValue:
                supplier.minimumOrderValue,

              reliabilityLevel:
                supplier.reliabilityLevel,

              onTimeDeliveryRate:
                supplier.onTimeDeliveryRate,

              etaTrackedDeliveryCount:
                supplier.etaTrackedDeliveryCount,

              averageActualLeadTimeDays:
                supplier.averageActualLeadTimeDays,

              lateDeliveryCount:
                supplier.lateDeliveryCount,

              meetsMOQ,

              meetsMinimumValue,

              termsMet:
                meetsMOQ &&
                meetsMinimumValue,
            },
          ];
        },
      )
      .sort(
        (a, b) =>
          Number(
            b.termsMet,
          ) -
            Number(
              a.termsMet,
            ) ||
          a.totalCost -
            b.totalCost,
      );

  const bestBatchSupplier =
    supplierBatchOptions[0] ??
    null;

  const selectedBatchSupplier =
    supplierBatchOptions.find(
      (item) =>
        item.supplierId ===
        supplierId,
    ) ?? null;

  const batchPotentialSavings =
    bestBatchSupplier &&
    selectedBatchSupplier
      ? Math.max(
          0,
          selectedBatchSupplier.totalCost -
            bestBatchSupplier.totalCost,
        )
      : 0;

  const selectedVariantsWithQuotes =
    supplierId
      ? selectedQueue.filter(
          (item) =>
            selectedSupplierCostFor(
              item,
            ) !== null,
        ).length
      : 0;

  const selectedAboveBestCount =
    supplierId
      ? selectedQueue.filter(
          (item) => {
            const selected =
              selectedSupplierCostFor(
                item,
              );

            const best =
              cheapestSupplierCostFor(
                item,
              );

            return Boolean(
              selected &&
                best &&
                selected.supplierCost >
                  best.supplierCost,
            );
          },
        ).length
      : 0;

  async function createDraftPO() {
    if (!supplierId) {
      setMessage(
        "Select an active supplier first.",
      );
      return;
    }

    if (
      selectedQueue.length ===
      0
    ) {
      setMessage(
        "Select at least one restock item.",
      );
      return;
    }

    if (
      selectedSupplier &&
      !selectedMeetsMOQ
    ) {
      setMessage(
        `${selectedSupplier.name} requires at least ${selectedSupplier.minimumOrderQty} pcs. Add ${selectedQtyShortfall} more pcs before creating this PO.`,
      );
      return;
    }

    if (
      selectedSupplier &&
      !selectedMeetsMinimumValue
    ) {
      setMessage(
        `${selectedSupplier.name} requires a minimum PO value of ${money(
          selectedSupplier.minimumOrderValue,
        )}. Add ${money(
          selectedValueShortfall,
        )} more before creating this PO.`,
      );
      return;
    }

    if (
      selectedQueue.some(
        (item) =>
          purchaseCostFor(
            item,
          ) === null,
      )
    ) {
      setMessage(
        "Every selected item needs a supplier cost or fallback cost price before creating a purchase order.",
      );
      return;
    }

    try {
      setCreatingPO(
        true,
      );

      setMessage("");

      const response =
        await fetch(
          "/api/admin/purchase-orders",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                supplierId,

                items:
                  selectedQueue.map(
                    (item) => ({
                      variantId:
                        item.id,

                      quantity:
                        item.recommendedReorderQty,
                    }),
                  ),
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to create purchase order.",
        );
      }

      router.push(
        "/admin/purchase-orders",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to create purchase order.",
      );
    } finally {
      setCreatingPO(
        false,
      );
    }
  }

  const totalRequiredPieces =
    queue.reduce(
      (total, item) =>
        total +
        item.recommendedReorderQty,
      0,
    );

  const estimatedPurchaseCost =
    queue.reduce(
      (total, item) => {
        const cost =
          purchaseCostFor(
            item,
          );

        return (
          total +
          (cost === null
            ? 0
            : cost *
              item.recommendedReorderQty)
        );
      },
      0,
    );

  const pricedVariants =
    queue.filter(
      (item) =>
        purchaseCostFor(
          item,
        ) !== null,
    ).length;

  const missingCostVariants =
    queue.length -
    pricedVariants;

  const criticalCount =
    queue.filter(
      (item) =>
        item.stockHealth ===
        "CRITICAL",
    ).length;

  const outCount =
    queue.filter(
      (item) =>
        item.stockHealth ===
        "OUT_OF_STOCK",
    ).length;

  const lowCount =
    queue.filter(
      (item) =>
        item.stockHealth ===
        "LOW",
    ).length;

  async function copyPlan() {
    if (
      queue.length === 0
    ) {
      setMessage(
        "Restock queue is empty.",
      );
      return;
    }

    const lines = [
      "AS FASHIONS - RESTOCK PLAN",
      "",
      `Variants: ${queue.length}`,
      `Required Pieces: ${totalRequiredPieces}`,
      `Estimated Cost: ${
        pricedVariants > 0
          ? money(
              estimatedPurchaseCost,
            )
          : "Not available"
      }`,
      "",
      ...queue.map(
        (item) =>
          `${item.product.name} | ${item.color.name} | ${item.size.name} | Add ${item.recommendedReorderQty} pcs`,
      ),
    ];

    try {
      await navigator.clipboard.writeText(
        lines.join("\n"),
      );

      setMessage(
        "Purchase plan copied successfully.",
      );
    } catch {
      setMessage(
        "Could not copy purchase plan.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin",
                )
              }
              className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
            >
              ← Dashboard
            </button>

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              AS FASHIONS
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Restock Queue
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Product-wise purchase planning from live low-stock alerts.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={
                copyPlan
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black"
            >
              Copy Plan
            </button>

            <button
              type="button"
              onClick={() =>
                loadQueue(
                  true,
                )
              }
              disabled={
                refreshing
              }
              className="rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <SummaryCard
            label="Variants To Restock"
            value={
              queue.length
            }
          />

          <SummaryCard
            label="Required Pieces"
            value={
              totalRequiredPieces
            }
          />

          <SummaryCard
            label="Estimated Cost"
            value={
              pricedVariants >
              0
                ? money(
                    estimatedPurchaseCost,
                  )
                : "—"
            }
          />

          <SummaryCard
            label="Products"
            value={
              new Set(
                queue.map(
                  (item) =>
                    item.productId,
                ),
              ).size
            }
          />

          <SummaryCard
            label="Incoming / Planned"
            value={
              `${
                protectionSummary.totalIncomingStock +
                protectionSummary.totalDraftStock
              } pcs`
            }
          />
        </section>

        {(
          protectionSummary.totalDraftStock >
            0 ||
          protectionSummary.totalIncomingStock >
            0
        ) && (
          <section className="mt-4 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-700">
                  Incoming Stock Protection
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Open purchase orders are already deducted from new reorder suggestions to prevent duplicate buying.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
                <MiniStat
                  label="Draft"
                  value={`${protectionSummary.totalDraftStock}`}
                />

                <MiniStat
                  label="Incoming"
                  value={`${protectionSummary.totalIncomingStock}`}
                />

                <MiniStat
                  label="Protected"
                  value={`${protectionSummary.incomingProtectedVariants}`}
                />
              </div>
            </div>
          </section>
        )}

        <section className="mt-4 overflow-hidden rounded-3xl border border-black/[0.05] bg-[#06261c] text-white shadow-sm">
          <div className="grid grid-cols-3 gap-px bg-white/10">
            <div className="bg-[#06261c] p-4">
              <p className="text-[8px] font-black uppercase tracking-wider text-red-300">
                Out
              </p>

              <p className="mt-1 text-2xl font-black">
                {outCount}
              </p>
            </div>

            <div className="bg-[#06261c] p-4">
              <p className="text-[8px] font-black uppercase tracking-wider text-rose-300">
                Critical
              </p>

              <p className="mt-1 text-2xl font-black">
                {
                  criticalCount
                }
              </p>
            </div>

            <div className="bg-[#06261c] p-4">
              <p className="text-[8px] font-black uppercase tracking-wider text-amber-300">
                Low
              </p>

              <p className="mt-1 text-2xl font-black">
                {lowCount}
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-3 text-[9px] text-white/50">
            Rules · Low ≤{" "}
            {
              settings.lowStockThreshold
            }{" "}
            · Critical ≤{" "}
            {
              settings.criticalStockThreshold
            }
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
            Create Purchase Order
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={
                supplierId
              }
              onChange={(event) =>
                setSupplierId(
                  event.target.value,
                )
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none"
            >
              <option value="">
                Select Supplier
              </option>

              {suppliers.map(
                (supplier) => (
                  <option
                    key={
                      supplier.id
                    }
                    value={
                      supplier.id
                    }
                  >
                    {
                      supplier.name
                    }
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={
                createDraftPO
              }
              disabled={
                creatingPO ||
                selectedQueue.length ===
                  0 ||
                !supplierId ||
                Boolean(
                  selectedSupplier &&
                    !selectedTermsMet,
                )
              }
              className="rounded-2xl bg-[#06261c] px-5 py-3 text-xs font-black uppercase tracking-[0.08em] text-white disabled:opacity-50"
            >
              {creatingPO
                ? "Creating..."
                : "Create Draft PO"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniStat
              label="Selected"
              value={`${selectedQueue.length}`}
            />

            <MiniStat
              label="Pieces"
              value={`${selectedPieces}`}
            />

            <MiniStat
              label="Cost"
              value={money(
                selectedCost,
              )}
            />
          </div>

          {selectedSupplier &&
          selectedQueue.length >
            0 ? (
            <div
              className={`mt-4 rounded-2xl border p-4 ${
                selectedTermsMet
                  ? "border-emerald-100 bg-emerald-50/60"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Supplier Terms & Reorder Urgency
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {
                      selectedSupplier.name
                    }
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-[8px] font-black uppercase ${
                    selectedTermsMet
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {selectedTermsMet
                    ? "Terms Met"
                    : "Terms Not Met"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniStat
                  label="Lead Time"
                  value={`${selectedSupplier.leadTimeDays} days`}
                />

                <MiniStat
                  label="MOQ"
                  value={`${selectedSupplier.minimumOrderQty} pcs`}
                />

                <MiniStat
                  label="Min PO"
                  value={money(
                    selectedSupplier.minimumOrderValue,
                  )}
                />
              </div>

              <div className="mt-3 rounded-xl border border-white/70 bg-white/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Delivery Reliability
                  </p>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[7px] font-black uppercase ${supplierReliabilityClass(
                      selectedSupplier.reliabilityLevel,
                    )}`}
                  >
                    {supplierReliabilityLabel(
                      selectedSupplier.reliabilityLevel,
                    )}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <MiniStat
                    label="On-Time"
                    value={
                      selectedSupplier.onTimeDeliveryRate ===
                      null
                        ? "No data"
                        : `${selectedSupplier.onTimeDeliveryRate}%`
                    }
                  />

                  <MiniStat
                    label="ETA Samples"
                    value={`${selectedSupplier.etaTrackedDeliveryCount}`}
                  />

                  <MiniStat
                    label="Actual Lead"
                    value={
                      selectedSupplier.averageActualLeadTimeDays ===
                      null
                        ? "—"
                        : `${selectedSupplier.averageActualLeadTimeDays} days`
                    }
                  />
                </div>

                {selectedSupplier.etaTrackedDeliveryCount <
                2 ? (
                  <p className="mt-2 text-[8px] font-semibold leading-4 text-slate-500">
                    Reliability history is still building. Price ranking remains unchanged until more delivery data is available.
                  </p>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniStat
                  label="Order Now"
                  value={`${selectedUrgencySummary.orderNow}`}
                />

                <MiniStat
                  label="Order Soon"
                  value={`${selectedUrgencySummary.orderSoon}`}
                />

                <MiniStat
                  label="Can Wait"
                  value={`${selectedUrgencySummary.canWait}`}
                />
              </div>

              {!selectedMeetsMOQ ? (
                <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[9px] font-black text-amber-800">
                  MOQ short by{" "}
                  {
                    selectedQtyShortfall
                  }{" "}
                  pcs. Selected batch has{" "}
                  {
                    selectedPieces
                  }{" "}
                  pcs.
                </p>
              ) : null}

              {!selectedMeetsMinimumValue ? (
                <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[9px] font-black text-amber-800">
                  Minimum PO value short by{" "}
                  {money(
                    selectedValueShortfall,
                  )}
                  . Current batch value is{" "}
                  {money(
                    selectedCost,
                  )}
                  .
                </p>
              ) : null}

              {selectedTermsMet ? (
                <p className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-[9px] font-black text-emerald-800">
                  ✓ Supplier MOQ and minimum purchase value are satisfied.
                </p>
              ) : null}
            </div>
          ) : null}

          {selectedQueue.length >
            0 && (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Smart Supplier Recommendation
                  </p>

                  {bestBatchSupplier ? (
                    <>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {bestBatchSupplier
                          .termsMet
                          ? "Best eligible price: "
                          : "Lowest quote: "}
                        {
                          bestBatchSupplier
                            .supplierName
                        }
                      </p>

                      <p className="mt-1 text-[10px] font-semibold text-slate-500">
                        All{" "}
                        {
                          selectedQueue.length
                        }{" "}
                        selected variants ·{" "}
                        {money(
                          bestBatchSupplier
                            .totalCost,
                        )}{" "}
                        ·{" "}
                        {
                          bestBatchSupplier
                            .leadTimeDays
                        }{" "}
                        day lead time
                      </p>

                      <p className="mt-1 text-[9px] font-semibold text-slate-400">
                        MOQ{" "}
                        {
                          bestBatchSupplier
                            .minimumOrderQty
                        }{" "}
                        pcs · Min PO{" "}
                        {money(
                          bestBatchSupplier
                            .minimumOrderValue,
                        )}{" "}
                        ·{" "}
                        {bestBatchSupplier
                          .termsMet
                          ? "Terms met"
                          : "Terms not met"}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[7px] font-black uppercase ${supplierReliabilityClass(
                            bestBatchSupplier.reliabilityLevel,
                          )}`}
                        >
                          {supplierReliabilityLabel(
                            bestBatchSupplier.reliabilityLevel,
                          )}
                        </span>

                        <span className="text-[9px] font-semibold text-slate-500">
                          On-time{" "}
                          {bestBatchSupplier.onTimeDeliveryRate ===
                          null
                            ? "—"
                            : `${bestBatchSupplier.onTimeDeliveryRate}%`}
                          {" · "}
                          ETA samples{" "}
                          {
                            bestBatchSupplier.etaTrackedDeliveryCount
                          }
                          {" · "}
                          Actual lead{" "}
                          {bestBatchSupplier.averageActualLeadTimeDays ===
                          null
                            ? "—"
                            : `${bestBatchSupplier.averageActualLeadTimeDays} days`}
                        </span>
                      </div>

                      {bestBatchSupplier.etaTrackedDeliveryCount <
                      2 ? (
                        <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[8px] font-semibold leading-4 text-slate-500">
                          Delivery history is still building. Recommendation remains price-and-terms based; reliability is shown as decision context.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        More supplier quotes needed
                      </p>

                      <p className="mt-1 text-[10px] font-semibold text-slate-500">
                        No supplier currently has saved quotes for every selected variant.
                      </p>
                    </>
                  )}
                </div>

                {bestBatchSupplier &&
                supplierId !==
                  bestBatchSupplier.supplierId ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSupplierId(
                        bestBatchSupplier.supplierId,
                      )
                    }
                    className="rounded-xl bg-emerald-700 px-3 py-2 text-[9px] font-black text-white"
                  >
                    Use Best Supplier
                  </button>
                ) : null}
              </div>

              {supplierId ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniStat
                    label="Quote Coverage"
                    value={`${selectedVariantsWithQuotes}/${selectedQueue.length}`}
                  />

                  <MiniStat
                    label="Above Best"
                    value={`${selectedAboveBestCount}`}
                  />

                  <MiniStat
                    label="Possible Saving"
                    value={money(
                      batchPotentialSavings,
                    )}
                  />
                </div>
              ) : null}

              {supplierId &&
              bestBatchSupplier &&
              selectedBatchSupplier &&
              selectedBatchSupplier.supplierId ===
                bestBatchSupplier.supplierId &&
              selectedBatchSupplier.termsMet ? (
                <p className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-[9px] font-black text-emerald-800">
                  ✓ Selected supplier is the best eligible quote for this batch.
                </p>
              ) : null}

              {supplierId &&
              selectedBatchSupplier &&
              !selectedBatchSupplier.termsMet ? (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[9px] font-black text-amber-800">
                  This supplier quote cannot be used yet because its MOQ or minimum PO value is not satisfied.
                </p>
              ) : null}

              {supplierId &&
              batchPotentialSavings >
                0 ? (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[9px] font-black text-amber-800">
                  Selected supplier costs{" "}
                  {money(
                    batchPotentialSavings,
                  )}{" "}
                  more for this batch. Switch to{" "}
                  {
                    bestBatchSupplier
                      ?.supplierName
                  }{" "}
                  to save.
                </p>
              ) : null}

              {supplierId &&
              selectedVariantsWithQuotes <
                selectedQueue.length ? (
                <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-[9px] font-bold leading-5 text-sky-800">
                  Selected supplier has specific quotes for{" "}
                  {
                    selectedVariantsWithQuotes
                  }{" "}
                  of{" "}
                  {
                    selectedQueue.length
                  }{" "}
                  variants. Missing supplier quotes will still use the variant fallback cost during PO creation.
                </p>
              ) : null}
            </div>
          )}
        </section>

        {missingCostVariants >
        0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-black text-amber-800">
              Purchase cost is partial
            </p>

            <p className="mt-1 text-[10px] font-semibold text-amber-700">
              {
                missingCostVariants
              }{" "}
              variant
              {missingCostVariants ===
              1
                ? ""
                : "s"}{" "}
              do not have a cost price yet.
            </p>
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
            {message}
          </div>
        ) : null}

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto">
            {[
              [
                "ALL",
                `All ${queue.length}`,
              ],
              [
                "OUT_OF_STOCK",
                `Out ${outCount}`,
              ],
              [
                "CRITICAL",
                `Critical ${criticalCount}`,
              ],
              [
                "LOW",
                `Low ${lowCount}`,
              ],
            ].map(
              ([
                value,
                label,
              ]) => (
                <button
                  key={
                    value
                  }
                  type="button"
                  onClick={() =>
                    setFilter(
                      value as QueueFilter,
                    )
                  }
                  className={`whitespace-nowrap rounded-2xl px-4 py-3 text-[10px] font-black ${
                    filter ===
                    value
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </section>

        {loading ? (
          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-black text-slate-500">
            Loading restock plan...
          </div>
        ) : groups.length ===
          0 ? (
          <div className="mt-5 rounded-3xl border border-emerald-100 bg-white p-10 text-center shadow-sm">
            <p className="text-xl font-black text-emerald-700">
              Stock is healthy ✓
            </p>

            <p className="mt-2 text-sm text-slate-500">
              No variants currently need restocking.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {groups.map(
              (group) => {
                const groupPieces =
                  group.items.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.recommendedReorderQty,
                    0,
                  );

                const groupCost =
                  group.items.reduce(
                    (
                      total,
                      item,
                    ) => {
                      const cost =
                        purchaseCostFor(
                          item,
                        );

                      return (
                        total +
                        (cost === null
                          ? 0
                          : cost *
                            item.recommendedReorderQty)
                      );
                    },
                    0,
                  );

                const groupHasCost =
                  group.items.some(
                    (item) =>
                      purchaseCostFor(
                        item,
                      ) !== null,
                  );

                return (
                  <section
                    key={
                      group.productId
                    }
                    className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
                          Purchase Batch
                        </p>

                        <h2 className="mt-1 text-lg font-black">
                          {
                            group.productName
                          }
                        </h2>

                        <p className="mt-1 text-[9px] font-semibold text-slate-400">
                          {group.productSku ??
                            "No product SKU"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-black">
                          {
                            groupPieces
                          }{" "}
                          pcs
                        </p>

                        <p className="mt-1 text-[9px] font-semibold text-slate-400">
                          {groupHasCost
                            ? money(
                                groupCost,
                              )
                            : "Cost unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {group.items.map(
                        (item) => (
                          <div
                            key={
                              item.id
                            }
                            className="p-4 sm:p-5"
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={
                                  selectedIds.has(
                                    item.id,
                                  )
                                }
                                onChange={(event) => {
                                  setSelectedIds(
                                    (current) => {
                                      const next =
                                        new Set(
                                          current,
                                        );

                                      if (
                                        event.target
                                          .checked
                                      ) {
                                        next.add(
                                          item.id,
                                        );
                                      } else {
                                        next.delete(
                                          item.id,
                                        );
                                      }

                                      return next;
                                    },
                                  );
                                }}
                                className="mt-2 h-4 w-4 shrink-0 accent-emerald-700"
                              />

                              <span
                                className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-slate-200"
                                style={{
                                  backgroundColor:
                                    item.color
                                      .hexCode ??
                                    "#f1f5f9",
                                }}
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-black">
                                    {
                                      item.color.name
                                    }{" "}
                                    ·{" "}
                                    {
                                      item.size.name
                                    }
                                  </p>

                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${healthClass(
                                      item.stockHealth,
                                    )}`}
                                  >
                                    {healthLabel(
                                      item.stockHealth,
                                    )}
                                  </span>
                                </div>

                                <p className="mt-1 text-[9px] font-semibold text-slate-400">
                                  Available{" "}
                                  {
                                    item.availableStock
                                  }{" "}
                                  · 30d sales{" "}
                                  {
                                    item.recentSalesQty
                                  }
                                </p>

                                {(() => {
                                  const urgency =
                                    reorderUrgencyFor(
                                      item,
                                      selectedSupplier
                                        ?.leadTimeDays ??
                                        7,
                                    );

                                  const urgencyClass =
                                    urgency.code ===
                                    "ORDER_NOW"
                                      ? "bg-red-50 text-red-700"
                                      : urgency.code ===
                                          "ORDER_SOON"
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-emerald-50 text-emerald-700";

                                  return (
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${urgencyClass}`}
                                      >
                                        {
                                          urgency.label
                                        }
                                      </span>

                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[8px] font-black text-slate-600">
                                        Stock Cover ·{" "}
                                        {urgency.stockCoverDays ===
                                        null
                                          ? "No recent sales"
                                          : `${urgency.stockCoverDays} days`}
                                      </span>

                                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[8px] font-black text-sky-700">
                                        Lead Time ·{" "}
                                        {selectedSupplier
                                          ?.leadTimeDays ??
                                          7}{" "}
                                        days
                                      </span>
                                    </div>
                                  );
                                })()}

                                {item.protectedStock > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {item.draftStock > 0 && (
                                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[8px] font-black uppercase text-violet-700">
                                        Draft PO · {item.draftStock}
                                      </span>
                                    )}

                                    {item.incomingStock > 0 && (
                                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[8px] font-black uppercase text-sky-700">
                                        Incoming · {item.incomingStock}
                                      </span>
                                    )}

                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-black uppercase text-emerald-700">
                                      Protected · {item.protectedStock}
                                    </span>
                                  </div>
                                )}

                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  <MiniStat
                                    label="Suggested"
                                    value={`+${item.recommendedReorderQty}`}
                                  />

                                  <MiniStat
                                    label="Cost / pc"
                                    value={
                                      purchaseCostFor(
                                        item,
                                      ) === null
                                        ? "—"
                                        : money(
                                            purchaseCostFor(
                                              item,
                                            )!,
                                          )
                                    }
                                  />

                                  <MiniStat
                                    label="Est."
                                    value={
                                      purchaseCostFor(
                                        item,
                                      ) === null
                                        ? "—"
                                        : money(
                                            purchaseCostFor(
                                              item,
                                            )! *
                                              item.recommendedReorderQty,
                                          )
                                    }
                                  />
                                </div>

                                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                  {!supplierId ? (
                                    <p className="text-[9px] font-bold text-slate-400">
                                      Select a supplier above to manage supplier-specific costing.
                                    </p>
                                  ) : (
                                    <>
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                          Supplier Costing
                                        </p>

                                        {item.preferredSupplierId ===
                                        supplierId ? (
                                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[7px] font-black uppercase text-emerald-700">
                                            Preferred Supplier
                                          </span>
                                        ) : null}
                                      </div>

                                      <div className="mt-3 grid grid-cols-3 gap-2">
                                        <MiniStat
                                          label="Quoted"
                                          value={
                                            selectedSupplierCostFor(
                                              item,
                                            )
                                              ? money(
                                                  selectedSupplierCostFor(
                                                    item,
                                                  )!
                                                    .supplierCost,
                                                )
                                              : "Not set"
                                          }
                                        />

                                        <MiniStat
                                          label="Last Purchase"
                                          value={
                                            selectedSupplierCostFor(
                                              item,
                                            )
                                              ?.lastPurchaseCost ===
                                            null ||
                                            selectedSupplierCostFor(
                                              item,
                                            )
                                              ?.lastPurchaseCost ===
                                            undefined
                                              ? "—"
                                              : money(
                                                  selectedSupplierCostFor(
                                                    item,
                                                  )!
                                                    .lastPurchaseCost!,
                                                )
                                          }
                                        />

                                        <MiniStat
                                          label="Last Bought"
                                          value={shortDate(
                                            selectedSupplierCostFor(
                                              item,
                                            )
                                              ?.lastPurchasedAt ??
                                              null,
                                          )}
                                        />
                                      </div>

                                      {(() => {
                                        const best =
                                          cheapestSupplierCostFor(
                                            item,
                                          );

                                        const preferred =
                                          preferredSupplierCostFor(
                                            item,
                                          );

                                        const selected =
                                          selectedSupplierCostFor(
                                            item,
                                          );

                                        const preferredExtra =
                                          best &&
                                          preferred
                                            ? Math.max(
                                                0,
                                                preferred.supplierCost -
                                                  best.supplierCost,
                                              )
                                            : 0;

                                        const selectedSaving =
                                          best &&
                                          selected
                                            ? Math.max(
                                                0,
                                                (selected.supplierCost -
                                                  best.supplierCost) *
                                                  item.recommendedReorderQty,
                                              )
                                            : 0;

                                        return (
                                          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                              <div>
                                                <p className="text-[7px] font-black uppercase tracking-[0.14em] text-emerald-700">
                                                  Supplier Comparison
                                                </p>

                                                <p className="mt-1 text-[10px] font-black">
                                                  {best
                                                    ? `${best.supplier.name} · ${money(
                                                        best.supplierCost,
                                                      )}/pc`
                                                    : "No supplier quotes yet"}
                                                </p>
                                              </div>

                                              {best &&
                                              supplierId !==
                                                best.supplierId ? (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setSupplierId(
                                                      best.supplierId,
                                                    )
                                                  }
                                                  className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-[8px] font-black text-emerald-800"
                                                >
                                                  Select Best
                                                </button>
                                              ) : null}
                                            </div>

                                            <div className="mt-3 grid grid-cols-3 gap-2">
                                              <MiniStat
                                                label="Best Quote"
                                                value={
                                                  best
                                                    ? money(
                                                        best.supplierCost,
                                                      )
                                                    : "—"
                                                }
                                              />

                                              <MiniStat
                                                label="Preferred"
                                                value={
                                                  preferred
                                                    ? money(
                                                        preferred.supplierCost,
                                                      )
                                                    : "—"
                                                }
                                              />

                                              <MiniStat
                                                label="Pref. Gap"
                                                value={
                                                  preferred &&
                                                  best
                                                    ? preferredExtra >
                                                      0
                                                      ? `+${money(
                                                          preferredExtra,
                                                        )}/pc`
                                                      : "Best"
                                                    : "—"
                                                }
                                              />
                                            </div>

                                            {selected &&
                                            best &&
                                            selected.supplierId ===
                                              best.supplierId ? (
                                              <p className="mt-2 text-[8px] font-black text-emerald-700">
                                                ✓ Selected supplier is the cheapest saved quote.
                                              </p>
                                            ) : null}

                                            {selectedSaving >
                                            0 ? (
                                              <p className="mt-2 text-[8px] font-black text-amber-700">
                                                Switch to{" "}
                                                {
                                                  best
                                                    ?.supplier.name
                                                }{" "}
                                                and save{" "}
                                                {money(
                                                  selectedSaving,
                                                )}{" "}
                                                on this reorder.
                                              </p>
                                            ) : null}

                                            {supplierId &&
                                            !selected &&
                                            best ? (
                                              <p className="mt-2 text-[8px] font-bold leading-4 text-sky-700">
                                                Selected supplier has no saved quote for this variant. PO will use fallback cost unless you save a supplier quote.
                                              </p>
                                            ) : null}
                                          </div>
                                        );
                                      })()}

                                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={
                                            supplierCostInputFor(
                                              item,
                                            )
                                          }
                                          onChange={(
                                            event,
                                          ) => {
                                            const key =
                                              supplierCostDraftKey(
                                                item.id,
                                              );

                                            setSupplierCostDrafts(
                                              (
                                                current,
                                              ) => ({
                                                ...current,
                                                [key]:
                                                  event
                                                    .target
                                                    .value,
                                              }),
                                            );
                                          }}
                                          placeholder="Supplier cost / pc"
                                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black outline-none focus:border-emerald-400"
                                        />

                                        <button
                                          type="button"
                                          onClick={() =>
                                            saveSupplierCost(
                                              item,
                                            )
                                          }
                                          disabled={
                                            savingSupplierCostKey ===
                                            supplierCostDraftKey(
                                              item.id,
                                            )
                                          }
                                          className="rounded-xl bg-slate-900 px-3 py-2 text-[9px] font-black text-white disabled:opacity-50"
                                        >
                                          Save Cost
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreferredSupplier(
                                              item,
                                            )
                                          }
                                          disabled={
                                            savingSupplierCostKey ===
                                              supplierCostDraftKey(
                                                item.id,
                                              ) ||
                                            item.preferredSupplierId ===
                                              supplierId
                                          }
                                          className="rounded-xl bg-emerald-100 px-3 py-2 text-[9px] font-black text-emerald-800 disabled:opacity-50"
                                        >
                                          {item.preferredSupplierId ===
                                          supplierId
                                            ? "Preferred"
                                            : "Set Preferred"}
                                        </button>
                                      </div>

                                      {item.preferredSupplier &&
                                      item.preferredSupplierId !==
                                        supplierId ? (
                                        <p className="mt-2 text-[8px] font-bold text-slate-400">
                                          Current preferred:{" "}
                                          {
                                            item
                                              .preferredSupplier
                                              .name
                                          }
                                        </p>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/admin/inventory?variant=${encodeURIComponent(
                                      item.id,
                                    )}&action=restock`,
                                  )
                                }
                                className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-[9px] font-black text-white"
                              >
                                Restock
                              </button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </section>
                );
              },
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value:
    | number
    | string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5">
      <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-black">
        {value}
      </p>
    </div>
  );
}

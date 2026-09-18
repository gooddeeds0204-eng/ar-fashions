"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BrandLogo from "@/components/BrandLogo";

type CartItem = {
  id: string;
  productId: string;
  productName: string;
  image: string | null;
  variantId: string;
  colorId: string;
  colorName: string;
  sizeId: string;
  sizeName: string;
  price: number;
  quantity: number;
  mode?: "RETAIL" | "RESELLER";
  resellerMOQ?: number;

  resellerSetId?: string;
  resellerSetSlug?: string;
  resellerSetCount?: number;
  resellerSetName?: string;
  resellerSetPrice?: number;
};

type AppliedCoupon = {
  code: string;
  discountAmount: number;
  discountType:
    | "PERCENTAGE"
    | "FIXED";
  discountValue: number;
};

type SavedAddress = {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  isDefault: boolean;
};

type DeliverySettings = {
  retailDeliveryCharge: number;
  retailFreeDeliveryThreshold: number;

  resellerDeliveryMode:
    | "ACTUAL_FREIGHT"
    | "FLAT";

  resellerFlatDeliveryCharge: number;

  estimatedMinDays: number;
  estimatedMaxDays: number;

  bulkFreightMessage: string;

  restrictServiceability: boolean;
  allowedStates: string[];
  allowedPincodes: string[];
};

const DEFAULT_DELIVERY_SETTINGS:
  DeliverySettings = {
    retailDeliveryCharge: 79,
    retailFreeDeliveryThreshold: 999,

    resellerDeliveryMode:
      "ACTUAL_FREIGHT",

    resellerFlatDeliveryCharge: 0,

    estimatedMinDays: 3,
    estimatedMaxDays: 7,

    bulkFreightMessage:
      "Bulk shipping charge will be calculated after packing based on parcel weight and destination.",

    restrictServiceability: false,
    allowedStates: [],
    allowedPincodes: [],
  };

type SiteSettings = {
  storeName: string;
  supportPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  storeNotice: string;
  codEnabled: boolean;
  minimumRetailOrder: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

type SalesModeSettings = {
  retailStatus:
    | "OPEN"
    | "CLOSED";
  resellerStatus:
    | "OPEN"
    | "CLOSED";
  retailMessage: string;
  resellerMessage: string;
};

const DEFAULT_SITE_SETTINGS:
  SiteSettings = {
    storeName:
      "AS FASHIONS",
    supportPhone: "",
    whatsappNumber: "",
    supportEmail: "",
    storeNotice: "",
    codEnabled: true,
    minimumRetailOrder: 0,
    maintenanceMode:
      false,
    maintenanceMessage:
      "We are currently updating the store. Please check back shortly.",
  };

const DEFAULT_SALES_MODE:
  SalesModeSettings = {
    retailStatus: "OPEN",
    resellerStatus: "OPEN",
    retailMessage:
      "Retail shopping is open.",
    resellerMessage:
      "Reseller orders are open.",
  };

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem("ar-fashions-cart");
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [
    checkoutToast,
    setCheckoutToast,
  ] = useState<{
    type: "ERROR" | "SUCCESS";
    title: string;
    message: string;
  } | null>(null);

  const [
    couponInput,
    setCouponInput,
  ] = useState("");

  const [
    appliedCoupon,
    setAppliedCoupon,
  ] =
    useState<AppliedCoupon | null>(
      null,
    );

  const [
    couponLoading,
    setCouponLoading,
  ] = useState(false);

  const [
    couponError,
    setCouponError,
  ] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Andhra Pradesh");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");

  const [
    savedAddresses,
    setSavedAddresses,
  ] = useState<SavedAddress[]>([]);

  const [
    selectedAddressId,
    setSelectedAddressId,
  ] = useState("");

  const [
    deliverySettings,
    setDeliverySettings,
  ] =
    useState<DeliverySettings>(
      DEFAULT_DELIVERY_SETTINGS,
    );

  const [
    siteSettings,
    setSiteSettings,
  ] =
    useState<SiteSettings>(
      DEFAULT_SITE_SETTINGS,
    );

  const [
    salesMode,
    setSalesMode,
  ] =
    useState<SalesModeSettings>(
      DEFAULT_SALES_MODE,
    );

  useEffect(() => {
    const items = getCart();
    setCart(items);

    if (items.length === 0) {
      router.replace("/cart");
    }
  }, [router]);

  useEffect(() => {
    async function loadDeliverySettings() {
      try {
        const response =
          await fetch(
            "/api/delivery-settings",
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (
          data.settings &&
          typeof data.settings ===
            "object"
        ) {
          setDeliverySettings({
            ...DEFAULT_DELIVERY_SETTINGS,
            ...data.settings,
          });
        }
      } catch (error) {
        console.error(
          "Delivery settings load failed:",
          error,
        );
      }
    }

    loadDeliverySettings();
  }, []);

  useEffect(() => {
    async function loadSiteSettings() {
      try {
        const response =
          await fetch(
            "/api/site-settings",
            {
              cache:
                "no-store",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (
          data.settings &&
          typeof data.settings ===
            "object"
        ) {
          setSiteSettings({
            ...DEFAULT_SITE_SETTINGS,
            ...data.settings,
          });
        }

        if (
          data.salesMode &&
          typeof data.salesMode ===
            "object"
        ) {
          setSalesMode({
            ...DEFAULT_SALES_MODE,
            ...data.salesMode,
          });
        }
      } catch (error) {
        console.error(
          "Site settings load failed:",
          error,
        );
      }
    }

    loadSiteSettings();
  }, []);

  useEffect(() => {
    async function loadSavedAddresses() {
      try {
        const response =
          await fetch(
            "/api/addresses",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        const addresses:
          SavedAddress[] =
          Array.isArray(
            data.addresses,
          )
            ? data.addresses
            : [];

        setSavedAddresses(
          addresses,
        );

        const preferred =
          addresses.find(
            (address) =>
              address.isDefault,
          ) ?? addresses[0];

        if (preferred) {
          setSelectedAddressId(
            preferred.id,
          );

          setName(
            preferred.name,
          );

          setPhone(
            preferred.phone,
          );

          setAddressLine1(
            preferred.addressLine1,
          );

          setAddressLine2(
            preferred.addressLine2 ??
              "",
          );

          setCity(
            preferred.city,
          );

          setState(
            preferred.state,
          );

          setPincode(
            preferred.pincode,
          );

          setLandmark(
            preferred.landmark ??
              "",
          );
        }
      } catch (error) {
        console.error(
          "Saved addresses load failed:",
          error,
        );
      }
    }

    loadSavedAddresses();
  }, []);

  function useSavedAddress(
    address: SavedAddress,
  ) {
    setSelectedAddressId(
      address.id,
    );

    setName(address.name);
    setPhone(address.phone);

    setAddressLine1(
      address.addressLine1,
    );

    setAddressLine2(
      address.addressLine2 ??
        "",
    );

    setCity(address.city);
    setState(address.state);
    setPincode(address.pincode);

    setLandmark(
      address.landmark ?? "",
    );
  }

  const rawSubtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + item.price * item.quantity,
        0,
      ),
    [cart],
  );

  const hasCuratedSetItems =
    cart.some(
      (item) =>
        Boolean(
          item.resellerSetId,
        ),
    );

  const curatedSet = useMemo(() => {
    if (cart.length === 0) {
      return null;
    }

    const first = cart[0];

    if (
      first.mode !== "RESELLER" ||
      !first.resellerSetId
    ) {
      return null;
    }

    const setId =
      first.resellerSetId;

    const setCount =
      Number(
        first.resellerSetCount,
      );

    const setPrice =
      Number(
        first.resellerSetPrice,
      );

    if (
      !Number.isInteger(
        setCount,
      ) ||
      setCount <= 0 ||
      !Number.isFinite(
        setPrice,
      ) ||
      setPrice <= 0
    ) {
      return null;
    }

    const valid =
      cart.every(
        (item) =>
          item.mode ===
            "RESELLER" &&
          item.resellerSetId ===
            setId &&
          Number(
            item.resellerSetCount,
          ) ===
            setCount &&
          Number(
            item.resellerSetPrice,
          ) ===
            setPrice,
      );

    if (!valid) {
      return null;
    }

    return {
      id: setId,
      slug:
        first.resellerSetSlug ??
        "",
      name:
        first.resellerSetName ??
        "Reseller Set",
      count:
        setCount,
      price:
        setPrice,
    };
  }, [cart]);

  const invalidCuratedCart =
    hasCuratedSetItems &&
    !curatedSet;

  const subtotal =
    curatedSet
      ? curatedSet.price *
        curatedSet.count
      : rawSubtotal;

  const curatedSetSaving =
    curatedSet
      ? Math.max(
          0,
          rawSubtotal -
            subtotal,
        )
      : 0;

  const hasResellerItems = cart.some(
    (item) => item.mode === "RESELLER",
  );

  const hasRetailItems = cart.some(
    (item) => (item.mode ?? "RETAIL") === "RETAIL",
  );

  const isMixedCart =
    hasResellerItems && hasRetailItems;

  const isResellerOrder =
    hasResellerItems && !hasRetailItems;

  const invalidResellerGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        productName: string;
        quantity: number;
        moq: number;
      }
    >();

    for (const item of cart) {
      if (item.mode !== "RESELLER") continue;

      if (item.resellerSetId) {
        continue;
      }

      const existing = groups.get(item.productId);

      if (existing) {
        existing.quantity += item.quantity;
        existing.moq = Math.max(
          existing.moq,
          item.resellerMOQ ?? 1,
        );
      } else {
        groups.set(item.productId, {
          productName: item.productName,
          quantity: item.quantity,
          moq: Math.max(1, item.resellerMOQ ?? 1),
        });
      }
    }

    return Array.from(groups.values()).filter(
      (group) => group.quantity < group.moq,
    );
  }, [cart]);

  const activeSalesStatus =
    isResellerOrder
      ? salesMode.resellerStatus
      : salesMode.retailStatus;

  const activeSalesMessage =
    isResellerOrder
      ? salesMode.resellerMessage
      : salesMode.retailMessage;

  const salesClosed =
    activeSalesStatus ===
    "CLOSED";

  const minimumRetailOrder =
    Math.max(
      0,
      Number(
        siteSettings.minimumRetailOrder,
      ) || 0,
    );

  const retailMinimumNotMet =
    !isResellerOrder &&
    minimumRetailOrder > 0 &&
    subtotal <
      minimumRetailOrder;

  const checkoutBlocked =
    siteSettings.maintenanceMode ||
    salesClosed ||
    !siteSettings.codEnabled ||
    retailMinimumNotMet;

  const checkoutBlockMessage =
    siteSettings.maintenanceMode
      ? siteSettings.maintenanceMessage
      : salesClosed
        ? activeSalesMessage
        : !siteSettings.codEnabled
          ? "Cash on Delivery is currently unavailable."
          : retailMinimumNotMet
            ? `Minimum retail order is ${money(
                minimumRetailOrder,
              )}.`
            : "";

  const canPlaceOrder =
    !isMixedCart &&
    !invalidCuratedCart &&
    invalidResellerGroups.length === 0 &&
    !checkoutBlocked;

  const resellerFreightPending =
    isResellerOrder &&
    deliverySettings.resellerDeliveryMode ===
      "ACTUAL_FREIGHT";

  const deliveryCharge =
    isResellerOrder
      ? resellerFreightPending
        ? 0
        : Math.max(
            0,
            Number(
              deliverySettings.resellerFlatDeliveryCharge,
            ) || 0,
          )
      : subtotal >=
          Math.max(
            0,
            Number(
              deliverySettings.retailFreeDeliveryThreshold,
            ) || 0,
          )
        ? 0
        : Math.max(
            0,
            Number(
              deliverySettings.retailDeliveryCharge,
            ) || 0,
          );

  const discountAmount =
    appliedCoupon?.discountAmount ??
    0;

  const total = Math.max(
    0,
    subtotal -
      discountAmount +
      deliveryCharge,
  );

  /*
   * If cart value or order mode changes,
   * previously validated coupon preview
   * is cleared. Final validation also
   * happens again on the server.
   */
  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError("");
  }, [
    subtotal,
    isResellerOrder,
  ]);

  /*
   * If the customer edits a saved
   * address after selecting it,
   * checkout treats it as a new/manual
   * address instead of silently using
   * the old saved values.
   */
  const activeSavedAddressId =
    useMemo(() => {
      const address =
        savedAddresses.find(
          (item) =>
            item.id ===
            selectedAddressId,
        );

      if (!address) {
        return null;
      }

      const same =
        address.name.trim() ===
          name.trim() &&
        address.phone.trim() ===
          phone.trim() &&
        address.addressLine1.trim() ===
          addressLine1.trim() &&
        (address.addressLine2 ??
          "").trim() ===
          addressLine2.trim() &&
        address.city.trim() ===
          city.trim() &&
        address.state.trim() ===
          state.trim() &&
        address.pincode.trim() ===
          pincode.trim() &&
        (address.landmark ??
          "").trim() ===
          landmark.trim();

      return same
        ? address.id
        : null;
    }, [
      savedAddresses,
      selectedAddressId,
      name,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      landmark,
    ]);

  async function applyCoupon() {
    const code =
      couponInput
        .trim()
        .toUpperCase();

    if (!code) {
      setCouponError(
        "Enter a coupon code.",
      );
      return;
    }

    if (subtotal <= 0) {
      setCouponError(
        "Cart subtotal is invalid.",
      );
      return;
    }

    try {
      setCouponLoading(true);
      setCouponError("");

      const response =
        await fetch(
          "/api/coupons/validate",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              code,
              subtotal,
              type:
                isResellerOrder
                  ? "RESELLER"
                  : "RETAIL",
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Coupon could not be applied.",
        );
      }

      setAppliedCoupon({
        code:
          data.coupon.code,
        discountAmount:
          Number(
            data.coupon
              .discountAmount,
          ),
        discountType:
          data.coupon
            .discountType,
        discountValue:
          Number(
            data.coupon
              .discountValue,
          ),
      });

      setCouponInput(
        data.coupon.code,
      );
    } catch (error) {
      setAppliedCoupon(null);

      setCouponError(
        error instanceof Error
          ? error.message
          : "Coupon could not be applied.",
      );
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  }

  function showCheckoutAlert(
    message: string,
    title = "Checkout Needs Attention",
  ) {
    setCheckoutToast({
      type: "ERROR",
      title,
      message,
    });

    window.setTimeout(
      () => {
        setCheckoutToast(null);
      },
      3200,
    );
  }

  async function placeOrder() {
    if (isMixedCart) {
      showCheckoutAlert(
        "Retail and reseller items must be ordered separately.",
      );
      return;
    }

    if (invalidCuratedCart) {
      showCheckoutAlert(
        "Curated reseller set cart is invalid. Please rebuild the set.",
      );
      return;
    }

    if (invalidResellerGroups.length > 0) {
      showCheckoutAlert(
        "Reseller MOQ is not reached. Please return to cart.",
      );
      return;
    }

    if (
      siteSettings.maintenanceMode
    ) {
      showCheckoutAlert(
        siteSettings.maintenanceMessage,
      );
      return;
    }

    if (salesClosed) {
      showCheckoutAlert(
        activeSalesMessage,
      );
      return;
    }

    if (!siteSettings.codEnabled) {
      showCheckoutAlert(
        "Cash on Delivery is currently unavailable.",
      );
      return;
    }

    if (retailMinimumNotMet) {
      showCheckoutAlert(
        `Minimum retail order is ${money(
          minimumRetailOrder,
        )}.`,
      );
      return;
    }

    if (!name.trim()) {
      showCheckoutAlert("Please enter your name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      showCheckoutAlert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!addressLine1.trim()) {
      showCheckoutAlert("Please enter your address.");
      return;
    }

    if (!city.trim()) {
      showCheckoutAlert("Please enter your city.");
      return;
    }

    if (!state.trim()) {
      showCheckoutAlert("Please enter your state.");
      return;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      showCheckoutAlert("Please enter a valid 6-digit pincode.");
      return;
    }

    if (
      deliverySettings.restrictServiceability
    ) {
      const normalizedState =
        state
          .trim()
          .toLowerCase();

      const normalizedPincode =
        pincode.trim();

      const stateAllowed =
        deliverySettings.allowedStates
          .map((value) =>
            String(value)
              .trim()
              .toLowerCase(),
          )
          .includes(
            normalizedState,
          );

      const pincodeAllowed =
        deliverySettings.allowedPincodes
          .map((value) =>
            String(value).trim(),
          )
          .includes(
            normalizedPincode,
          );

      if (
        !stateAllowed &&
        !pincodeAllowed
      ) {
        showCheckoutAlert(
          "Sorry, delivery is not available for this address.",
        );
        return;
      }
    }

    if (cart.length === 0) {
      showCheckoutAlert("Your cart is empty.");
      router.push("/cart");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: isResellerOrder
            ? "RESELLER"
            : "RETAIL",
          paymentMethod: "COD",
          couponCode:
            appliedCoupon?.code ??
            null,

          resellerSetId:
            curatedSet?.id ??
            null,

          resellerSetCount:
            curatedSet?.count ??
            null,

          addressId:
            activeSavedAddressId,
          customer: {
            name: name.trim(),
            phone: phone.trim(),
            addressLine1: addressLine1.trim(),
            addressLine2:
              addressLine2.trim() || null,
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            landmark:
              landmark.trim() || null,
          },
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            colorName: item.colorName,
            sizeName: item.sizeName,
            quantity: item.quantity,
            unitPrice: item.price,
            mode: item.mode ?? "RETAIL",
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to place order.",
        );
      }

      localStorage.removeItem("ar-fashions-cart");

      router.replace(
        `/order-success?orderNumber=${encodeURIComponent(
          data.orderNumber,
        )}`,
      );
    } catch (error) {
      showCheckoutAlert(
        error instanceof Error
          ? error.message
          : "Failed to place order.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (cart.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F0]">
        <p className="text-sm font-semibold text-zinc-500">
          Redirecting to cart...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-28 text-[#211C18] sm:pb-10">
      {/* PREMIUM CHECKOUT TOAST */}
      {checkoutToast && (
        <div className="fixed left-1/2 top-[78px] z-[140] w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div
            className={`flex items-center gap-3 rounded-[1.35rem] border p-3.5 text-white shadow-[0_20px_55px_rgba(0,0,0,0.3)] backdrop-blur-xl ${
              checkoutToast.type ===
              "SUCCESS"
                ? "border-[#D4AF37]/25 bg-[#031B14]/95"
                : "border-red-300/25 bg-[#7C3A45]/95"
            }`}
          >
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-black ${
                checkoutToast.type ===
                "SUCCESS"
                  ? "bg-[#D4AF37] text-[#031B14]"
                  : "bg-red-400 text-white"
              }`}
            >
              {checkoutToast.type ===
              "SUCCESS"
                ? "✓"
                : "!"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#D9C29A]">
                AS Fashions
              </p>

              <p className="mt-1 text-[13px] font-black">
                {checkoutToast.title}
              </p>

              <p className="mt-0.5 text-[9px] font-semibold leading-4 text-white/60">
                {checkoutToast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setCheckoutToast(null)
              }
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-[#FFFDF9]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E4D7C4] bg-[#FFFDF9] text-sm font-black text-[#211C18]"
          >
            ←
          </button>

          <BrandLogo
            compact
            onClick={() =>
              router.push("/")
            }
          />

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full bg-[#F4EBDD] px-3 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-[#6B5435] sm:inline-flex">
              ✓ Secure Checkout
            </span>

            <span className="rounded-full bg-[#031B14] px-3 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-white">
              {isResellerOrder
                ? "Reseller"
                : "Retail"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {/* CHECKOUT HERO */}
        <section className="relative overflow-hidden rounded-[1.9rem] bg-gradient-to-br from-[#031B14] via-[#0A382B] to-[#031B14] p-5 text-white shadow-[0_24px_65px_rgba(0,0,0,0.2)] sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#D4AF37]/10 blur-3xl" />

          <div className="relative flex items-end justify-between gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#D9C29A]">
                Final Step
              </p>

              <h1 className="mt-3 font-serif text-[2.7rem] leading-[0.88] tracking-[-0.045em] sm:text-5xl">
                Secure
                <br />
                Checkout.
              </h1>

              <p className="mt-4 max-w-md text-[10px] leading-5 text-white/45 sm:text-sm">
                Confirm your delivery details, review your order and place it securely.
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-serif text-[2.2rem] text-[#D9C29A]">
                {money(total)}
              </p>

              <p className="mt-1 text-[7px] font-black uppercase tracking-[0.16em] text-white/35">
                Order Total
              </p>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-2">
            {[
              ["01", "Delivery"],
              ["02", "Payment"],
              ["03", "Confirm"],
            ].map(
              ([number, label]) => (
                <div
                  key={number}
                  className="rounded-[1rem] border border-white/[0.08] bg-white/[0.05] p-3"
                >
                  <p className="font-serif text-lg text-[#D9C29A]">
                    {number}
                  </p>

                  <p className="mt-1 text-[7px] font-black uppercase tracking-[0.08em] text-white/45">
                    {label}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start">
          {/* LEFT COLUMN */}
          <div className="space-y-5">
            {/* SAVED ADDRESS */}
            {savedAddresses.length > 0 && (
              <section className="overflow-hidden rounded-[1.6rem] border border-black/[0.05] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.035)]">
                <div className="flex items-center justify-between gap-3 border-b border-black/[0.05] px-5 py-4">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#6B5435]">
                      Delivery Address
                    </p>

                    <h2 className="mt-1 text-[1.35rem] font-black tracking-[-0.03em]">
                      Choose a saved address
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/addresses",
                      )
                    }
                    className="rounded-full border border-black/[0.07] bg-white px-3.5 py-2 text-[8px] font-black uppercase tracking-[0.08em]"
                  >
                    Manage
                  </button>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                  {savedAddresses.map(
                    (address) => {
                      const selected =
                        activeSavedAddressId ===
                        address.id;

                      return (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() =>
                            useSavedAddress(
                              address,
                            )
                          }
                          className={`relative rounded-[1.25rem] border p-4 text-left transition ${
                            selected
                              ? "border-[#D9C29A] bg-[#F8F1E7] shadow-[0_8px_25px_rgba(3,27,20,0.06)]"
                              : "border-black/[0.06] bg-[#FAF7F0]"
                          }`}
                        >
                          {selected && (
                            <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-[#031B14] text-[9px] font-black text-white">
                              ✓
                            </span>
                          )}

                          <div className="pr-9">
                            <div className="flex flex-wrap gap-1.5">
                              {address.isDefault && (
                                <span className="rounded-full bg-white px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.1em] text-[#6B5435]">
                                  Default
                                </span>
                              )}

                              {selected && (
                                <span className="rounded-full bg-[#031B14] px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.1em] text-white">
                                  Selected
                                </span>
                              )}
                            </div>

                            <p className="mt-3 text-[13px] font-black">
                              {address.name}
                            </p>

                            <p className="mt-1 text-[9px] font-semibold text-zinc-500">
                              +91 {address.phone}
                            </p>

                            <p className="mt-3 text-[10px] leading-5 text-zinc-600">
                              {address.addressLine1}
                              {address.addressLine2
                                ? `, ${address.addressLine2}`
                                : ""}
                              , {address.city},{" "}
                              {address.state} -{" "}
                              {address.pincode}
                            </p>

                            {address.landmark && (
                              <p className="mt-2 text-[8px] font-semibold text-zinc-400">
                                Near{" "}
                                {address.landmark}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>

                <div className="border-t border-black/[0.05] px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAddressId("");
                      setName("");
                      setPhone("");
                      setAddressLine1("");
                      setAddressLine2("");
                      setCity("");
                      setState(
                        "Andhra Pradesh",
                      );
                      setPincode("");
                      setLandmark("");
                    }}
                    className="text-[8px] font-black uppercase tracking-[0.08em] text-[#6B5435]"
                  >
                    + Use a new delivery address
                  </button>
                </div>
              </section>
            )}

            {activeSavedAddressId ? (
              <section className="overflow-hidden rounded-[1.6rem] border border-[#E4D7C4] bg-[#FFFDF9] shadow-[0_10px_30px_rgba(0,0,0,0.035)]">
                <div className="flex items-center gap-3 bg-[#F8F1E7] p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#031B14] text-sm font-black text-white">
                    ✓
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#6B5435]">
                      Delivery Details Confirmed
                    </p>

                    <p className="mt-1 text-[12px] font-black">
                      Using your selected saved address
                    </p>

                    <p className="mt-1 text-[9px] text-zinc-500">
                      Contact and delivery information is ready for this order.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 p-5 sm:grid-cols-2">
                  <div className="rounded-[1rem] bg-[#FAF7F0] px-4 py-3">
                    <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                      Recipient
                    </p>

                    <p className="mt-1 text-[11px] font-black">
                      {name}
                    </p>
                  </div>

                  <div className="rounded-[1rem] bg-[#FAF7F0] px-4 py-3">
                    <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                      Mobile
                    </p>

                    <p className="mt-1 text-[11px] font-black">
                      +91 {phone}
                    </p>
                  </div>

                  <div className="rounded-[1rem] bg-[#FAF7F0] px-4 py-3 sm:col-span-2">
                    <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
                      Delivering To
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-zinc-700">
                      {addressLine1}
                      {addressLine2
                        ? `, ${addressLine2}`
                        : ""}
                      {landmark
                        ? `, Near ${landmark}`
                        : ""}
                      , {city}, {state} - {pincode}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAddressId("")
                    }
                    className="min-h-[46px] rounded-[1rem] border border-black/[0.08] bg-white px-4 text-[8px] font-black uppercase tracking-[0.08em] text-zinc-600 sm:col-span-2"
                  >
                    Edit Delivery Details
                  </button>
                </div>
              </section>
            ) : (
              <>
            {/* DELIVERY FORM */}
            <section className="overflow-hidden rounded-[1.6rem] border border-black/[0.05] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.035)]">
              <div className="border-b border-black/[0.05] px-5 py-4">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#6B5435]">
                  Recipient Details
                </p>

                <h2 className="mt-1 text-[1.35rem] font-black tracking-[-0.03em]">
                  Delivery information
                </h2>

                <p className="mt-1 text-[9px] text-zinc-400">
                  Make sure the contact and address details are correct.
                </p>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    Full Name
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value,
                      )
                    }
                    placeholder="Enter full name"
                    className="mt-2 w-full rounded-[1rem] border border-black/[0.08] bg-[#FFFDF9] px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    Mobile Number
                  </label>

                  <div className="mt-2 flex overflow-hidden rounded-[1rem] border border-black/[0.08] bg-[#FFFDF9] focus-within:border-emerald-500">
                    <span className="flex items-center border-r border-black/[0.06] bg-[#FAF7F0] px-4 text-sm font-black text-zinc-500">
                      +91
                    </span>

                    <input
                      value={phone}
                      onChange={(event) =>
                        setPhone(
                          event.target.value
                            .replace(
                              /\D/g,
                              "",
                            )
                            .slice(
                              0,
                              10,
                            ),
                        )
                      }
                      inputMode="numeric"
                      placeholder="10 digit mobile number"
                      className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    House / Flat / Street
                  </label>

                  <input
                    value={addressLine1}
                    onChange={(event) =>
                      setAddressLine1(
                        event.target.value,
                      )
                    }
                    placeholder="House no, building, street"
                    className="mt-2 w-full rounded-[1rem] border border-black/[0.08] bg-[#FFFDF9] px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    Area / Colony
                  </label>

                  <input
                    value={addressLine2}
                    onChange={(event) =>
                      setAddressLine2(
                        event.target.value,
                      )
                    }
                    placeholder="Area, colony, apartment (optional)"
                    className="mt-2 w-full rounded-[1rem] border border-black/[0.08] bg-[#FFFDF9] px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    City
                  </label>

                  <input
                    value={city}
                    onChange={(event) =>
                      setCity(
                        event.target.value,
                      )
                    }
                    placeholder="City"
                    className="mt-2 w-full rounded-[1rem] border border-black/[0.08] bg-[#FFFDF9] px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    State
                  </label>

                  <input
                    value={state}
                    onChange={(event) =>
                      setState(
                        event.target.value,
                      )
                    }
                    placeholder="State"
                    className="mt-2 w-full rounded-[1rem] border border-black/[0.08] bg-[#FFFDF9] px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    Pincode
                  </label>

                  <input
                    value={pincode}
                    onChange={(event) =>
                      setPincode(
                        event.target.value
                          .replace(
                            /\D/g,
                            "",
                          )
                          .slice(
                            0,
                            6,
                          ),
                      )
                    }
                    inputMode="numeric"
                    placeholder="6 digit pincode"
                    className="mt-2 w-full rounded-[1rem] border border-black/[0.08] bg-[#FFFDF9] px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    Landmark
                  </label>

                  <input
                    value={landmark}
                    onChange={(event) =>
                      setLandmark(
                        event.target.value,
                      )
                    }
                    placeholder="Nearby landmark"
                    className="mt-2 w-full rounded-[1rem] border border-black/[0.08] bg-[#FFFDF9] px-4 py-3.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </section>

              </>
            )}

            {/* PAYMENT */}
            <section className="overflow-hidden rounded-[1.6rem] border border-black/[0.05] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.035)]">
              <div className="border-b border-black/[0.05] px-5 py-4">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#6B5435]">
                  Payment
                </p>

                <h2 className="mt-1 text-[1.35rem] font-black tracking-[-0.03em]">
                  Payment method
                </h2>
              </div>

              <div className="p-5">
                <div
                  className={`rounded-[1.25rem] border p-4 ${
                    siteSettings.codEnabled
                      ? "border-emerald-300 bg-emerald-50/60"
                      : "border-black/[0.06] bg-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-black ${
                        siteSettings.codEnabled
                          ? "bg-[#031B14] text-white"
                          : "bg-zinc-300 text-zinc-500"
                      }`}
                    >
                      ₹
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-black">
                        Cash on Delivery
                      </p>

                      <p className="mt-1 text-[9px] leading-4 text-zinc-500">
                        {siteSettings.codEnabled
                          ? "Pay when your order reaches you."
                          : "COD is currently unavailable."}
                      </p>
                    </div>

                    {siteSettings.codEnabled && (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#031B14] text-[9px] font-black text-white">
                        ✓
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    ["✓", "Secure"],
                    ["◎", "Protected"],
                    ["₹", "COD"],
                  ].map(
                    ([icon, label]) => (
                      <div
                        key={label}
                        className="rounded-xl bg-[#FAF7F0] px-2 py-3 text-center"
                      >
                        <p className="text-sm font-black text-[#6B5435]">
                          {icon}
                        </p>

                        <p className="mt-1 text-[7px] font-black uppercase tracking-[0.08em] text-zinc-500">
                          {label}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT SUMMARY */}
          <aside className="h-fit overflow-hidden rounded-[1.6rem] border border-black/[0.05] bg-white shadow-[0_12px_35px_rgba(0,0,0,0.045)] lg:sticky lg:top-24">
            <div className="bg-[#031B14] p-5 text-white">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#D9C29A]">
                    Final Review
                  </p>

                  <h2 className="mt-2 font-serif text-[1.9rem] leading-none">
                    Order Summary
                  </h2>

                  <p className="mt-2 text-[9px] text-white/45">
                    {cart.reduce(
                      (sum, item) =>
                        sum +
                        item.quantity,
                      0,
                    )}{" "}
                    items
                  </p>
                </div>

                <span className="rounded-full bg-white/10 px-3 py-2 text-[7px] font-black uppercase tracking-[0.1em] text-white/70">
                  {isResellerOrder
                    ? "Reseller"
                    : "Retail"}
                </span>
              </div>
            </div>

            {/* PRODUCTS */}
            <div className="border-b border-black/[0.05] p-4">
              <div className="space-y-3">
                {cart.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 rounded-[1rem] bg-[#FAF7F0] p-2.5"
                    >
                      <div className="h-[72px] w-[58px] shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full place-items-center font-serif text-xs text-zinc-300">
                            AS
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 py-1">
                        <p className="line-clamp-1 text-[10px] font-black">
                          {item.productName}
                        </p>

                        <p className="mt-1 text-[8px] leading-4 text-zinc-500">
                          {item.colorName} ·{" "}
                          {item.sizeName} · Qty{" "}
                          {item.quantity}
                        </p>

                        {item.resellerSetId ? (
                          <p className="mt-2 text-[8px] font-black text-[#6B5435]">
                            Included in curated set
                          </p>
                        ) : (
                          <p className="mt-2 text-[11px] font-black">
                            {money(
                              item.price *
                                item.quantity,
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="p-5">
              {/* CURATED SET */}
              {curatedSet && (
                <div className="mb-4 rounded-[1.1rem] border border-violet-100 bg-violet-50 p-4">
                  <p className="text-[7px] font-black uppercase tracking-[0.15em] text-violet-700">
                    Curated Reseller Set
                  </p>

                  <p className="mt-1 text-[11px] font-black">
                    {curatedSet.name}
                  </p>

                  <p className="mt-1 text-[8px] text-violet-700">
                    {curatedSet.count} set
                    {curatedSet.count ===
                    1
                      ? ""
                      : "s"}
                  </p>
                </div>
              )}

              {/* COUPON */}
              <div className="rounded-[1.1rem] border border-black/[0.06] bg-[#FAF7F0] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-[0.15em] text-[#6B5435]">
                      Offers
                    </p>

                    <p className="mt-1 text-[11px] font-black">
                      Coupon Code
                    </p>
                  </div>

                  {appliedCoupon && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.1em] text-[#6B5435]">
                      Applied
                    </span>
                  )}
                </div>

                {appliedCoupon ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3">
                    <div>
                      <p className="text-[10px] font-black text-[#6B5435]">
                        {appliedCoupon.code}
                      </p>

                      <p className="mt-1 text-[8px] text-zinc-500">
                        You save{" "}
                        {money(
                          discountAmount,
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-[7px] font-black uppercase tracking-[0.08em] text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(event) => {
                        setCouponInput(
                          event.target.value.toUpperCase(),
                        );

                        setCouponError("");
                      }}
                      placeholder="ENTER CODE"
                      className="min-w-0 flex-1 rounded-xl border border-black/[0.07] bg-white px-3 py-3 text-[9px] font-black uppercase outline-none focus:border-emerald-500"
                    />

                    <button
                      type="button"
                      disabled={couponLoading}
                      onClick={applyCoupon}
                      className="rounded-xl bg-[#031B14] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-white disabled:bg-zinc-300"
                    >
                      {couponLoading
                        ? "..."
                        : "Apply"}
                    </button>
                  </div>
                )}

                {couponError && (
                  <p className="mt-2 text-[8px] font-bold leading-4 text-red-600">
                    {couponError}
                  </p>
                )}
              </div>

              {/* PRICE DETAILS */}
              <div className="mt-5">
                <p className="text-[7px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Price Details
                </p>

                <div className="mt-3 space-y-3 text-[10px]">
                  {curatedSet &&
                    curatedSetSaving >
                      0 && (
                      <>
                        <div className="flex justify-between gap-4">
                          <span className="text-zinc-500">
                            Normal reseller value
                          </span>

                          <span className="font-black">
                            {money(
                              rawSubtotal,
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between gap-4 text-[#6B5435]">
                          <span>
                            Set saving
                          </span>

                          <span className="font-black">
                            -
                            {money(
                              curatedSetSaving,
                            )}
                          </span>
                        </div>
                      </>
                    )}

                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">
                      Subtotal
                    </span>

                    <span className="font-black">
                      {money(subtotal)}
                    </span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between gap-4 text-[#6B5435]">
                      <span>
                        Coupon ·{" "}
                        {appliedCoupon.code}
                      </span>

                      <span className="font-black">
                        -
                        {money(
                          discountAmount,
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-zinc-500">
                        Delivery
                      </span>

                      {resellerFreightPending && (
                        <p className="mt-1 max-w-[180px] text-[7px] leading-3 text-violet-500">
                          Freight calculated after packing
                        </p>
                      )}
                    </div>

                    <span
                      className={`text-right font-black ${
                        !resellerFreightPending &&
                        deliveryCharge ===
                          0
                          ? "text-[#6B5435]"
                          : ""
                      }`}
                    >
                      {resellerFreightPending
                        ? "Pending"
                        : deliveryCharge ===
                            0
                          ? "FREE"
                          : money(
                              deliveryCharge,
                            )}
                    </span>
                  </div>

                  <div className="border-t border-black/[0.07] pt-4">
                    <div className="flex items-end justify-between gap-3">
                      <span className="font-black">
                        Total
                      </span>

                      <span className="text-[1.45rem] font-black">
                        {money(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FREIGHT */}
              {resellerFreightPending && (
                <div className="mt-4 rounded-[1.1rem] border border-violet-100 bg-violet-50 p-4">
                  <p className="text-[9px] font-black text-violet-800">
                    Bulk Freight Pending
                  </p>

                  <p className="mt-1 text-[8px] leading-4 text-violet-700">
                    {deliverySettings.bulkFreightMessage}
                  </p>

                  <p className="mt-2 text-[7px] font-black uppercase tracking-[0.08em] text-violet-600">
                    Estimated{" "}
                    {deliverySettings.estimatedMinDays}
                    –
                    {deliverySettings.estimatedMaxDays}{" "}
                    days
                  </p>
                </div>
              )}

              {/* CHECKOUT WARNINGS */}
              {checkoutBlocked && (
                <div className="mt-4 rounded-[1.1rem] border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-amber-900">
                    Checkout Notice
                  </p>

                  <p className="mt-1 text-[8px] leading-4 text-amber-700">
                    {checkoutBlockMessage}
                  </p>
                </div>
              )}

              {isMixedCart && (
                <div className="mt-4 rounded-[1.1rem] border border-red-200 bg-red-50 p-4">
                  <p className="text-[9px] font-black text-red-800">
                    Retail and reseller items must be ordered separately.
                  </p>
                </div>
              )}

              {invalidCuratedCart && (
                <div className="mt-4 rounded-[1.1rem] border border-red-200 bg-red-50 p-4">
                  <p className="text-[9px] font-black text-red-800">
                    Curated reseller set is invalid. Please rebuild the set.
                  </p>
                </div>
              )}

              {invalidResellerGroups.length >
                0 && (
                <div className="mt-4 rounded-[1.1rem] border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[9px] font-black text-amber-900">
                    Reseller MOQ not reached
                  </p>

                  {invalidResellerGroups.map(
                    (group) => (
                      <p
                        key={
                          group.productName
                        }
                        className="mt-2 text-[8px] font-semibold text-amber-800"
                      >
                        {group.productName}:{" "}
                        {group.quantity}/
                        {group.moq} pcs
                      </p>
                    ),
                  )}
                </div>
              )}

              {/* DESKTOP CTA */}
              <button
                type="button"
                onClick={placeOrder}
                disabled={
                  loading ||
                  !canPlaceOrder
                }
                className="mt-5 hidden min-h-[54px] w-full rounded-[1rem] bg-[#031B14] px-4 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(3,27,20,0.18)] transition-[transform,opacity] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none sm:block"
              >
                {loading
                  ? "Placing Order..."
                  : isResellerOrder
                    ? `Place Reseller Order · ${money(
                        total,
                      )}`
                    : `Place Order · ${money(
                        total,
                      )}`}
              </button>

              <p className="mt-3 text-center text-[7px] leading-4 text-zinc-400">
                By placing your order, you confirm that your delivery details are correct.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* MOBILE PLACE ORDER BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/[0.07] bg-[#FFFDF9]/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.09)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-400">
              Pay on Delivery
            </p>

            <p className="mt-0.5 text-[18px] font-black leading-none">
              {money(total)}
            </p>

            <p className="mt-1 text-[7px] font-semibold text-zinc-400">
              {cart.reduce(
                (sum, item) =>
                  sum +
                  item.quantity,
                0,
              )}{" "}
              items
            </p>
          </div>

          <button
            type="button"
            onClick={placeOrder}
            disabled={
              loading ||
              !canPlaceOrder
            }
            className="min-h-[50px] min-w-[185px] rounded-[1rem] bg-[#031B14] px-4 text-[9px] font-black uppercase tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(3,27,20,0.18)] transition-[transform,opacity] duration-200 active:scale-[0.98] disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
          >
            {loading
              ? "Placing..."
              : isResellerOrder
                ? "Place Reseller Order →"
                : "Place Order →"}
          </button>
        </div>
      </div>
    </main>
  );
}

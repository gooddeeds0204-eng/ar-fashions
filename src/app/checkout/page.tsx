"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
      "AR FASHIONS",
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

  async function placeOrder() {
    if (isMixedCart) {
      alert(
        "Retail and reseller items must be ordered separately.",
      );
      return;
    }

    if (invalidCuratedCart) {
      alert(
        "Curated reseller set cart is invalid. Please rebuild the set.",
      );
      return;
    }

    if (invalidResellerGroups.length > 0) {
      alert(
        "Reseller MOQ is not reached. Please return to cart.",
      );
      return;
    }

    if (
      siteSettings.maintenanceMode
    ) {
      alert(
        siteSettings.maintenanceMessage,
      );
      return;
    }

    if (salesClosed) {
      alert(
        activeSalesMessage,
      );
      return;
    }

    if (!siteSettings.codEnabled) {
      alert(
        "Cash on Delivery is currently unavailable.",
      );
      return;
    }

    if (retailMinimumNotMet) {
      alert(
        `Minimum retail order is ${money(
          minimumRetailOrder,
        )}.`,
      );
      return;
    }

    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!addressLine1.trim()) {
      alert("Please enter your address.");
      return;
    }

    if (!city.trim()) {
      alert("Please enter your city.");
      return;
    }

    if (!state.trim()) {
      alert("Please enter your state.");
      return;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      alert("Please enter a valid 6-digit pincode.");
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
        alert(
          "Sorry, delivery is not available for this address.",
        );
        return;
      }
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
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

      if (
        typeof data.userId === "string"
      ) {
        localStorage.setItem(
          "ar-fashions-user-id",
          data.userId,
        );
      }

      localStorage.removeItem("ar-fashions-cart");

      router.replace(
        `/order-success?orderNumber=${encodeURIComponent(
          data.orderNumber,
        )}`,
      );
    } catch (error) {
      alert(
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
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm font-semibold text-zinc-500">
          Redirecting to cart...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="rounded-full px-3 py-2 text-sm font-bold hover:bg-zinc-100"
          >
            ←
          </button>

          <button
            onClick={() => router.push("/")}
            className="ml-3 text-xl font-black tracking-[-0.05em]"
          >
            AR
            <span className="text-emerald-600">
              FASHIONS
            </span>
          </button>

          <span className="ml-auto text-xs font-bold text-zinc-500">
            {isResellerOrder
              ? "Secure Reseller Checkout"
              : "Secure Checkout"}
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        {/* CUSTOMER DETAILS */}
        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <h1 className="text-2xl font-black">
            Delivery Details
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Enter your delivery information.
          </p>

          {savedAddresses.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
                  Saved Addresses
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/addresses",
                    )
                  }
                  className="text-xs font-bold text-emerald-700"
                >
                  Manage
                </button>
              </div>

              <div className="mt-3 grid gap-3">
                {savedAddresses.map(
                  (address) => (
                    <button
                      key={
                        address.id
                      }
                      type="button"
                      onClick={() =>
                        useSavedAddress(
                          address,
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        activeSavedAddressId ===
                        address.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-black/10 bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black">
                          {
                            address.name
                          }
                        </p>

                        {address.isDefault && (
                          <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                            Default
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-zinc-600">
                        {
                          address.addressLine1
                        }
                        {address.addressLine2
                          ? `, ${address.addressLine2}`
                          : ""}
                        ,{" "}
                        {
                          address.city
                        }{" "}
                        -{" "}
                        {
                          address.pincode
                        }
                      </p>
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAddressId(
                    "",
                  );
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
                className="mt-3 text-xs font-bold text-zinc-600 underline"
              >
                Use a new address
              </button>
            </div>
          )}

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold">
                Full Name
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Enter your full name"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold">
                Mobile Number
              </label>

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10),
                  )
                }
                inputMode="numeric"
                placeholder="10-digit mobile number"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold">
                Address
              </label>

              <input
                value={addressLine1}
                onChange={(event) =>
                  setAddressLine1(event.target.value)
                }
                placeholder="House / Flat / Street"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold">
                Address Line 2
              </label>

              <input
                value={addressLine2}
                onChange={(event) =>
                  setAddressLine2(event.target.value)
                }
                placeholder="Area / Colony / Apartment (optional)"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold">
                City
              </label>

              <input
                value={city}
                onChange={(event) =>
                  setCity(event.target.value)
                }
                placeholder="City"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold">
                State
              </label>

              <input
                value={state}
                onChange={(event) =>
                  setState(event.target.value)
                }
                placeholder="State"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold">
                Pincode
              </label>

              <input
                value={pincode}
                onChange={(event) =>
                  setPincode(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6),
                  )
                }
                inputMode="numeric"
                placeholder="6-digit pincode"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold">
                Landmark
              </label>

              <input
                value={landmark}
                onChange={(event) =>
                  setLandmark(event.target.value)
                }
                placeholder="Nearby landmark (optional)"
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </section>

        {/* ORDER SUMMARY */}
        <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">
              Order Summary
            </h2>

            {isResellerOrder && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Reseller Order
              </span>
            )}
          </div>

          <div className="mt-5 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex gap-3"
              >
                <div className="h-16 w-14 overflow-hidden rounded-xl bg-zinc-100">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold">
                    {item.productName}
                  </p>

                  <p className="mt-1 text-[11px] text-zinc-500">
                    {item.colorName} · {item.sizeName} · Qty{" "}
                    {item.quantity}
                  </p>

                  {item.resellerSetId ? (
                    <p className="mt-1 text-[11px] font-bold text-emerald-700">
                      Included in curated set
                    </p>
                  ) : (
                    <p className="mt-1 text-sm font-black">
                      {money(
                        item.price * item.quantity,
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="my-6 border-t border-black/10" />

          {curatedSet && (
            <div className="mb-5 rounded-2xl bg-emerald-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Curated Reseller Set
              </p>

              <p className="mt-1 text-sm font-black">
                {curatedSet.name}
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                {curatedSet.count} set
                {curatedSet.count === 1
                  ? ""
                  : "s"}
              </p>
            </div>
          )}

          <div className="space-y-3 text-sm">
            {curatedSet && curatedSetSaving > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    Normal Reseller Value
                  </span>

                  <span className="font-bold">
                    {money(rawSubtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-emerald-700">
                  <span>
                    Set Saving
                  </span>

                  <span className="font-black">
                    -{money(curatedSetSaving)}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between">
              <span className="text-zinc-500">
                Subtotal
              </span>

              <span className="font-bold">
                {money(subtotal)}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="text-zinc-500">
                Delivery
              </span>

              <span className="text-right font-bold">
                {resellerFreightPending
                  ? "Calculated after packing"
                  : deliveryCharge === 0
                    ? "FREE"
                    : money(deliveryCharge)}
              </span>
            </div>

            {resellerFreightPending && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <p className="text-xs font-black text-violet-800">
                  Bulk Freight Pending
                </p>

                <p className="mt-1 text-[11px] leading-5 text-violet-700">
                  {
                    deliverySettings.bulkFreightMessage
                  }
                </p>

                <p className="mt-2 text-[10px] font-bold text-violet-600">
                  Estimated delivery:{" "}
                  {
                    deliverySettings.estimatedMinDays
                  }
                  –
                  {
                    deliverySettings.estimatedMaxDays
                  }{" "}
                  days
                </p>
              </div>
            )}

            {appliedCoupon && (
              <div className="flex justify-between text-emerald-700">
                <span>
                  Coupon · {
                    appliedCoupon.code
                  }
                </span>

                <span className="font-black">
                  -{money(
                    discountAmount,
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-black/10 p-4">
            <p className="text-xs font-black">
              Coupon Code
            </p>

            {appliedCoupon ? (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                <div>
                  <p className="text-sm font-black text-emerald-700">
                    {
                      appliedCoupon.code
                    } applied
                  </p>

                  <p className="mt-1 text-[11px] text-emerald-700/80">
                    You save {
                      money(
                        discountAmount,
                      )
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    removeCoupon
                  }
                  className="text-xs font-black text-red-600"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <input
                  value={
                    couponInput
                  }
                  onChange={(event) => {
                    setCouponInput(
                      event.target.value
                        .toUpperCase(),
                    );
                    setCouponError(
                      "",
                    );
                  }}
                  placeholder="Enter coupon"
                  className="min-w-0 flex-1 rounded-xl border border-black/10 px-4 py-3 text-sm font-bold uppercase outline-none focus:border-emerald-600"
                />

                <button
                  type="button"
                  disabled={
                    couponLoading
                  }
                  onClick={
                    applyCoupon
                  }
                  className="rounded-xl bg-zinc-950 px-5 text-xs font-black text-white disabled:bg-zinc-300"
                >
                  {couponLoading
                    ? "..."
                    : "Apply"}
                </button>
              </div>
            )}

            {couponError && (
              <p className="mt-2 text-xs font-bold text-red-600">
                {couponError}
              </p>
            )}
          </div>

          <div className="my-5 border-t border-black/10" />

          <div className="flex items-center justify-between">
            <span className="text-base font-black">
              Total
            </span>

            <span className="text-2xl font-black">
              {money(total)}
            </span>
          </div>

          {checkoutBlocked && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black text-amber-800">
                CHECKOUT NOTICE
              </p>

              <p className="mt-1 text-[11px] leading-5 text-amber-700">
                {checkoutBlockMessage}
              </p>
            </div>
          )}

          {siteSettings.codEnabled ? (
            <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-black text-emerald-700">
                CASH ON DELIVERY
              </p>

              <p className="mt-1 text-[11px] leading-5 text-emerald-700/80">
                Pay when your order is delivered.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-zinc-100 p-4">
              <p className="text-xs font-black text-zinc-600">
                CASH ON DELIVERY UNAVAILABLE
              </p>
            </div>
          )}

          {isMixedCart && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
              Retail and reseller items must be ordered separately.
            </div>
          )}

          {invalidResellerGroups.length > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black text-amber-900">
                Reseller MOQ not reached
              </p>

              {invalidResellerGroups.map((group) => (
                <p
                  key={group.productName}
                  className="mt-2 text-xs font-semibold text-amber-800"
                >
                  {group.productName}: {group.quantity}/{group.moq} pcs
                </p>
              ))}
            </div>
          )}

          <button
            onClick={placeOrder}
            disabled={loading || !canPlaceOrder}
            className="mt-5 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {loading
              ? "Placing Order..."
              : isResellerOrder
                ? `Place Reseller Order · ${money(total)}`
                : `Place Order · ${money(total)}`}
          </button>
        </aside>
      </div>
    </main>
  );
}

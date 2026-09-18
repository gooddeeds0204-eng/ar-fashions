import "server-only";

const API_BASE =
  "https://apiv2.shiprocket.in/v1/external";

type TokenCache = {
  value: string;
  expiresAt: number;
};

const globalForShiprocket =
  globalThis as unknown as {
    shiprocketToken?:
      TokenCache;
  };

function env(name: string) {
  return (
    process.env[name] ??
    ""
  ).trim();
}

export function isShiprocketConfigured() {
  return Boolean(
    env(
      "SHIPROCKET_API_EMAIL",
    ) &&
      env(
        "SHIPROCKET_API_PASSWORD",
      ) &&
      env(
        "SHIPROCKET_PICKUP_LOCATION",
      ) &&
      /^\d{6}$/.test(
        env(
          "SHIPROCKET_PICKUP_PINCODE",
        ),
      ),
  );
}

export function getShiprocketPickupPincode() {
  return env(
    "SHIPROCKET_PICKUP_PINCODE",
  );
}

export function getShiprocketPickupLocation() {
  return env(
    "SHIPROCKET_PICKUP_LOCATION",
  );
}

async function login() {
  if (
    !isShiprocketConfigured()
  ) {
    throw new Error(
      "Shiprocket is not configured.",
    );
  }

  const cached =
    globalForShiprocket.shiprocketToken;

  if (
    cached &&
    cached.expiresAt >
      Date.now() +
        60_000
  ) {
    return cached.value;
  }

  const response =
    await fetch(
      `${API_BASE}/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          email: env(
            "SHIPROCKET_API_EMAIL",
          ),
          password: env(
            "SHIPROCKET_API_PASSWORD",
          ),
        }),
        cache: "no-store",
      },
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data?.token
  ) {
    throw new Error(
      String(
        data?.message ??
          "Shiprocket authentication failed.",
      ),
    );
  }

  /*
   * Shiprocket tokens are documented as
   * long-lived. Cache for 9 days so the
   * server refreshes before expiry.
   */
  globalForShiprocket.shiprocketToken =
    {
      value:
        String(data.token),
      expiresAt:
        Date.now() +
        9 *
          24 *
          60 *
          60 *
          1000,
    };

  return String(
    data.token,
  );
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token =
    await login();

  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        ...init,
        headers: {
          Authorization:
            `Bearer ${token}`,
          "Content-Type":
            "application/json",
          ...(init.headers ??
            {}),
        },
        cache: "no-store",
      },
    );

  const text =
    await response.text();

  let data: unknown = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const source =
      data &&
      typeof data ===
        "object"
        ? (data as Record<
            string,
            unknown
          >)
        : {};

    throw new Error(
      String(
        source.message ??
          source.error ??
          "Shiprocket request failed.",
      ),
    );
  }

  return data as T;
}

export type ShiprocketCourier = {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  estimated_delivery_days:
    string | number;
  etd?: string;
  rating?: number;
  cod?: number;
};

export async function getShiprocketServiceability(
  input: {
    deliveryPincode: string;
    weightKg: number;
    cod: boolean;
  },
) {
  const params =
    new URLSearchParams({
      pickup_postcode:
        getShiprocketPickupPincode(),
      delivery_postcode:
        input.deliveryPincode,
      weight:
        String(
          Math.max(
            0.5,
            input.weightKg,
          ),
        ),
      cod:
        input.cod
          ? "1"
          : "0",
    });

  const data =
    await request<{
      data?: {
        available_courier_companies?: ShiprocketCourier[];
        recommended_courier_company_id?: number;
      };
    }>(
      `/courier/serviceability/?${params.toString()}`,
    );

  const couriers =
    Array.isArray(
      data.data
        ?.available_courier_companies,
    )
      ? data.data!
          .available_courier_companies!
          .filter(
            (item) =>
              Number.isFinite(
                Number(
                  item.courier_company_id,
                ),
              ),
          )
      : [];

  return {
    couriers,
    recommendedCourierId:
      Number(
        data.data
          ?.recommended_courier_company_id,
      ) || null,
  };
}

export type ShiprocketOrderInput = {
  orderNumber: string;
  orderDate: Date;
  customerName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  items: Array<{
    name: string;
    sku: string;
    units: number;
    sellingPrice: number;
  }>;
  paymentMethod:
    | "COD"
    | "PREPAID";
  shippingCharge: number;
  subTotal: number;
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
};

function orderDateValue(
  date: Date,
) {
  const iso =
    date.toISOString();

  return iso
    .slice(0, 19)
    .replace("T", " ");
}

export async function createShiprocketOrder(
  input: ShiprocketOrderInput,
) {
  return request<{
    order_id: number;
    shipment_id: number;
    status: string;
    status_code?: number;
    onboarding_completed_now?: number;
    awb_code?: string;
  }>(
    "/orders/create/adhoc",
    {
      method: "POST",
      body: JSON.stringify({
        order_id:
          input.orderNumber,
        order_date:
          orderDateValue(
            input.orderDate,
          ),
        pickup_location:
          getShiprocketPickupLocation(),
        comment:
          "AS Fashions website order",

        billing_customer_name:
          input.customerName,
        billing_last_name:
          "",
        billing_address:
          input.addressLine1,
        billing_address_2:
          input.addressLine2 ??
          "",
        billing_city:
          input.city,
        billing_pincode:
          input.pincode,
        billing_state:
          input.state,
        billing_country:
          "India",
        billing_email:
          input.email,
        billing_phone:
          input.phone,

        shipping_is_billing:
          true,

        order_items:
          input.items.map(
            (item) => ({
              name:
                item.name,
              sku:
                item.sku,
              units:
                item.units,
              selling_price:
                item.sellingPrice,
              discount: "",
              tax: "",
              hsn: "",
            }),
          ),

        payment_method:
          input.paymentMethod ===
          "COD"
            ? "COD"
            : "Prepaid",

        shipping_charges:
          input.shippingCharge,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total:
          input.subTotal,

        length:
          input.lengthCm,
        breadth:
          input.breadthCm,
        height:
          input.heightCm,
        weight:
          input.weightKg,
      }),
    },
  );
}

export async function assignShiprocketAwb(
  shipmentId: number,
  courierId: number,
) {
  return request<{
    awb_assign_status?: number;
    response?: {
      data?: {
        awb_code?: string;
        courier_company_id?: number;
        courier_name?: string;
        shipment_id?: number;
      };
    };
  }>(
    "/courier/assign/awb",
    {
      method: "POST",
      body: JSON.stringify({
        shipment_id:
          shipmentId,
        courier_id:
          courierId,
      }),
    },
  );
}

export async function generateShiprocketPickup(
  shipmentId: number,
) {
  return request<{
    pickup_status?: number;
    response?: {
      pickup_scheduled_date?: string;
      pickup_token_number?: string;
      status?: number;
      others?: string;
    };
  }>(
    "/courier/generate/pickup",
    {
      method: "POST",
      body: JSON.stringify({
        shipment_id: [
          shipmentId,
        ],
      }),
    },
  );
}

export async function trackShiprocketAwb(
  awbCode: string,
) {
  return request<Record<
    string,
    unknown
  >>(
    `/courier/track/awb/${encodeURIComponent(
      awbCode,
    )}`,
  );
}

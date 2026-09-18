import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const API_BASE =
  "https://api.razorpay.com/v1";

function keyId() {
  return (
    process.env.RAZORPAY_KEY_ID ??
    ""
  ).trim();
}

function keySecret() {
  return (
    process.env.RAZORPAY_KEY_SECRET ??
    ""
  ).trim();
}

function webhookSecret() {
  return (
    process.env.RAZORPAY_WEBHOOK_SECRET ??
    ""
  ).trim();
}

function basicAuth() {
  const id = keyId();
  const secret = keySecret();

  return `Basic ${Buffer.from(
    `${id}:${secret}`,
  ).toString("base64")}`;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!isRazorpayConfigured()) {
    throw new Error(
      "Online payment gateway is not configured.",
    );
  }

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...init,
      headers: {
        Authorization: basicAuth(),
        "Content-Type":
          "application/json",
        ...(init.headers ?? {}),
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
      typeof data === "object"
        ? (data as Record<
            string,
            unknown
          >)
        : {};

    const nested =
      source.error &&
      typeof source.error ===
        "object"
        ? (source.error as Record<
            string,
            unknown
          >)
        : {};

    const description =
      String(
        nested.description ??
          nested.reason ??
          source.error ??
          "",
      ).trim();

    throw new Error(
      description ||
        "Payment provider request failed.",
    );
  }

  return data as T;
}

export function isRazorpayConfigured() {
  return Boolean(
    keyId() && keySecret(),
  );
}

export function getRazorpayKeyId() {
  return keyId();
}

export function isRazorpayWebhookConfigured() {
  return Boolean(
    webhookSecret(),
  );
}

export type RazorpayOrder = {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status:
    | "created"
    | "attempted"
    | "paid";
};

export async function createRazorpayOrder(
  input: {
    amountPaise: number;
    receipt: string;
    notes?: Record<
      string,
      string
    >;
  },
) {
  if (
    !Number.isInteger(
      input.amountPaise,
    ) ||
    input.amountPaise < 100
  ) {
    throw new Error(
      "Online payment amount is invalid.",
    );
  }

  return apiRequest<RazorpayOrder>(
    "/orders",
    {
      method: "POST",
      body: JSON.stringify({
        amount:
          input.amountPaise,
        currency: "INR",
        receipt:
          input.receipt.slice(
            0,
            40,
          ),
        notes:
          input.notes ?? {},
      }),
    },
  );
}

export type RazorpayPayment = {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status:
    | "created"
    | "authorized"
    | "captured"
    | "refunded"
    | "failed";
  order_id:
    | string
    | null;
  method:
    | "card"
    | "netbanking"
    | "wallet"
    | "upi"
    | "emi"
    | string;
  captured: boolean;
  error_code?: string | null;
  error_description?: string | null;
};

export async function fetchRazorpayPayment(
  paymentId: string,
) {
  return apiRequest<RazorpayPayment>(
    `/payments/${encodeURIComponent(
      paymentId,
    )}`,
  );
}

export async function refundRazorpayPayment(
  paymentId: string,
  amountPaise?: number,
) {
  const body =
    amountPaise &&
    Number.isInteger(
      amountPaise,
    ) &&
    amountPaise > 0
      ? {
          amount:
            amountPaise,
        }
      : {};

  return apiRequest<{
    id: string;
    payment_id: string;
    amount: number;
    status: string;
  }>(
    `/payments/${encodeURIComponent(
      paymentId,
    )}/refund`,
    {
      method: "POST",
      body:
        JSON.stringify(
          body,
        ),
    },
  );
}

function safeCompareHex(
  expected: string,
  received: string,
) {
  try {
    const left =
      Buffer.from(
        expected,
        "hex",
      );

    const right =
      Buffer.from(
        received,
        "hex",
      );

    return (
      left.length ===
        right.length &&
      left.length > 0 &&
      timingSafeEqual(
        left,
        right,
      )
    );
  } catch {
    return false;
  }
}

export function verifyRazorpayPaymentSignature(
  providerOrderId: string,
  paymentId: string,
  signature: string,
) {
  const secret =
    keySecret();

  if (!secret) {
    return false;
  }

  const expected =
    createHmac(
      "sha256",
      secret,
    )
      .update(
        `${providerOrderId}|${paymentId}`,
      )
      .digest("hex");

  return safeCompareHex(
    expected,
    signature,
  );
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
) {
  const secret =
    webhookSecret();

  if (!secret) {
    return false;
  }

  const expected =
    createHmac(
      "sha256",
      secret,
    )
      .update(rawBody)
      .digest("hex");

  return safeCompareHex(
    expected,
    signature,
  );
}

export function mapRazorpayMethod(
  method: string,
):
  | "UPI"
  | "CARD"
  | "NET_BANKING"
  | "WALLET"
  | null {
  switch (
    String(method).toLowerCase()
  ) {
    case "upi":
      return "UPI";
    case "card":
    case "emi":
      return "CARD";
    case "netbanking":
      return "NET_BANKING";
    case "wallet":
      return "WALLET";
    default:
      return null;
  }
}

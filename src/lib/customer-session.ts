import {
  createHmac,
  timingSafeEqual,
} from "crypto";

export const CUSTOMER_SESSION_COOKIE =
  "ar-fashions-customer-session";

function getSecret() {
  const secret =
    process.env.AR_FASHIONS_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "AR_FASHIONS_SESSION_SECRET is not configured.",
    );
  }

  return secret;
}

function createSignature(userId: string) {
  return createHmac(
    "sha256",
    getSecret(),
  )
    .update(userId)
    .digest("base64url");
}

export function createCustomerSessionToken(
  userId: string,
) {
  const signature =
    createSignature(userId);

  return `${userId}.${signature}`;
}

export function verifyCustomerSessionToken(
  token: string | undefined,
): string | null {
  if (!token) {
    return null;
  }

  const separator =
    token.lastIndexOf(".");

  if (separator <= 0) {
    return null;
  }

  const userId =
    token.slice(0, separator);

  const suppliedSignature =
    token.slice(separator + 1);

  if (
    !userId ||
    !suppliedSignature
  ) {
    return null;
  }

  const expectedSignature =
    createSignature(userId);

  const supplied =
    Buffer.from(
      suppliedSignature,
      "utf8",
    );

  const expected =
    Buffer.from(
      expectedSignature,
      "utf8",
    );

  if (
    supplied.length !==
    expected.length
  ) {
    return null;
  }

  if (
    !timingSafeEqual(
      supplied,
      expected,
    )
  ) {
    return null;
  }

  return userId;
}

export const CUSTOMER_SESSION_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure:
    process.env.NODE_ENV ===
    "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

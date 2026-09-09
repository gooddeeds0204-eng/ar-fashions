import {
  createHmac,
  timingSafeEqual,
} from "crypto";

export const CUSTOMER_SESSION_COOKIE =
  "ar-fashions-customer-session";

const SESSION_SECONDS =
  60 * 60 * 24 * 30;

/*
 * Temporary migration window for
 * legacy customer tokens:
 *
 *   userId.signature
 *
 * After this date only expiring
 * 3-part tokens are accepted.
 */
const LEGACY_SESSION_ACCEPT_UNTIL =
  Math.floor(
    Date.parse(
      "2026-10-10T00:00:00Z",
    ) / 1000,
  );

function getSecret() {
  const secret =
    process.env
      .AR_FASHIONS_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "AR_FASHIONS_SESSION_SECRET is not configured.",
    );
  }

  return secret;
}

/*
 * Legacy signature.
 * Keep only for temporary migration.
 */
function signLegacy(
  userId: string,
) {
  return createHmac(
    "sha256",
    getSecret(),
  )
    .update(userId)
    .digest("base64url");
}

/*
 * New versioned-style signature.
 * Prefix prevents cross-purpose
 * signature reuse.
 */
function sign(
  payload: string,
) {
  return createHmac(
    "sha256",
    getSecret(),
  )
    .update(
      `customer:${payload}`,
    )
    .digest("base64url");
}

function signaturesMatch(
  suppliedSignature: string,
  expectedSignature: string,
) {
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
    return false;
  }

  return timingSafeEqual(
    supplied,
    expected,
  );
}

export type CustomerSessionVerification = {
  userId: string;
  legacy: boolean;
};

export function createCustomerSessionToken(
  userId: string,
) {
  const issuedAt =
    Math.floor(
      Date.now() / 1000,
    );

  const payload =
    `${userId}.${issuedAt}`;

  return `${payload}.${sign(payload)}`;
}

export function inspectCustomerSessionToken(
  token: string | undefined,
): CustomerSessionVerification | null {
  try {
    if (!token) {
      return null;
    }

    const parts =
      token.split(".");

    /*
     * New token:
     *
     * userId.issuedAt.signature
     */
    if (parts.length === 3) {
      const [
        userId,
        issuedAtRaw,
        suppliedSignature,
      ] = parts;

      const issuedAt =
        Number(issuedAtRaw);

      if (
        !userId ||
        !Number.isInteger(
          issuedAt,
        ) ||
        !suppliedSignature
      ) {
        return null;
      }

      const now =
        Math.floor(
          Date.now() / 1000,
        );

      /*
       * Reject tokens from too far
       * in the future and tokens
       * older than 30 days.
       */
      if (
        issuedAt > now + 60 ||
        now - issuedAt >
          SESSION_SECONDS
      ) {
        return null;
      }

      const payload =
        `${userId}.${issuedAt}`;

      const expectedSignature =
        sign(payload);

      if (
        !signaturesMatch(
          suppliedSignature,
          expectedSignature,
        )
      ) {
        return null;
      }

      return {
        userId,
        legacy: false,
      };
    }

    /*
     * Legacy token:
     *
     * userId.signature
     *
     * Accepted only during the
     * temporary migration window.
     */
    if (parts.length === 2) {
      const now =
        Math.floor(
          Date.now() / 1000,
        );

      if (
        now >
        LEGACY_SESSION_ACCEPT_UNTIL
      ) {
        return null;
      }

      const [
        userId,
        suppliedSignature,
      ] = parts;

      if (
        !userId ||
        !suppliedSignature
      ) {
        return null;
      }

      const expectedSignature =
        signLegacy(userId);

      if (
        !signaturesMatch(
          suppliedSignature,
          expectedSignature,
        )
      ) {
        return null;
      }

      return {
        userId,
        legacy: true,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function verifyCustomerSessionToken(
  token: string | undefined,
): string | null {
  return (
    inspectCustomerSessionToken(
      token,
    )?.userId ?? null
  );
}

export const CUSTOMER_SESSION_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure:
    process.env.NODE_ENV ===
    "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};

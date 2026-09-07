import {
  createHmac,
  timingSafeEqual,
} from "crypto";

export const ADMIN_SESSION_COOKIE =
  "ar-fashions-admin-session";

const SESSION_SECONDS =
  60 * 60 * 8;

function getSecret() {
  const secret =
    process.env
      .AR_FASHIONS_ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "AR_FASHIONS_ADMIN_SESSION_SECRET is not configured.",
    );
  }

  return secret;
}

function sign(payload: string) {
  return createHmac(
    "sha256",
    getSecret(),
  )
    .update(`admin:${payload}`)
    .digest("base64url");
}

export function createAdminSessionToken(
  userId: string,
) {
  const issuedAt =
    Math.floor(Date.now() / 1000);

  const payload =
    `${userId}.${issuedAt}`;

  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
): string | null {
  try {
    if (!token) return null;

    const parts =
      token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const [
      userId,
      issuedAtRaw,
      suppliedSignature,
    ] = parts;

    const issuedAt =
      Number(issuedAtRaw);

    if (
      !userId ||
      !Number.isInteger(issuedAt)
    ) {
      return null;
    }

    const now =
      Math.floor(Date.now() / 1000);

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
  } catch {
    return null;
  }
}

export const ADMIN_SESSION_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure:
    process.env.NODE_ENV ===
    "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};

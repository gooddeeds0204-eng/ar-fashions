import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "crypto";

const RESET_SECONDS =
  60 * 30;

function secret() {
  const value =
    process.env
      .AR_FASHIONS_SESSION_SECRET;

  if (!value) {
    throw new Error(
      "AR_FASHIONS_SESSION_SECRET is not configured.",
    );
  }

  return value;
}

function signature(
  userId: string,
  expiresAt: number,
  passwordHash: string,
) {
  return createHmac(
    "sha256",
    secret(),
  )
    .update(
      `password-reset:${userId}:${expiresAt}:${passwordHash}`,
    )
    .digest("base64url");
}

function same(
  supplied: string,
  expected: string,
) {
  const a = Buffer.from(
    supplied,
    "utf8",
  );
  const b = Buffer.from(
    expected,
    "utf8",
  );

  return (
    a.length === b.length &&
    timingSafeEqual(a, b)
  );
}

export function createPasswordResetToken(
  userId: string,
  passwordHash: string,
) {
  const expiresAt =
    Math.floor(
      Date.now() / 1000,
    ) + RESET_SECONDS;

  const sig = signature(
    userId,
    expiresAt,
    passwordHash,
  );

  return `${userId}.${expiresAt}.${sig}`;
}

export function inspectPasswordResetToken(
  token: string,
  passwordHash: string,
) {
  const [
    userId,
    expiresRaw,
    supplied,
  ] = String(token || "").split(
    ".",
  );

  const expiresAt =
    Number(expiresRaw);

  if (
    !userId ||
    !Number.isInteger(expiresAt) ||
    !supplied
  ) {
    return null;
  }

  const now =
    Math.floor(
      Date.now() / 1000,
    );

  if (
    expiresAt <= now ||
    expiresAt >
      now + RESET_SECONDS + 60
  ) {
    return null;
  }

  const expected =
    signature(
      userId,
      expiresAt,
      passwordHash,
    );

  if (
    !same(
      supplied,
      expected,
    )
  ) {
    return null;
  }

  return {
    userId,
    expiresAt,
  };
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  const apiKey =
    process.env.RESEND_API_KEY;
  const from =
    process.env
      .PASSWORD_RESET_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      configured: false,
      sent: false,
    };
  }

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject:
            "Reset your AS Fashions password",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#211C18">
              <h2 style="color:#031B14">AS Fashions</h2>
              <p>We received a request to reset your password.</p>
              <p>
                <a href="${resetUrl}" style="display:inline-block;background:#031B14;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">
                  Reset Password
                </a>
              </p>
              <p style="font-size:13px;color:#6b625a">This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>
            </div>
          `,
        }),
      },
    );

  return {
    configured: true,
    sent: response.ok,
  };
}

import "server-only";

import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RateLimitOptions = {
  scope: string;
  limit: number;
  windowSeconds: number;
};

/*
 * Browser-facing public write APIs
 * must use JSON and come from the
 * same website origin.
 */
export function requireSameOriginJson(
  request: Request,
) {
  const contentType =
    request.headers
      .get("content-type")
      ?.toLowerCase() ?? "";

  if (
    !contentType.startsWith(
      "application/json",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "JSON request required.",
      },
      {
        status: 415,
      },
    );
  }

  const fetchSite =
    request.headers.get(
      "sec-fetch-site",
    );

  if (
    fetchSite === "cross-site"
  ) {
    return NextResponse.json(
      {
        error:
          "Cross-site request blocked.",
      },
      {
        status: 403,
      },
    );
  }

  const origin =
    request.headers.get(
      "origin",
    );

  if (!origin) {
    return NextResponse.json(
      {
        error:
          "Request origin is required.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const suppliedOrigin =
      new URL(origin);

    const requestHost =
      request.headers
        .get("host")
        ?.trim();

    const forwardedHost =
      request.headers
        .get("x-forwarded-host")
        ?.split(",")[0]
        ?.trim();

    const expectedHost =
      requestHost ||
      forwardedHost ||
      new URL(request.url).host;

    if (
      !expectedHost ||
      suppliedOrigin.host !==
        expectedHost
    ) {
      return NextResponse.json(
        {
          error:
            "Cross-origin request blocked.",
        },
        {
          status: 403,
        },
      );
    }

    const forwardedProto =
      request.headers
        .get("x-forwarded-proto")
        ?.split(",")[0]
        ?.trim()
        .toLowerCase();

    const expectedProtocol =
      forwardedProto
        ? `${forwardedProto}:`
        : new URL(
            request.url,
          ).protocol;

    if (
      suppliedOrigin.protocol !==
      expectedProtocol
    ) {
      return NextResponse.json(
        {
          error:
            "Cross-origin request blocked.",
        },
        {
          status: 403,
        },
      );
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid request origin.",
      },
      {
        status: 403,
      },
    );
  }

  return null;
}

function getRateLimitSecret() {
  const secret =
    process.env
      .AR_FASHIONS_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "Rate-limit secret is not configured.",
    );
  }

  return secret;
}

/*
 * Store only an HMAC fingerprint.
 * Raw client IP addresses are never
 * written to the database.
 */
function getClientFingerprint(
  request: Request,
) {
  const forwarded =
    request.headers.get(
      "x-vercel-forwarded-for",
    ) ||
    request.headers.get(
      "x-forwarded-for",
    ) ||
    request.headers.get(
      "x-real-ip",
    );

  const clientAddress =
    forwarded
      ?.split(",")[0]
      ?.trim() ||
    "unknown";

  const fallbackAgent =
    clientAddress === "unknown"
      ? request.headers.get(
          "user-agent",
        ) || "unknown"
      : "";

  return createHmac(
    "sha256",
    getRateLimitSecret(),
  )
    .update(
      `public-rate:${clientAddress}:${fallbackAgent}`,
    )
    .digest("base64url");
}

export async function enforcePublicRateLimit(
  request: Request,
  options: RateLimitOptions,
) {
  const {
    scope,
    limit,
    windowSeconds,
  } = options;

  if (
    !scope ||
    !Number.isInteger(limit) ||
    limit <= 0 ||
    !Number.isInteger(
      windowSeconds,
    ) ||
    windowSeconds <= 0
  ) {
    throw new Error(
      "Invalid rate-limit configuration.",
    );
  }

  const fingerprint =
    getClientFingerprint(
      request,
    );

  const key =
    `${scope}:${fingerprint}`;

  const rows =
    await prisma.$queryRaw<
      Array<{
        count: number;
        expiresAt: Date;
      }>
    >`
      INSERT INTO "ApiRateLimit"
        (
          "key",
          "windowStart",
          "count",
          "expiresAt",
          "updatedAt"
        )
      VALUES
        (
          ${key},
          NOW(),
          1,
          NOW() +
            (
              ${windowSeconds} *
              INTERVAL '1 second'
            ),
          NOW()
        )

      ON CONFLICT ("key")
      DO UPDATE SET
        "count" =
          CASE
            WHEN
              "ApiRateLimit"."expiresAt"
              <= NOW()
            THEN 1
            ELSE
              "ApiRateLimit"."count" + 1
          END,

        "windowStart" =
          CASE
            WHEN
              "ApiRateLimit"."expiresAt"
              <= NOW()
            THEN NOW()
            ELSE
              "ApiRateLimit"."windowStart"
          END,

        "expiresAt" =
          CASE
            WHEN
              "ApiRateLimit"."expiresAt"
              <= NOW()
            THEN
              NOW() +
              (
                ${windowSeconds} *
                INTERVAL '1 second'
              )
            ELSE
              "ApiRateLimit"."expiresAt"
          END,

        "updatedAt" =
          NOW()

      RETURNING
        "count",
        "expiresAt"
    `;

  const row =
    rows[0];

  if (!row) {
    throw new Error(
      "Rate-limit check failed.",
    );
  }

  if (row.count <= limit) {
    return null;
  }

  const retryAfter =
    Math.max(
      1,
      Math.ceil(
        (
          new Date(
            row.expiresAt,
          ).getTime() -
          Date.now()
        ) / 1000,
      ),
    );

  return NextResponse.json(
    {
      error:
        "Too many requests. Please try again shortly.",
    },
    {
      status: 429,
      headers: {
        "Retry-After":
          String(retryAfter),
      },
    },
  );
}

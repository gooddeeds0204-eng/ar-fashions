import "server-only";

import {
  createHash,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify,
} from "node:crypto";

export const GOOGLE_FLOW_COOKIE = "asf-google-oauth-flow";
export const GOOGLE_FLOW_MAX_AGE = 600;
const DEFAULT_REDIRECT = "https://www.asfashionsonline.com/api/auth/google/callback";

export type GoogleFlow = {
  state: string;
  verifier: string;
  nonce: string;
  issuedAt: number;
  mode: "signin" | "link";
};

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() || DEFAULT_REDIRECT;

  if (!clientId || !clientSecret || !/^https:\/\/[^/]+\/api\/auth\/google\/callback$/.test(redirectUri)) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

export function randomValue() {
  return randomBytes(32).toString("base64url");
}

export function generateGoogleFlow(mode: GoogleFlow["mode"]): GoogleFlow {
  return {
    state: randomValue(),
    verifier: randomValue(),
    nonce: randomValue(),
    issuedAt: Date.now(),
    mode,
  };
}

export function googleAuthorizationUrl(
  flow: GoogleFlow,
  config: NonNullable<ReturnType<typeof googleConfig>>,
) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: createHash("sha256").update(flow.verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
}

export function encodeFlow(flow: GoogleFlow) {
  return Buffer.from(JSON.stringify(flow)).toString("base64url");
}

export function readFlow(raw: string | undefined): GoogleFlow | null {
  try {
    if (!raw || raw.length > 2000) return null;
    const flow = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as GoogleFlow;
    if (
      !flow ||
      !/^[A-Za-z0-9_-]{43}$/.test(flow.state) ||
      !/^[A-Za-z0-9_-]{43}$/.test(flow.verifier) ||
      !/^[A-Za-z0-9_-]{43}$/.test(flow.nonce) ||
      (flow.mode !== "signin" && flow.mode !== "link") ||
      !Number.isFinite(flow.issuedAt) ||
      Date.now() - flow.issuedAt > GOOGLE_FLOW_MAX_AGE * 1000 ||
      Date.now() - flow.issuedAt < -60000
    ) return null;
    return flow;
  } catch {
    return null;
  }
}

export function matchesState(expected: string, actual: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(actual)) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

type GoogleClaims = {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  azp?: string;
  exp?: number;
  iat?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  hd?: string;
};

export type GoogleIdentity = { sub: string; email: string; name: string };

export async function exchangeGoogleCode(
  code: string,
  verifier: string,
  config: NonNullable<ReturnType<typeof googleConfig>>,
) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code_verifier: verifier,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("GOOGLE_TOKEN_EXCHANGE_FAILED");
  const tokens = await response.json() as { id_token?: unknown };
  if (typeof tokens.id_token !== "string") throw new Error("GOOGLE_ID_TOKEN_MISSING");
  return tokens.id_token;
}

export async function verifyGoogleIdentity(
  idToken: string,
  expectedNonce: string,
  clientId: string,
): Promise<GoogleIdentity> {
  const pieces = idToken.split(".");
  if (pieces.length !== 3) throw new Error("INVALID_GOOGLE_TOKEN");

  const [encodedHeader, encodedPayload, signature] = pieces;
  if (encodedHeader.length > 2048 || encodedPayload.length > 8192 || signature.length > 2048) {
    throw new Error("INVALID_GOOGLE_TOKEN");
  }

  const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as {
    alg?: string; kid?: string;
  };
  if (header.alg !== "RS256" || !header.kid || header.kid.length > 256) {
    throw new Error("INVALID_GOOGLE_TOKEN_HEADER");
  }

  const jwksResponse = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(12000),
  });
  if (!jwksResponse.ok) throw new Error("GOOGLE_CERTIFICATES_UNAVAILABLE");

  const jwks = await jwksResponse.json() as {
    keys?: Array<JsonWebKey & { kid?: string; kty?: string; alg?: string; use?: string }>;
  };
  const jwk = jwks.keys?.find((key) =>
    key.kid === header.kid &&
    key.kty === "RSA" &&
    (!key.alg || key.alg === "RS256") &&
    (!key.use || key.use === "sig")
  );
  if (!jwk) throw new Error("GOOGLE_SIGNING_KEY_NOT_FOUND");

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const isValid = verify(
    "RSA-SHA256",
    Buffer.from(encodedHeader + "." + encodedPayload),
    publicKey,
    Buffer.from(signature, "base64url"),
  );
  if (!isValid) throw new Error("GOOGLE_SIGNATURE_INVALID");

  const claims = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as GoogleClaims;
  const now = Math.floor(Date.now() / 1000);
  if (
    (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") ||
    claims.aud !== clientId ||
    (claims.azp && claims.azp !== clientId) ||
    typeof claims.exp !== "number" || claims.exp <= now ||
    typeof claims.iat !== "number" || claims.iat > now + 60 ||
    claims.nonce !== expectedNonce ||
    claims.email_verified !== true && claims.email_verified !== "true" ||
    typeof claims.sub !== "string" || claims.sub.length < 5 ||
    typeof claims.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)
  ) throw new Error("GOOGLE_IDENTITY_VALIDATION_FAILED");

  return {
    sub: claims.sub,
    email: claims.email.trim().toLowerCase(),
    name: (typeof claims.name === "string" ? claims.name.trim() : "").slice(0, 160),
  };
}

export function googleIdentityKey(subject: string) {
  return "google_signin_v1_" + createHash("sha256").update(subject).digest("hex");
}

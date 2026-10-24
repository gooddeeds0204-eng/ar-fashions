import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_OPTIONS,
  createCustomerSessionToken,
} from "@/lib/customer-session";
import {
  GOOGLE_FLOW_COOKIE,
  exchangeGoogleCode,
  googleConfig,
  googleIdentityKey,
  matchesState,
  readFlow,
  verifyGoogleIdentity,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

function redirect(request: NextRequest, status: string) {
  const response = NextResponse.redirect(
    new URL("/login?google=" + encodeURIComponent(status), request.url),
    303,
  );
  return clearFlow(response);
}

function clearFlow(response: NextResponse) {
  response.cookies.set({
    name: GOOGLE_FLOW_COOKIE,
    value: "",
    path: "/api/auth/google",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  const config = googleConfig();
  const flow = readFlow(request.cookies.get(GOOGLE_FLOW_COOKIE)?.value);
  if (!config || !flow) return redirect(request, "expired");

  const error = request.nextUrl.searchParams.get("error");
  if (error) return redirect(request, error === "access_denied" ? "cancelled" : "provider_error");

  const state = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  if (!matchesState(flow.state, state) || !code || code.length > 4096) {
    return redirect(request, "invalid_state");
  }

  try {
    const idToken = await exchangeGoogleCode(code, flow.verifier, config);
    const identity = await verifyGoogleIdentity(idToken, flow.nonce, config.clientId);
    const key = googleIdentityKey(identity.sub);
    const current = flow.mode === "link"
      ? await getAuthenticatedCustomer()
      : null;

    if (flow.mode === "link" && (!current || current.email?.toLowerCase() !== identity.email)) {
      return redirect(request, "link_email_mismatch");
    }

    const user = await prisma.$transaction(async (tx) => {
      const mapping = await tx.siteSetting.findUnique({
        where: { key },
        select: { value: true },
      });

      if (mapping) {
        const saved = await tx.user.findUnique({ where: { id: mapping.value } });
        if (!saved || saved.role === "ADMIN" || saved.status !== "ACTIVE") {
          throw new Error("GOOGLE_ACCOUNT_UNAVAILABLE");
        }
        if (flow.mode === "link" && saved.id !== current?.id) {
          throw new Error("GOOGLE_ALREADY_LINKED");
        }
        return saved;
      }

      if (flow.mode === "link" && current) {
        const account = await tx.user.findUnique({ where: { id: current.id } });
        if (!account || account.role === "ADMIN" || account.status !== "ACTIVE" ||
            account.email?.toLowerCase() !== identity.email) {
          throw new Error("GOOGLE_LINK_FORBIDDEN");
        }
        await tx.siteSetting.create({ data: { key, value: account.id } });
        return account;
      }

      const existing = await tx.user.findUnique({ where: { email: identity.email } });
      if (existing) {
        // Never take over a password account by email alone.
        // Sign in with password, then explicitly link Google in My Account.
        throw new Error("GOOGLE_EXISTING_ACCOUNT");
      }

      const created = await tx.user.create({
        data: {
          name: identity.name || identity.email.split("@")[0],
          email: identity.email,
          phone: null,
          passwordHash: null,
          role: "CUSTOMER",
          status: "ACTIVE",
          isReseller: false,
        },
      });
      await tx.siteSetting.create({ data: { key, value: created.id } });
      return created;
    });

    const destination = flow.mode === "link"
      ? "/account?google=linked"
      : "/";
    const response = NextResponse.redirect(new URL(destination, request.url), 303);
    response.cookies.set(
      CUSTOMER_SESSION_COOKIE,
      createCustomerSessionToken(user.id),
      CUSTOMER_SESSION_OPTIONS,
    );
    return clearFlow(response);
  } catch (error) {
    // No Google tokens or identity details are emitted in logs or redirects.
    if (error instanceof Error && error.message === "GOOGLE_EXISTING_ACCOUNT") {
      return redirect(request, "existing_account");
    }
    if (error instanceof Error && error.message === "GOOGLE_ALREADY_LINKED") {
      return redirect(request, "already_linked");
    }
    if (error instanceof Error && (error.message === "GOOGLE_ACCOUNT_UNAVAILABLE" ||
      error.message === "GOOGLE_LINK_FORBIDDEN")) {
      return redirect(request, "account_unavailable");
    }
    console.error("Google sign-in failed", error instanceof Error ? error.message : "unknown");
    return redirect(request, "failed");
  }
}

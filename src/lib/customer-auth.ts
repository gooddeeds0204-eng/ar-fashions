import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_OPTIONS,
  createCustomerSessionToken,
  inspectCustomerSessionToken,
} from "@/lib/customer-session";

export async function getAuthenticatedCustomer() {
  const cookieStore =
    await cookies();

  const verification =
    inspectCustomerSessionToken(
      cookieStore.get(
        CUSTOMER_SESSION_COOKIE,
      )?.value,
    );

  if (!verification) {
    return null;
  }

  const user =
    await prisma.user.findFirst({
      where: {
        id: verification.userId,
        status: "ACTIVE",
        NOT: {
          role: "ADMIN",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isReseller: true,
      },
    });

  if (!user) {
    return null;
  }

  /*
   * Transparently replace an old
   * non-expiring token with the
   * new 30-day expiring format.
   */
  if (verification.legacy) {
    cookieStore.set(
      CUSTOMER_SESSION_COOKIE,
      createCustomerSessionToken(
        user.id,
      ),
      CUSTOMER_SESSION_OPTIONS,
    );
  }

  return user;
}

export async function getAuthenticatedCustomerId() {
  const user =
    await getAuthenticatedCustomer();

  return user?.id ?? null;
}

import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  verifyCustomerSessionToken,
} from "@/lib/customer-session";

export async function getAuthenticatedCustomer() {
  const cookieStore =
    await cookies();

  const userId =
    verifyCustomerSessionToken(
      cookieStore.get(
        CUSTOMER_SESSION_COOKIE,
      )?.value,
    );

  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
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
}

export async function getAuthenticatedCustomerId() {
  const user =
    await getAuthenticatedCustomer();

  return user?.id ?? null;
}

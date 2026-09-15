import "server-only";

import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedAdmin,
} from "@/lib/admin-auth";
import {
  getAuthenticatedCustomer,
} from "@/lib/customer-auth";

export async function getSalesAccess() {
  const admin =
    await getAuthenticatedAdmin();

  const customer = admin
    ? null
    : await getAuthenticatedCustomer();

  const salesMode =
    await prisma.salesMode.findFirst({
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        retailStatus: true,
        resellerStatus: true,
        retailMessage: true,
        resellerMessage: true,
      },
    });

  const retailStatus =
    salesMode?.retailStatus ??
    "OPEN";

  const resellerStatus =
    salesMode?.resellerStatus ??
    "OPEN";

  return {
    isAdmin: Boolean(admin),
    isCustomer: Boolean(customer),

    isReseller:
      customer?.isReseller === true,

    retailStatus,
    resellerStatus,

    retailOpen:
      retailStatus === "OPEN",

    resellerOpen:
      resellerStatus === "OPEN",

    retailMessage:
      salesMode?.retailMessage ??
      "Retail shopping is open.",

    resellerMessage:
      salesMode?.resellerMessage ??
      "Reseller orders are open.",
  };
}

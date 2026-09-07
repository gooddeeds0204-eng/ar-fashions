import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

export async function getAuthenticatedAdmin() {
  const cookieStore =
    await cookies();

  const userId =
    verifyAdminSessionToken(
      cookieStore.get(
        ADMIN_SESSION_COOKIE,
      )?.value,
    );

  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      role: "ADMIN",
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

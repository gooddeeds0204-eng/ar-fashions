"use client";

import { getUserId, setUserId } from "@/lib/user-session";

let initializationPromise: Promise<string | null> | null = null;

export async function ensureUserSession(): Promise<string | null> {
  const existingUserId = getUserId();

  if (existingUserId) {
    return existingUserId;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const response = await fetch("/api/session", {
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      const userId =
        typeof data?.user?.id === "string"
          ? data.user.id
          : null;

      if (userId) {
        setUserId(userId);
      }

      return userId;
    } catch (error) {
      console.error(
        "User session initialization failed:",
        error,
      );

      return null;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

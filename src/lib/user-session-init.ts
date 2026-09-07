"use client";

import {
  clearUserId,
  setUserId,
} from "@/lib/user-session";

let initializationPromise:
  Promise<string | null> | null =
  null;

export async function ensureUserSession():
  Promise<string | null> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise =
    (async () => {
      try {
        const response =
          await fetch(
            "/api/session",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        if (!response.ok) {
          clearUserId();
          return null;
        }

        const data =
          await response.json();

        const userId =
          typeof data?.user?.id ===
          "string"
            ? data.user.id
            : null;

        if (userId) {
          setUserId(userId);
        } else {
          clearUserId();
        }

        return userId;
      } catch (error) {
        clearUserId();

        console.error(
          "User session initialization failed:",
          error,
        );

        return null;
      } finally {
        initializationPromise =
          null;
      }
    })();

  return initializationPromise;
}

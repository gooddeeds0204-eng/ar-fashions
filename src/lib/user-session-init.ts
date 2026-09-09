"use client";

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
          return null;
        }

        const data =
          await response.json();

        return typeof data?.user?.id ===
          "string"
          ? data.user.id
          : null;
      } catch (error) {
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

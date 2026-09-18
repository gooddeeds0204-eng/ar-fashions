"use client";

import {
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

export default function ResellerDashboardActions() {
  const router =
    useRouter();

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  async function logout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      const response =
        await fetch(
          "/api/auth/logout",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify(
              {},
            ),
          },
        );

      if (!response.ok) {
        throw new Error(
          "Logout failed.",
        );
      }

      try {
        localStorage.removeItem(
          "ar-fashions-cart",
        );
      } catch {
        // Ignore unavailable storage.
      }

      router.replace(
        "/login",
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Reseller logout failed:",
        error,
      );

      window.alert(
        "Could not log out. Please try again.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  const actions = [
    {
      title: "My Account",
      subtitle:
        "Profile & addresses",
      icon: "AR",
      onClick: () =>
        router.push(
          "/account",
        ),
    },
    {
      title: "My Orders",
      subtitle:
        "Track wholesale orders",
      icon: "✓",
      onClick: () =>
        router.push(
          "/my-orders",
        ),
    },
    {
      title:
        "Wholesale Sets",
      subtitle:
        "Curated reseller packs",
      icon: "◆",
      onClick: () =>
        router.push(
          "/reseller-sets",
        ),
    },
  ];

  return (
    <section className="mt-5">
      <div className="grid grid-cols-3 gap-2.5">
        {actions.map(
          (action) => (
            <button
              key={
                action.title
              }
              type="button"
              onClick={
                action.onClick
              }
              className="rounded-[1.35rem] border border-black/[0.05] bg-white p-3.5 text-left shadow-sm transition active:scale-[0.98]"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#031B14] text-[9px] font-black text-emerald-200">
                {
                  action.icon
                }
              </div>

              <p className="mt-3 text-[10px] font-black">
                {
                  action.title
                }
              </p>

              <p className="mt-1 text-[7px] font-semibold leading-3 text-zinc-400">
                {
                  action.subtitle
                }
              </p>
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={logout}
        disabled={
          loggingOut
        }
        className="mt-3 flex w-full items-center justify-between rounded-[1.25rem] border border-red-100 bg-white px-4 py-3.5 text-left shadow-sm disabled:opacity-60"
      >
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-red-600">
            {loggingOut
              ? "Signing Out"
              : "Logout"}
          </p>

          <p className="mt-1 text-[8px] font-semibold text-zinc-400">
            End this reseller session securely
          </p>
        </div>

        <span className="grid h-9 w-9 place-items-center rounded-full bg-red-50 text-sm font-black text-red-500">
          →
        </span>
      </button>
    </section>
  );
}

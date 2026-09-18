"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/auth/login",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              identifier:
                identifier.trim(),
              password,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to login.",
        );
      }

      const applicationStatus =
        data.user
          ?.resellerApplicationStatus;

      if (
        applicationStatus ===
          "PENDING" ||
        applicationStatus ===
          "REJECTED"
      ) {
        router.replace(
          "/reseller-status",
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to login.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 py-6 text-[#211C18]">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col">
        <header className="flex items-center justify-between">
          <BrandLogo
            light
            compact
            onClick={() =>
              router.push("/")
            }
          />

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="rounded-full border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-2 text-[9px] font-black uppercase tracking-wider text-[#7B7066]"
          >
            Close
          </button>
        </header>

        <section className="my-auto py-10">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">
            Welcome Back
          </p>

          <h1 className="mt-4 font-serif text-5xl leading-[0.95]">
            Your AR
            <br />
            wardrobe awaits.
          </h1>

          <p className="mt-5 max-w-sm text-sm leading-6 text-[#7B7066]">
            Login to access your
            orders, wishlist, saved
            addresses and approved
            reseller pricing.
          </p>

          <form
            onSubmit={submit}
            className="mt-9 space-y-4"
          >
            <label className="block">
              <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] text-[#7B7066]">
                Mobile or Email
              </span>

              <input
                value={identifier}
                onChange={(event) =>
                  setIdentifier(
                    event.target.value,
                  )
                }
                autoComplete="username"
                placeholder="Enter mobile number or email"
                className="w-full rounded-2xl border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-4 text-sm text-[#211C18] outline-none placeholder:text-[#7B7066] focus:border-[#D4AF37]/60"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] text-[#7B7066]">
                Password
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                autoComplete="current-password"
                placeholder="Your password"
                className="w-full rounded-2xl border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-4 text-sm text-[#211C18] outline-none placeholder:text-[#7B7066] focus:border-[#D4AF37]/60"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-xs font-semibold leading-5 text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                loading ||
                !identifier.trim() ||
                !password
              }
              className="w-full rounded-2xl bg-white py-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#031B14] transition active:scale-[0.99] disabled:opacity-40"
            >
              {loading
                ? "Signing In..."
                : "Sign In →"}
            </button>
          </form>

          <div className="mt-7 rounded-[1.5rem] border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06] p-5">
            <p className="text-[10px] font-black text-[#211C18]">
              New to AS Fashions?
            </p>

            <p className="mt-1 text-[10px] leading-5 text-[#7B7066]">
              Create a normal customer
              account or apply for a
              retailer account.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/signup",
                )
              }
              className="mt-4 rounded-full border border-[#D4AF37]/25 px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-[#D9C29A]"
            >
              Create Account →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

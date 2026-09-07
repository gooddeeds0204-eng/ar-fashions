"use client";

import {
  FormEvent,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const [email, setEmail] =
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
          "/api/admin/login",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              email:
                email.trim(),
              password,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Login failed.",
        );
      }

      const requested =
        searchParams.get(
          "next",
        );

      const destination =
        requested &&
        requested.startsWith(
          "/admin",
        ) &&
        requested !==
          "/admin/login"
          ? requested
          : "/admin";

      router.replace(
        destination,
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Login failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] p-4 text-[#172033]">
      <section className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
            Admin Panel
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight">
            AR{" "}
            <span className="text-emerald-600">
              FASHIONS
            </span>
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Secure administrator login
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-8 space-y-5"
        >
          <div>
            <label className="text-xs font-bold">
              Admin Email
            </label>

            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3.5 text-sm outline-none focus:border-emerald-600"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-bold">
              Password
            </label>

            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3.5 text-sm outline-none focus:border-emerald-600"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}

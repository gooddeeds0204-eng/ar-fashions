"use client";

import {
  FormEvent,
  Suspense,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

function ResetPasswordContent() {
  const router =
    useRouter();
  const searchParams =
    useSearchParams();

  const token =
    searchParams.get(
      "token",
    ) || "";

  const [
    password,
    setPassword,
  ] = useState("");
  const [
    confirm,
    setConfirm,
  ] = useState("");
  const [
    loading,
    setLoading,
  ] = useState(false);
  const [
    error,
    setError,
  ] = useState("");
  const [
    complete,
    setComplete,
  ] = useState(false);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError("");

    if (
      password.length < 8
    ) {
      setError(
        "Password must contain at least 8 characters.",
      );
      return;
    }

    if (
      password !== confirm
    ) {
      setError(
        "Passwords do not match.",
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/auth/reset-password",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              token,
              password,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to reset password.",
        );
      }

      setComplete(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to reset password.",
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
            compact
            onClick={() =>
              router.push("/")
            }
          />
        </header>

        <section className="my-auto py-10">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">
            Secure Reset
          </p>

          <h1 className="mt-4 font-serif text-5xl leading-[0.95]">
            Create a new
            <br />
            password.
          </h1>

          {!token ? (
            <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              This reset link is invalid. Request a new password reset link.
            </div>
          ) : complete ? (
            <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-black text-emerald-800">
                Password updated ✅
              </p>
              <p className="mt-2 text-xs leading-5 text-emerald-700">
                Your old reset link is now invalid. Sign in using the new password.
              </p>
              <button
                type="button"
                onClick={() =>
                  router.replace(
                    "/login",
                  )
                }
                className="mt-4 w-full rounded-xl bg-[#031B14] py-3 text-[10px] font-black uppercase tracking-wider text-white"
              >
                Go to Login →
              </button>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="mt-8 space-y-4"
            >
              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] text-[#7B7066]">
                  New Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-2xl border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-4 text-sm outline-none focus:border-[#D4AF37]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] text-[#7B7066]">
                  Confirm Password
                </span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(event) =>
                    setConfirm(
                      event.target.value,
                    )
                  }
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                  className="w-full rounded-2xl border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-4 text-sm outline-none focus:border-[#D4AF37]"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold leading-5 text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  loading ||
                  password.length < 8 ||
                  confirm.length < 8
                }
                className="w-full rounded-2xl bg-[#031B14] py-4 text-[11px] font-black uppercase tracking-[0.12em] text-white disabled:bg-[#E7E1D8] disabled:text-[#6F675F]"
              >
                {loading
                  ? "Updating..."
                  : "Update Password →"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}


export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAF7F0] p-6 text-[#211C18]">
          <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center text-sm">
            Loading secure reset...
          </div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

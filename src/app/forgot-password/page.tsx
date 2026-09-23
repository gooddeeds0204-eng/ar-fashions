"use client";

import {
  FormEvent,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

export default function ForgotPasswordPage() {
  const router =
    useRouter();

  const [
    identifier,
    setIdentifier,
  ] = useState("");
  const [
    loading,
    setLoading,
  ] = useState(false);
  const [
    message,
    setMessage,
  ] = useState("");
  const [
    error,
    setError,
  ] = useState("");

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/auth/forgot-password",
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
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to continue.",
        );
      }

      setMessage(
        data.message ||
          "Check your registered email for a password reset link.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to continue.",
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

          <button
            type="button"
            onClick={() =>
              router.push(
                "/login",
              )
            }
            className="rounded-full border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-2 text-[9px] font-black uppercase tracking-wider text-[#7B7066]"
          >
            Back
          </button>
        </header>

        <section className="my-auto py-10">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">
            Account Recovery
          </p>

          <h1 className="mt-4 font-serif text-5xl leading-[0.95]">
            Forgot your
            <br />
            password?
          </h1>

          <p className="mt-5 text-sm leading-6 text-[#7B7066]">
            Enter your registered mobile number or email. If your account has a registered email, we will send a secure reset link.
          </p>

          <form
            onSubmit={submit}
            className="mt-8 space-y-4"
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
                placeholder="Registered mobile number or email"
                className="w-full rounded-2xl border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-4 text-sm outline-none focus:border-[#D4AF37]"
              />
            </label>

            {message ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold leading-5 text-emerald-700">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                loading ||
                identifier.trim()
                  .length < 3
              }
              className="w-full rounded-2xl bg-[#031B14] py-4 text-[11px] font-black uppercase tracking-[0.12em] text-white disabled:bg-[#E7E1D8] disabled:text-[#6F675F]"
            >
              {loading
                ? "Sending..."
                : "Send Reset Link →"}
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-[#E4D7C4] bg-[#FFFDF9] p-4">
            <p className="text-[10px] font-black">
              Mobile-only account?
            </p>
            <p className="mt-1 text-[10px] leading-5 text-[#7B7066]">
              If no email was added to your account, contact AS Fashions support for account recovery.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/contact",
                )
              }
              className="mt-3 text-[9px] font-black uppercase tracking-wider text-[#0F5A38]"
            >
              Contact Support →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

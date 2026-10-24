"use client";

import { useEffect, useState } from "react";

type Props = {
  mode?: "signin" | "link";
  className?: string;
};

export default function GoogleSignInButton({ mode = "signin", className = "" }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/google/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { enabled?: boolean }) => {
        if (active) setEnabled(data.enabled === true);
      })
      .catch(() => {
        if (active) setEnabled(false);
      });
    return () => { active = false; };
  }, []);

  const ready = enabled === true;
  const label = mode === "link" ? "Connect Google Account" : "Continue with Google";

  return (
    <a
      href={ready
        ? "/api/auth/google/start" + (mode === "link" ? "?mode=link" : "")
        : undefined}
      aria-disabled={!ready}
      title={!ready ? "Google Sign-In is awaiting Google Cloud OAuth configuration." : label}
      onClick={(event) => {
        if (!ready) event.preventDefault();
      }}
      className={
        "flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#D8D3CB] bg-white px-4 py-3 text-sm font-bold text-[#28362E] shadow-sm transition " +
        (ready
          ? "hover:border-[#91B7A0] hover:bg-[#F8FAF8] active:scale-[0.99] "
          : "cursor-not-allowed opacity-65 ") +
        className
      }
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48" focusable="false">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.87 46.98 24.55z" />
        <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.92 23.92 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      <span>{label}</span>
      {enabled === false && <span className="text-[10px] font-normal text-[#88776A]">(setup pending)</span>}
      {enabled === null && <span className="text-[10px] font-normal text-[#88776A]">(checking…)</span>}
    </a>
  );
}

import { Suspense, type ReactNode } from "react";

function ReelsFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
        <p className="mt-4 text-sm text-zinc-400">
          Loading Fashion Reels...
        </p>
      </div>
    </main>
  );
}

export default function ReelsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <Suspense fallback={<ReelsFallback />}>{children}</Suspense>;
}

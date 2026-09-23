import Link from "next/link";
import type { ReactNode } from "react";

type PolicyPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updated?: string;
  children: ReactNode;
};

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#E8DED0] py-6 first:border-t-0 first:pt-0">
      <h2 className="font-serif text-2xl text-[#211C18]">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[#655B52]">
        {children}
      </div>
    </section>
  );
}

export default function PolicyPage({
  eyebrow,
  title,
  intro,
  updated = "23 September 2026",
  children,
}: PolicyPageProps) {
  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#211C18]">
      <header className="border-b border-white/10 bg-[#031B14] text-[#FFF8EC]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <span className="font-serif text-3xl leading-none">
              AS
            </span>
            <span>
              <span className="block font-serif text-sm tracking-[0.18em]">
                FASHIONS
              </span>
              <span className="block text-[5px] font-black uppercase tracking-[0.36em] text-[#D9C29A]">
                Wear your story
              </span>
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-white/15 px-4 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/80"
          >
            Back to Shop
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#0F5A38]">
          {eyebrow}
        </p>

        <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-none sm:text-5xl">
          {title}
        </h1>

        <p className="mt-5 max-w-3xl text-sm leading-7 text-[#6F655C]">
          {intro}
        </p>

        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9A8E82]">
          Last updated: {updated}
        </p>

        <article className="mt-9 rounded-[1.7rem] border border-[#E4D7C4] bg-[#FFFDF9] p-5 shadow-[0_16px_44px_rgba(61,48,37,0.06)] sm:p-8">
          {children}
        </article>

        <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-[10px] font-bold text-[#6F655C]">
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/returns-refunds">Returns & Refunds</Link>
          <Link href="/shipping-policy">Shipping</Link>
        </nav>
      </div>
    </main>
  );
}

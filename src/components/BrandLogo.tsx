"use client";

type BrandLogoProps = {
  light?: boolean;
  compact?: boolean;
  onClick?: () => void;
};

export default function BrandLogo({
  light = false,
  compact = false,
  onClick,
}: BrandLogoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-center"
    >
      <span
        className={`block font-serif leading-none tracking-[0.08em] ${
          compact ? "text-[24px]" : "text-[28px]"
        } ${
          light ? "text-white" : "text-zinc-950"
        }`}
      >
        AR
      </span>

      <span
        className={`mt-1 block text-[6px] font-black uppercase tracking-[0.38em] ${
          light
            ? "text-emerald-300"
            : "text-emerald-700"
        }`}
      >
        Fashions
      </span>
    </button>
  );
}

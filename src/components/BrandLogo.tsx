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
          light ? "text-[#FFFDF9]" : "text-[#211C18]"
        }`}
      >
        AS
      </span>

      <span
        className={`mt-1 block text-[6px] font-black uppercase tracking-[0.38em] ${
          light
            ? "text-[#D9C29A]"
            : "text-[#6B5435]"
        }`}
      >
        Fashions
      </span>
    </button>
  );
}

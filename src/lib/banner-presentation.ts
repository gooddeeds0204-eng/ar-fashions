export const BANNER_FONT_OPTIONS = [
  "EDITORIAL_SERIF",
  "CLASSIC_SERIF",
  "MODERN_SANS",
  "CLEAN_SANS",
  "FASHION_DISPLAY",
] as const;

export type BannerFont =
  (typeof BANNER_FONT_OPTIONS)[number];

export type BannerPresentation = {
  eyebrowText: string;
  eyebrowFont: BannerFont;
  eyebrowColor: string;
  titleFont: BannerFont;
  titleColor: string;
  subtitleFont: BannerFont;
  subtitleColor: string;
  buttonFont: BannerFont;
  buttonTextColor: string;
  buttonBackgroundColor: string;
  buttonBorderColor: string;
  ctaCategoryId: string;
  ctaCategoryName: string;
};

export const DEFAULT_BANNER_PRESENTATION:
  BannerPresentation = {
    eyebrowText: "New Season",
    eyebrowFont:
      "MODERN_SANS",
    eyebrowColor:
      "#F4E8D6",
    titleFont:
      "EDITORIAL_SERIF",
    titleColor:
      "#FFFFFF",
    subtitleFont:
      "CLASSIC_SERIF",
    subtitleColor:
      "#F8F1E7",
    buttonFont:
      "MODERN_SANS",
    buttonTextColor:
      "#17130F",
    buttonBackgroundColor:
      "#FFF8EC",
    buttonBorderColor:
      "#FFF8EC",
    ctaCategoryId: "",
    ctaCategoryName: "",
  };

export function bannerPresentationKey(
  bannerId: string,
) {
  return `banner_presentation_v1_${bannerId}`;
}

function clean(
  value: unknown,
  max = 140,
) {
  return String(
    value ?? "",
  )
    .trim()
    .slice(0, max);
}

function color(
  value: unknown,
  fallback: string,
) {
  const raw =
    clean(value, 32);

  return /^#[0-9A-Fa-f]{6}$/.test(
    raw,
  )
    ? raw.toUpperCase()
    : fallback;
}

function font(
  value: unknown,
  fallback: BannerFont,
) {
  const raw =
    clean(
      value,
      40,
    ).toUpperCase();

  return BANNER_FONT_OPTIONS.includes(
    raw as BannerFont,
  )
    ? (raw as BannerFont)
    : fallback;
}

export function normalizeBannerPresentation(
  value: unknown,
): BannerPresentation {
  const source =
    value &&
    typeof value ===
      "object"
      ? (value as Record<
          string,
          unknown
        >)
      : {};

  return {
    eyebrowText:
      clean(
        source.eyebrowText,
        80,
      ) ||
      DEFAULT_BANNER_PRESENTATION.eyebrowText,
    eyebrowFont:
      font(
        source.eyebrowFont,
        DEFAULT_BANNER_PRESENTATION.eyebrowFont,
      ),
    eyebrowColor:
      color(
        source.eyebrowColor,
        DEFAULT_BANNER_PRESENTATION.eyebrowColor,
      ),
    titleFont:
      font(
        source.titleFont,
        DEFAULT_BANNER_PRESENTATION.titleFont,
      ),
    titleColor:
      color(
        source.titleColor,
        DEFAULT_BANNER_PRESENTATION.titleColor,
      ),
    subtitleFont:
      font(
        source.subtitleFont,
        DEFAULT_BANNER_PRESENTATION.subtitleFont,
      ),
    subtitleColor:
      color(
        source.subtitleColor,
        DEFAULT_BANNER_PRESENTATION.subtitleColor,
      ),
    buttonFont:
      font(
        source.buttonFont,
        DEFAULT_BANNER_PRESENTATION.buttonFont,
      ),
    buttonTextColor:
      color(
        source.buttonTextColor,
        DEFAULT_BANNER_PRESENTATION.buttonTextColor,
      ),
    buttonBackgroundColor:
      color(
        source.buttonBackgroundColor,
        DEFAULT_BANNER_PRESENTATION.buttonBackgroundColor,
      ),
    buttonBorderColor:
      color(
        source.buttonBorderColor,
        DEFAULT_BANNER_PRESENTATION.buttonBorderColor,
      ),
    ctaCategoryId:
      clean(
        source.ctaCategoryId,
        120,
      ),
    ctaCategoryName:
      clean(
        source.ctaCategoryName,
        120,
      ),
  };
}

export function parseBannerPresentationJson(
  value: string | null | undefined,
) {
  if (!value) {
    return {
      ...DEFAULT_BANNER_PRESENTATION,
    };
  }

  try {
    return normalizeBannerPresentation(
      JSON.parse(value),
    );
  } catch {
    return {
      ...DEFAULT_BANNER_PRESENTATION,
    };
  }
}

export function bannerFontFamily(
  value: BannerFont | string,
) {
  switch (value) {
    case "CLASSIC_SERIF":
      return "Georgia, 'Times New Roman', serif";
    case "MODERN_SANS":
      return "Arial, Helvetica, sans-serif";
    case "CLEAN_SANS":
      return "'Trebuchet MS', Arial, sans-serif";
    case "FASHION_DISPLAY":
      return "'Times New Roman', Georgia, serif";
    case "EDITORIAL_SERIF":
    default:
      return "Georgia, 'Times New Roman', serif";
  }
}

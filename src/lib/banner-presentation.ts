export const BANNER_FONT_OPTIONS = [
  "EDITORIAL_SERIF",
  "CLASSIC_SERIF",
  "MODERN_SANS",
  "CLEAN_SANS",
  "FASHION_DISPLAY",
] as const;

export type BannerFont =
  (typeof BANNER_FONT_OPTIONS)[number];

export const DESKTOP_BANNER_RATIO_OPTIONS = [
  "12:5",
  "16:7",
  "8:3",
  "21:9",
] as const;

export const MOBILE_BANNER_RATIO_OPTIONS = [
  "9:10",
  "4:5",
  "3:4",
  "1:1",
] as const;

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
  desktopFocalX: number;
  desktopFocalY: number;
  mobileFocalX: number;
  mobileFocalY: number;
  desktopRatio: string;
  mobileRatio: string;
  desktopZoom: number;
  mobileZoom: number;
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
    desktopFocalX: 50,
    desktopFocalY: 50,
    mobileFocalX: 50,
    mobileFocalY: 50,
    desktopRatio: "12:5",
    mobileRatio: "9:10",
    desktopZoom: 100,
    mobileZoom: 100,
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

function bannerRatio(
  value: unknown,
  allowed: readonly string[],
  fallback: string,
) {
  const raw =
    clean(value, 20);

  return allowed.includes(raw)
    ? raw
    : fallback;
}

function zoom(
  value: unknown,
  fallback: number,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(
    200,
    Math.max(
      100,
      Math.round(number),
    ),
  );
}

export function bannerRatioCssValue(
  value: string,
) {
  const [width, height] =
    value.split(":").map(Number);

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return "1 / 1";
  }

  return `${width} / ${height}`;
}

function focalPoint(
  value: unknown,
  fallback: number,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(number),
    ),
  );
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
    desktopFocalX:
      focalPoint(
        source.desktopFocalX,
        DEFAULT_BANNER_PRESENTATION.desktopFocalX,
      ),
    desktopFocalY:
      focalPoint(
        source.desktopFocalY,
        DEFAULT_BANNER_PRESENTATION.desktopFocalY,
      ),
    mobileFocalX:
      focalPoint(
        source.mobileFocalX,
        DEFAULT_BANNER_PRESENTATION.mobileFocalX,
      ),
    mobileFocalY:
      focalPoint(
        source.mobileFocalY,
        DEFAULT_BANNER_PRESENTATION.mobileFocalY,
      ),
    desktopRatio:
      bannerRatio(
        source.desktopRatio,
        DESKTOP_BANNER_RATIO_OPTIONS,
        DEFAULT_BANNER_PRESENTATION.desktopRatio,
      ),
    mobileRatio:
      bannerRatio(
        source.mobileRatio,
        MOBILE_BANNER_RATIO_OPTIONS,
        DEFAULT_BANNER_PRESENTATION.mobileRatio,
      ),
    desktopZoom:
      zoom(
        source.desktopZoom,
        DEFAULT_BANNER_PRESENTATION.desktopZoom,
      ),
    mobileZoom:
      zoom(
        source.mobileZoom,
        DEFAULT_BANNER_PRESENTATION.mobileZoom,
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

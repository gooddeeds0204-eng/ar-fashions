export type MainSkuCode =
  | "WM"
  | "MN"
  | "GK"
  | "BK";

export type SkuProductTypeOption = {
  label: string;
  code: string;
};

export const SKU_MAIN_CODES: Record<
  string,
  MainSkuCode
> = {
  women: "WM",
  men: "MN",
  "girl kids": "GK",
  "girls kids": "GK",
  "boy kids": "BK",
  "boys kids": "BK",
};

export const SKU_PRODUCT_TYPES: Record<
  MainSkuCode,
  SkuProductTypeOption[]
> = {
  WM: [
    { label: "Kurta Set", code: "KST" },
    { label: "Kurtis & Tunics", code: "KRT" },
    { label: "Skirts, Palazzos & Jeggings", code: "SPJ" },
    { label: "Leggings", code: "LEG" },
    { label: "Salwar Suit", code: "SAL" },
    { label: "Dupatta", code: "DUP" },
    { label: "Western Wear", code: "WST" },
    { label: "T-Shirts, Sweatshirts & Shrugs", code: "TSS" },
    { label: "Jeans", code: "JNS" },
    { label: "Shirt", code: "SHT" },
    { label: "Shorts / 3/4ths", code: "SHR" },
    { label: "Nightwear", code: "NGT" },
    { label: "Ethnic & Party Wear", code: "ETH" },
    { label: "Dress / Frock", code: "DRS" },
    { label: "Saree", code: "SAR" },
    { label: "Night & Lounge Wear", code: "NLW" },
  ],
  MN: [
    { label: "Shirt", code: "SHT" },
    { label: "Jeans", code: "JNS" },
    { label: "Trousers / Pants", code: "TRS" },
    { label: "T-Shirt", code: "TSH" },
    { label: "Tracksuit", code: "TRK" },
    { label: "Shorts", code: "SHR" },
    { label: "Night Suit", code: "NGT" },
    { label: "Suit / Blazer", code: "BLZ" },
    { label: "Ethnic Wear", code: "ETH" },
    { label: "Undergarment", code: "UND" },
  ],
  GK: [
    { label: "Normal Ghagra", code: "GH" },
    { label: "Coat with Ghagra", code: "CGH" },
    { label: "Long Coat with Ghagra", code: "LCG" },
    { label: "3-Piece / Punjabi Dress", code: "PNJ" },
    { label: "Dresses & Frocks", code: "FRK" },
    { label: "T-Shirts", code: "TSH" },
    { label: "Tracksuits", code: "TRK" },
    { label: "Shorts / 3/4ths", code: "SHR" },
    { label: "Night Suits", code: "NGT" },
    { label: "Palazzos / Jeggings", code: "PLZ" },
    { label: "Kurtis / Kurtas", code: "KRT" },
    { label: "Tops", code: "TOP" },
    { label: "Jeans", code: "JNS" },
    { label: "Pants", code: "PNT" },
    { label: "Leggings", code: "LEG" },
    { label: "Jackets / Western Wear", code: "JKT" },
    { label: "Ethnic Wear", code: "ETH" },
    { label: "Party Wear Frocks", code: "PWF" },
  ],
  BK: [
    { label: "Shirts", code: "SHT" },
    { label: "Jeans", code: "JNS" },
    { label: "Pants / Trousers", code: "PNT" },
    { label: "T-Shirts", code: "TSH" },
    { label: "Tracksuits", code: "TRK" },
    { label: "Shorts / 3/4ths", code: "SHR" },
    { label: "Night Suits", code: "NGT" },
    { label: "Ethnic Wear", code: "ETH" },
    { label: "Western Wear", code: "WST" },
    { label: "Suits / Blazers", code: "BLZ" },
  ],
};

export function normalizeSkuText(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getMainSkuCode(
  mainCategoryName: string,
): MainSkuCode | null {
  return (
    SKU_MAIN_CODES[
      normalizeSkuText(
        mainCategoryName,
      )
    ] ?? null
  );
}

export function normalizeProductTypeCode(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 4);
}

export function formatDesignNumber(
  value: unknown,
) {
  const digits =
    String(value ?? "")
      .replace(/\D+/g, "")
      .slice(-6);

  if (!digits) {
    return "";
  }

  return digits.length >= 3
    ? digits
    : digits.padStart(3, "0");
}

export function getColorSkuCode(
  colorName: string,
) {
  const known: Record<
    string,
    string
  > = {
    BLACK: "BLK",
    WHITE: "WHT",
    BLUE: "BLU",
    RED: "RED",
    GREEN: "GRN",
    YELLOW: "YLW",
    PINK: "PNK",
    PURPLE: "PUR",
    ORANGE: "ORG",
    BROWN: "BRN",
    GREY: "GRY",
    GRAY: "GRY",
    NAVY: "NVY",
    MAROON: "MRN",
    BEIGE: "BEG",
    CREAM: "CRM",
    MINT: "MNT",
    PEACH: "PEA",
  };

  const normalized =
    String(colorName ?? "")
      .trim()
      .toUpperCase();

  if (known[normalized]) {
    return known[normalized];
  }

  const token =
    normalized
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 3);

  return token || "COL";
}

export function getSizeSkuCode(
  sizeName: string,
) {
  const raw =
    String(sizeName ?? "")
      .trim()
      .toUpperCase();

  const normalized =
    raw.replace(/\s+/g, "");

  const ageYears =
    normalized.match(
      /^(\d{1,2})-(\d{1,2})Y$/,
    );

  if (ageYears) {
    return `${ageYears[1]}${ageYears[2]}`;
  }

  const ageMonths =
    normalized.match(
      /^(\d{1,2})-(\d{1,2})M$/,
    );

  if (ageMonths) {
    return `${ageMonths[1]}${ageMonths[2]}M`;
  }

  const known: Record<
    string,
    string
  > = {
    XS: "XS",
    S: "S",
    M: "M",
    L: "L",
    XL: "XL",
    XXL: "XXL",
    XXXL: "3XL",
    "2XL": "2XL",
    "3XL": "3XL",
    "4XL": "4XL",
    FREE: "FS",
    FREESIZE: "FS",
  };

  if (known[normalized]) {
    return known[normalized];
  }

  const token =
    normalized
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 5);

  return token || "SZ";
}

export function buildProductSku(
  mainCode: MainSkuCode,
  productTypeCode: string,
  designNumber: string,
) {
  const typeCode =
    normalizeProductTypeCode(
      productTypeCode,
    );

  const design =
    formatDesignNumber(
      designNumber,
    );

  if (!typeCode || !design) {
    return "";
  }

  return `${mainCode}-${typeCode}-${design}`;
}

export function buildVariantSku(
  productSku: string,
  colorName: string,
  sizeName: string,
) {
  if (!productSku) {
    return "";
  }

  return `${productSku}-${getColorSkuCode(
    colorName,
  )}-${getSizeSkuCode(
    sizeName,
  )}`;
}
